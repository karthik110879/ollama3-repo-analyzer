const express = require('express');
const router = express.Router();
const { Octokit } = require('octokit');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Import the new multi-agent system
const AgentOrchestrator = require('../agents/AgentOrchestrator');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

const octokit = new Octokit({
  auth: GITHUB_TOKEN || undefined,
  userAgent: 'ai-repo-analyzer',
});

// Initialize the multi-agent orchestrator with chunking support
const agentOrchestrator = new AgentOrchestrator({
  analyzerConfig: {
    baseUrl: OLLAMA_BASE_URL,
    model: process.env.OLLAMA_ANALYZER_MODEL || process.env.OLLAMA_MODEL || 'llama3',
    temperature: parseFloat(process.env.OLLAMA_ANALYZER_TEMPERATURE) || 0.1
  },
  diagramBuilderConfig: {
    baseUrl: OLLAMA_BASE_URL,
    model: process.env.OLLAMA_DIAGRAM_MODEL || process.env.OLLAMA_MODEL || 'llama3',
    temperature: parseFloat(process.env.OLLAMA_DIAGRAM_TEMPERATURE) || 0.3
  },
  chunkingConfig: {
    baseUrl: OLLAMA_BASE_URL,
    model: process.env.OLLAMA_CHUNKING_MODEL || process.env.OLLAMA_MODEL || 'llama3',
    temperature: parseFloat(process.env.OLLAMA_CHUNKING_TEMPERATURE) || 0.1,
    maxChunkSize: parseInt(process.env.MAX_CHUNK_SIZE) || 200,
    maxChunks: parseInt(process.env.MAX_CHUNKS) || 10,
    minChunkSize: parseInt(process.env.MIN_CHUNK_SIZE) || 50
  },
  parallelConfig: {
    maxConcurrentChunks: parseInt(process.env.MAX_CONCURRENT_CHUNKS) || 3,
    chunkTimeout: parseInt(process.env.CHUNK_TIMEOUT) || 120000,
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 2
  },
  aggregatorConfig: {
    baseUrl: OLLAMA_BASE_URL,
    model: process.env.OLLAMA_AGGREGATOR_MODEL || process.env.OLLAMA_MODEL || 'llama3',
    temperature: parseFloat(process.env.OLLAMA_AGGREGATOR_TEMPERATURE) || 0.2
  },
  chunkingThreshold: parseInt(process.env.CHUNKING_THRESHOLD) || 500,
  enableChunking: process.env.ENABLE_CHUNKING !== 'false'
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

// Old prompt system removed - now using multi-agent system

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

    // Use the new multi-agent system
    const repositoryData = {
      repoName: `${parsed.owner}/${parsed.repo}`,
      branchName: defaultBranch,
      repoTree: listing
    };

    const analysisResult = await agentOrchestrator.analyzeRepository(repositoryData);

    if (!analysisResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Analysis failed',
        message: analysisResult.message || 'Unknown error occurred'
      });
    }

    // Return the structured response from the multi-agent system
    res.json({
      success: true,
      data: {
        mermaid: analysisResult.data.mermaid || '',
        raw: analysisResult.data.raw || {},
        insights: analysisResult.data.insights || [],
        techStack: analysisResult.data.techStack || [],
        architecture: analysisResult.data.architecture || '',
        keyComponents: analysisResult.data.keyComponents || [],
        dependencies: analysisResult.data.dependencies || [],
        fileStructureAnalysis: analysisResult.data.fileStructureAnalysis || {},
        scalabilityNotes: analysisResult.data.scalabilityNotes || '',
        securityConsiderations: analysisResult.data.securityConsiderations || ''
      },
      metadata: analysisResult.metadata || {}
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


// cleanMermaid function removed - now handled by MermaidDiagramBuilderAgent

module.exports = router;

