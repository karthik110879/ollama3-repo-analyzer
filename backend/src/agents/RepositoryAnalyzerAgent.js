const { ChatOllama } = require('@langchain/community/chat_models/ollama');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { getModelConfig } = require('../config/modelConfig');

class RepositoryAnalyzerAgent {
  constructor(config = {}) {
    // Get model configuration from environment variables
    const modelConfig = getModelConfig('analyzer');
    
    this.config = {
      baseUrl: config.baseUrl || modelConfig.baseUrl,
      model: config.model || modelConfig.model,
      temperature: config.temperature || modelConfig.temperature,
      ...config
    };

    console.log(`🔧 Repository Analyzer Agent: Using model ${this.config.model}`);
    console.log(`📊 Purpose: ${modelConfig.purpose}`);
    console.log(`📝 Description: ${modelConfig.description}`);

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
        `You are an expert software architect and code analyst specializing in deep architectural analysis. Your job is to analyze repository structures and extract comprehensive, meaningful architectural insights that reveal the true complexity and relationships within the codebase.

        CRITICAL: You must respond with ONLY a valid JSON object. Do not include any markdown formatting, explanations, or additional text outside the JSON object.

        Analyze the provided repository structure and return a JSON object with the following structure:
        {{
          "architecture_pattern": "detailed pattern name (e.g., Layered Monolith, Microservices, Event-Driven Architecture, etc.)",
          "tech_stack": ["comprehensive technology list with versions where identifiable"],
          "key_components": [
            {{
              "name": "specific component name",
              "type": "component type (e.g., API Layer, Business Logic, Data Access, UI Component, Service, etc.)",
              "technologies": ["specific technologies used"],
              "description": "detailed description of the component's role and responsibilities",
              "files": ["key files that represent this component"],
              "dependencies": ["other components this depends on"],
              "interfaces": ["APIs, events, or contracts this component exposes"]
            }}
          ],
          "architectural_layers": [
            {{
              "name": "layer name (e.g., Presentation, Business Logic, Data Access, Infrastructure)",
              "description": "purpose and responsibilities of this layer",
              "components": ["components that belong to this layer"],
              "technologies": ["technologies used in this layer"],
              "interactions": ["how this layer interacts with other layers"]
            }}
          ],
          "data_flow": [
            {{
              "from": "source component or layer",
              "to": "destination component or layer",
              "type": "data flow type (e.g., HTTP API, Database Query, Event, File I/O, Message Queue)",
              "description": "what data flows and how",
              "protocol": "communication protocol used"
            }}
          ],
          "insights": [
            "detailed architectural insight 1",
            "detailed architectural insight 2",
            "detailed architectural insight 3",
            "specific patterns and anti-patterns observed",
            "scalability and performance considerations",
            "maintainability and code organization observations"
          ],
          "dependencies": [
            {{
              "from": "source component",
              "to": "target component",
              "type": "dependency type (e.g., Direct Import, API Call, Database Access, Event Subscription, File System)",
              "strength": "strong/medium/weak",
              "description": "detailed description of the dependency relationship"
            }}
          ],
          "file_structure_analysis": {{
            "main_directories": ["primary directory structure with purposes"],
            "configuration_files": ["all configuration files and their purposes"],
            "test_structure": "detailed test organization and coverage patterns",
            "documentation_presence": "comprehensive documentation assessment",
            "build_system": "build tools and deployment configuration",
            "package_management": "dependency management approach"
          }},
          "scalability_notes": "detailed scalability analysis including bottlenecks and optimization opportunities",
          "security_considerations": "comprehensive security patterns, vulnerabilities, and best practices observed",
          "code_quality_indicators": {{
            "modularity": "assessment of code modularity and separation of concerns",
            "coupling": "analysis of component coupling and cohesion",
            "reusability": "evaluation of code reusability patterns",
            "testability": "assessment of testability and testing patterns"
          }},
          "recommendations": [
            "specific architectural improvement recommendations",
            "potential refactoring opportunities",
            "scalability enhancement suggestions",
            "security improvements",
            "code quality improvements"
          ]
        }}

        ANALYSIS GUIDELINES:
        - Perform DEEP architectural analysis - don't just skim the surface
        - Identify specific architectural patterns, not just generic descriptions
        - Map out component relationships and data flow in detail
        - Analyze the actual file structure to understand the real architecture
        - Look for design patterns, architectural decisions, and trade-offs
        - Consider the evolution and maturity of the codebase
        - Identify both strengths and potential issues in the architecture
        - Provide actionable insights that reveal the true complexity
        - Focus on relationships, dependencies, and interactions between components
        - Consider performance, scalability, and maintainability implications

        REMEMBER: Your response must be ONLY a valid JSON object. Start with {{ and end with }}. No markdown, no explanations, no additional text.
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
          'Please analyze this repository structure and provide detailed architectural insights.\n',
          'IMPORTANT: You must respond with ONLY a valid JSON object following the exact structure specified in the system prompt. Do not include any markdown formatting, explanations, or additional text outside the JSON object.'
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
        // Try to find JSON in the response
        let jsonText = text;
        
        // Remove any markdown code blocks
        jsonText = jsonText.replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1');
        
        // Try to find JSON object
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
        } else {
          // Try to find JSON array
          const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            analysisData = JSON.parse(arrayMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
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
    const techStack = this.extractTechStackFromFiles(files);
    
    return {
      architecture_pattern: "Unknown - Fallback Analysis",
      tech_stack: techStack,
      key_components: [
        {
          name: "Main Application",
          type: "Application",
          technologies: techStack,
          description: "Main application code",
          files: files.slice(0, 5),
          dependencies: [],
          interfaces: []
        }
      ],
      architectural_layers: [
        {
          name: "Application Layer",
          description: "Main application components",
          components: ["Main Application"],
          technologies: techStack,
          interactions: ["Direct file access"]
        }
      ],
      data_flow: [],
      insights: [
        "Repository structure analysis completed with fallback method",
        "Unable to parse detailed architectural analysis",
        "Limited analysis due to JSON parsing failure"
      ],
      dependencies: [],
      file_structure_analysis: {
        main_directories: this.extractMainDirectories(files),
        configuration_files: files.filter(f => f.includes('config') || f.includes('package') || f.includes('yarn') || f.includes('pom.xml')),
        test_structure: "Test structure not analyzed",
        documentation_presence: "Documentation presence not analyzed",
        build_system: "Build system not analyzed",
        package_management: "Package management not analyzed"
      },
      scalability_notes: "Analysis incomplete - fallback method used",
      security_considerations: "Security analysis incomplete - fallback method used",
      code_quality_indicators: {
        modularity: "Not analyzed",
        coupling: "Not analyzed", 
        reusability: "Not analyzed",
        testability: "Not analyzed"
      },
      recommendations: [
        "Enable detailed analysis by fixing JSON parsing issues",
        "Consider manual architectural review for better insights"
      ]
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