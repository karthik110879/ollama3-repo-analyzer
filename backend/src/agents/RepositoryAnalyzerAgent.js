const { ChatOllama } = require('@langchain/community/chat_models/ollama');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

class RepositoryAnalyzerAgent {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: config.model || process.env.OLLAMA_ANALYZER_MODEL || 'llama3',
      temperature: config.temperature || 0.1, // Low temperature for consistent analysis
      ...config
    };

    this.chat = new ChatOllama({
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      temperature: this.config.temperature,
    });

    this.prompt = this.createPrompt();
  }

  createPrompt() {
    return ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are an expert software architect and code analyst. Your job is to analyze repository structures and extract meaningful architectural insights.

        Analyze the provided repository structure and return a JSON object with the following structure:
        {{
          "architecture_pattern": "pattern name (e.g., MVC, Microservices, Monolith, etc.)",
          "tech_stack": ["technology1", "technology2", "technology3"],
          "key_components": [
            {{
              "name": "component name",
              "type": "component type (e.g., Frontend, Backend, Database, etc.)",
              "technologies": ["tech1", "tech2"],
              "description": "brief description of the component's role"
            }}
          ],
          "insights": [
            "key architectural insight 1",
            "key architectural insight 2",
            "key architectural insight 3"
          ],
          "dependencies": [
            {{
              "from": "source component",
              "to": "target component",
              "type": "dependency type (e.g., API calls, database access, file imports)"
            }}
          ],
          "file_structure_analysis": {{
            "main_directories": ["dir1", "dir2", "dir3"],
            "configuration_files": ["file1", "file2"],
            "test_structure": "description of test organization",
            "documentation_presence": "assessment of documentation quality"
          }},
          "scalability_notes": "notes about the architecture's scalability characteristics",
          "security_considerations": "notable security patterns or concerns"
        }}

        Guidelines:
        - Be thorough but concise in your analysis
        - Focus on architectural patterns and relationships
        - Identify the primary technologies used
        - Note any interesting or unusual architectural decisions
        - Consider scalability and maintainability aspects
        - Be specific about component relationships and dependencies
        `
      ],
      [
        'human',
        [
          'Repository Structure Analysis:\n',
          'Repository: {repo_name}\n',
          'Branch: {branch_name}\n',
          'File Structure:\n',
          '{repo_tree}\n',
          '\n',
          'Please analyze this repository structure and provide detailed architectural insights.'
        ].join('')
      ]
    ]);
  }

  async analyze(repositoryData) {
    try {
      console.log('🔍 Repository Analyzer Agent: Starting analysis...');
      
      const { repoName, branchName, repoTree } = repositoryData;
      
      const chain = this.prompt.pipe(this.chat);
      const values = {
        repo_name: repoName,
        branch_name: branchName,
        repo_tree: repoTree
      };

      const result = await chain.invoke(values);
      const text = result?.content ? String(result.content).trim() : '';

      console.log('🔍 Repository Analyzer Agent: Raw response received');

      // Parse JSON response
      let analysisData;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('❌ Repository Analyzer Agent: JSON parse error:', parseError);
        console.log('Raw text:', text);
        
        // Fallback: create basic analysis structure
        analysisData = this.createFallbackAnalysis(repoTree);
      }

      console.log('✅ Repository Analyzer Agent: Analysis completed');
      return {
        success: true,
        data: analysisData,
        raw: text
      };

    } catch (error) {
      console.error('❌ Repository Analyzer Agent: Analysis failed:', error);
      return {
        success: false,
        error: error.message,
        data: this.createFallbackAnalysis(repositoryData.repoTree)
      };
    }
  }

  createFallbackAnalysis(repoTree) {
    // Create a basic analysis when JSON parsing fails
    const lines = repoTree.split('\n');
    const files = lines.filter(line => line.startsWith('- ')).map(line => line.substring(2));
    
    return {
      architecture_pattern: "Unknown",
      tech_stack: this.extractTechStackFromFiles(files),
      key_components: [
        {
          name: "Main Application",
          type: "Application",
          technologies: this.extractTechStackFromFiles(files),
          description: "Main application code"
        }
      ],
      insights: [
        "Repository structure analysis completed with fallback method",
        "Unable to parse detailed architectural analysis"
      ],
      dependencies: [],
      file_structure_analysis: {
        main_directories: this.extractMainDirectories(files),
        configuration_files: files.filter(f => f.includes('config') || f.includes('package') || f.includes('yarn') || f.includes('pom.xml')),
        test_structure: "Test structure not analyzed",
        documentation_presence: "Documentation presence not analyzed"
      },
      scalability_notes: "Analysis incomplete",
      security_considerations: "Security analysis incomplete"
    };
  }

  extractTechStackFromFiles(files) {
    const techStack = new Set();
    
    files.forEach(file => {
      const ext = file.split('.').pop()?.toLowerCase();
      const filename = file.toLowerCase();
      
      // Frontend technologies
      if (ext === 'js' || ext === 'jsx' || filename.includes('react')) techStack.add('JavaScript/React');
      if (ext === 'ts' || ext === 'tsx' || filename.includes('typescript')) techStack.add('TypeScript');
      if (ext === 'vue') techStack.add('Vue.js');
      if (ext === 'svelte') techStack.add('Svelte');
      if (filename.includes('angular')) techStack.add('Angular');
      
      // Backend technologies
      if (ext === 'py') techStack.add('Python');
      if (ext === 'java') techStack.add('Java');
      if (ext === 'go') techStack.add('Go');
      if (ext === 'rs') techStack.add('Rust');
      if (ext === 'php') techStack.add('PHP');
      if (filename.includes('express') || filename.includes('node')) techStack.add('Node.js/Express');
      
      // Databases
      if (filename.includes('mongodb') || filename.includes('mongo')) techStack.add('MongoDB');
      if (filename.includes('postgres') || filename.includes('postgresql')) techStack.add('PostgreSQL');
      if (filename.includes('mysql')) techStack.add('MySQL');
      if (filename.includes('redis')) techStack.add('Redis');
      
      // Other
      if (filename.includes('docker')) techStack.add('Docker');
      if (filename.includes('kubernetes') || filename.includes('k8s')) techStack.add('Kubernetes');
      if (ext === 'yml' || ext === 'yaml') techStack.add('YAML Configuration');
    });
    
    return Array.from(techStack);
  }

  extractMainDirectories(files) {
    const dirs = new Set();
    files.forEach(file => {
      const parts = file.split('/');
      if (parts.length > 1) {
        dirs.add(parts[0]);
      }
    });
    return Array.from(dirs).slice(0, 10); // Top 10 directories
  }
}

module.exports = RepositoryAnalyzerAgent;
