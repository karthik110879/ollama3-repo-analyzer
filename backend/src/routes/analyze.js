const express = require('express');
const router = express.Router();
const { Octokit } = require('octokit');
const { ChatOllama } = require('@langchain/community/chat_models/ollama');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

const octokit = new Octokit({
  auth: GITHUB_TOKEN || undefined,
  userAgent: 'ai-repo-analyzer',
});

const chat = new ChatOllama({
  baseUrl: OLLAMA_BASE_URL,
  model: OLLAMA_MODEL,
  temperature: 0.2,
});

function parseGithubUrl(repositoryUrl) {
  try {
    const u = new URL(repositoryUrl);
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.replace(/^\/+/, '').split('/');
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

function filterAndLimitTree(tree, limit = 600) {
  const excluded = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.lock', '.mp4', '.mp3', '.zip', '.tgz', '.gz', '.pdf', '.exe', '.dll'];
  const filtered = (tree || [])
    .filter((t) => t.type === 'blob')
    .filter((t) => !excluded.some((ext) => (t.path || '').toLowerCase().endsWith(ext)))
    .slice(0, limit);
  return filtered;
}

function formatTreeListing(owner, repo, defaultBranch, tree) {
  const lines = [
    `Repository: ${owner}/${repo}`,
    `Default branch: ${defaultBranch}`,
    `Files (${tree.length}):`,
    ...tree.map((t) => `- ${t.path}`),
  ];
  return lines.join('\n');
}

const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a senior software architect.

    Your task is to analyze a given codebase's repository file structure and infer a high-level architecture overview.

    Respond ONLY in valid JSON format with the following structure:
    {
      "mermaid": "graph TD\\n...diagram here...",
      "insights": ["Insight 1", "Insight 2", "..."]
    }

    Requirements for "mermaid":
    - Must start with "graph TD".
    - Render a complete architectural overview using Mermaid syntax.
    - Use proper arrows to show dependencies and relationships (e.g., A --> B).
    - All nodes (modules/files/folders) should be connected meaningfully — no isolated nodes unless justified.
    - Represent folder hierarchies and key files inside them.
    - Focus on key architectural components like services, controllers, utils, configs, etc.

    Constraints:
    - The diagram must be valid Mermaid syntax and renderable without errors.
    - Escape newlines as \\n in the JSON string.
    - No extra commentary — only the JSON object.

    The "insights" field:
    - List concise architectural insights (e.g., presence of MVC pattern, microservices, deeply nested modules, etc).
    `,
  ],
  [
    'human',
    [
      'Here is the repository file listing:\n',
      '---\n',
      '{repo_tree}\n',
      '---\n',
      'Generate the JSON response now.'
    ].join(''),
  ],
]);


// const prompt = ChatPromptTemplate.fromMessages([
//    [
//     'system',
//     `You are a senior software architect.
//       Infer a high-level architecture from the provided repository file list.

//       Return JSON ONLY, structured as:
//       {{
//         "mermaid": "graph TD ...",
//         "insights": ["...", "..."]
//       }}

//       - The "mermaid" field must contain only a valid Mermaid diagram which can be directly renderd in the UI.
//       - The "insights" field must be a list of short bullet points.`,
//   ],
//   [
//     'human',
//     [
//       'Here is the repository file listing:\n',
//       '---\n',
//       '{repo_tree}\n',
//       '---\n',
//       'Generate the JSON response now.'
//     ].join(''),
//   ],
// ]);

async function getDefaultBranch(owner, repo) {
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return data.default_branch;
}

async function getTree(owner, repo, branch) {
  const ref = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const sha = ref.data.object.sha;
  const tree = await octokit.rest.git.getTree({ owner, repo, tree_sha: sha, recursive: '1' });
  return tree.data.tree || [];
}

function sanitizeForDirName(text) {
  return text.replace(/[^a-zA-Z0-9_.-]/g, '-').slice(0, 100);
}

async function shallowCloneAndList(repositoryUrl, ref) {
  const tmpRoot = path.join(os.tmpdir(), 'ai-repo-analyzer');
  if (!fs.existsSync(tmpRoot)) fs.mkdirSync(tmpRoot, { recursive: true });
  const dirName = sanitizeForDirName(`${Date.now()}-${repositoryUrl.split('/').slice(-2).join('-')}`);
  const repoDir = path.join(tmpRoot, dirName);
  fs.mkdirSync(repoDir, { recursive: true });

  const depth = Number(process.env.GIT_CLONE_DEPTH || 1);
  const branchPart = ref ? `-b ${ref}` : '';
  const cmd = `git clone --depth ${depth} ${branchPart} --no-checkout ${repositoryUrl} "${repoDir}"`;
  await execAsync(cmd, { windowsHide: true });

  // sparse-checkout to avoid pulling blobs
  await execAsync('git sparse-checkout init --cone', { cwd: repoDir, windowsHide: true });
  await execAsync('git sparse-checkout set .', { cwd: repoDir, windowsHide: true });
  await execAsync('git checkout', { cwd: repoDir, windowsHide: true });

  // list files using git ls-files (tracked only)
  const { stdout } = await execAsync('git ls-files', { cwd: repoDir, windowsHide: true });
  const files = stdout.split(/\r?\n/).filter(Boolean);
  return { repoDir, files };
}

// POST /api/analyze - Analyze a repository
router.post('/', async (req, res) => {
  try {
    const { repositoryUrl } = req.body || {};
    const branchQuery = (req.query && req.query.branch) || undefined;

    if (!repositoryUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    const parsed = parseGithubUrl(repositoryUrl);
    if (!parsed) {
      return res.status(400).json({ error: 'Provide a valid GitHub URL like https://github.com/owner/repo' });
    }

    const defaultBranch = branchQuery || (await getDefaultBranch(parsed.owner, parsed.repo));
    // Prefer git shallow clone + ls-files for accuracy across very large repos
    let listing = '';
    let tree = [];
    try {
      const { repoDir, files } = await shallowCloneAndList(repositoryUrl, defaultBranch);
      const limit = Number(process.env.FILE_LIST_LIMIT || 800);
      const excluded = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.lock', '.mp4', '.mp3', '.zip', '.tgz', '.gz', '.pdf', '.exe', '.dll'];
      const filtered = files.filter((p) => !excluded.some((ext) => p.toLowerCase().endsWith(ext))).slice(0, limit);
      tree = filtered;
      listing = [
        `Repository: ${parsed.owner}/${parsed.repo}`,
        `Default branch: ${defaultBranch}`,
        `Files (${filtered.length}):`,
        ...filtered.map((p) => `- ${p}`),
      ].join('\n');
      // Cleanup directory asynchronously
      fs.rm(repoDir, { recursive: true, force: true }, () => {});
    } catch (cloneErr) {
      // Fallback to GitHub tree API if git not available or fails
      const rawTree = await getTree(parsed.owner, parsed.repo, defaultBranch);
      tree = filterAndLimitTree(rawTree);
      listing = formatTreeListing(parsed.owner, parsed.repo, defaultBranch, tree);
    }

    const chain = prompt.pipe(chat);
    // Build values dynamically to avoid "Missing value for input variable" errors
    const values = { repo_tree: listing };
    try {
      const inputVars = (prompt && Array.isArray(prompt.inputVariables)) ? prompt.inputVariables : [];
      for (const name of inputVars) {
        if (values[name] === undefined) {
          // Provide safe defaults for any extra variables referenced in the prompt
          values[name] = '';
        }
      }
    } catch {}
    const result = await chain.invoke(values);

   const text = (result && result.content) ? String(result.content).trim() : '';

    // Try to extract the mermaid diagram using regex
    let mermaid = '';
    let raw = text;
    const mermaidMatch = text.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
    if (mermaidMatch) {
      mermaid = cleanMermaid(mermaidMatch[1].trim());
    } else {
      // Fallback: try to parse JSON and extract mermaid property
      try {
        // Extract JSON block from text, even if pretty-printed and with leading text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const parsed = JSON.parse(jsonStr);
          if (parsed.mermaid) {
            mermaid = cleanMermaid(parsed.mermaid.trim());
          }
        }
      } catch (e) {
        // ignore JSON parse errors
      }
    }

    res.json({
      success: true,
      data: {
        mermaid,
        raw
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    const status = (error && error.status) || 500;
    res.status(status).json({
      success: false,
      error: 'Failed to analyze repository',
      message: error.message,
    });
  }
});


function cleanMermaid(diagram) {
  if (!diagram) return '';

  return diagram
    // remove "graph TD;" and replace with "graph TD\n"
    .replace(/graph TD;/g, 'graph TD\n')
    .replace(/graph TD\s+/g, 'graph TD\n')
    // fix arrows like "-- >" into "-->"
    .replace(/--\s*>/g, '-->')
    // fix labels "|text|Node" into "|text| Node"
    .replace(/\|([^\|]+)\|([A-Za-z0-9\[])/g, '|$1| $2')
    // ensure each statement is on a new line
    .replace(/;\s*/g, ';\n')
    .trim();
}

module.exports = router;

