const { ChatOllama } = require('@langchain/community/chat_models/ollama');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

class MermaidDiagramBuilderAgent {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: config.model || process.env.OLLAMA_DIAGRAM_MODEL || 'llama3',
      temperature: config.temperature || 0.3, // Slightly higher for creative diagramming
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
        `You are an expert Mermaid diagram specialist. Your ONLY job is to create clean, valid, and visually appealing Mermaid diagrams based on architectural analysis data.

        You will receive structured analysis data and must create a Mermaid diagram that represents the architecture.

        CRITICAL REQUIREMENTS:
        1. Return ONLY valid Mermaid syntax - no explanations, no markdown, no code blocks
        2. Start with "graph TD" for top-down flow
        3. Use clear, descriptive node labels
        4. Use appropriate node shapes:
           - [rectangles] for components/modules
           - (cylinders) for databases
           - {{diamonds}} for decision points
           - ((circles)) for external services
           - [hexagons] for APIs
        5. Use proper arrow syntax: --> for relationships
        6. Keep it clean and readable (max 20 nodes)
        7. Group related components logically
        8. Use consistent naming conventions

        DIAGRAM STRUCTURE GUIDELINES:
        - Place main application components at the top
        - Show data flow from top to bottom
        - Group related technologies together
        - Use clear, descriptive labels like "Frontend: React" or "API: Express"
        - Show external dependencies clearly
        - Indicate data flow direction with arrows

        EXAMPLE OUTPUT:
        graph TD
          A[Frontend: React App] --> B[API Gateway: Express]
          B --> C[Auth Service: Node.js]
          B --> D[Data Service: Node.js]
          C --> E[(User Database: PostgreSQL)]
          D --> F[(Main Database: MongoDB)]
          G[External API: Third Party] --> B
          H[CDN: Static Assets] --> A

        Remember: Return ONLY the Mermaid diagram syntax, nothing else.`
      ],
      [
        'human',
        [
          'Create a Mermaid diagram based on this architectural analysis:\n\n',
          'Architecture Pattern: {architecture_pattern}\n',
          'Technology Stack: {tech_stack}\n',
          'Key Components:\n{key_components}\n',
          'Dependencies:\n{dependencies}\n',
          'File Structure: {file_structure}\n\n',
          'Generate a clean Mermaid diagram that represents this architecture:'
        ].join('')
      ]
    ]);
  }

  async buildDiagram(analysisData) {
    try {
      console.log('🎨 Mermaid Diagram Builder Agent: Starting diagram creation...');
      
      const values = {
        architecture_pattern: analysisData.architecture_pattern || 'Unknown',
        tech_stack: Array.isArray(analysisData.tech_stack) ? analysisData.tech_stack.join(', ') : 'Unknown',
        key_components: this.formatComponents(analysisData.key_components || []),
        dependencies: this.formatDependencies(analysisData.dependencies || []),
        file_structure: this.formatFileStructure(analysisData.file_structure_analysis || {})
      };

      const chain = this.prompt.pipe(this.chat);
      const result = await chain.invoke(values);
      const text = result?.content ? String(result.content).trim() : '';

      console.log('🎨 Mermaid Diagram Builder Agent: Raw response received');

      // Clean and validate the Mermaid diagram
      const mermaidDiagram = this.cleanMermaidDiagram(text);
      
      // Validate the diagram syntax
      const validationResult = this.validateMermaidSyntax(mermaidDiagram);
      
      if (!validationResult.isValid) {
        console.warn('⚠️ Mermaid Diagram Builder Agent: Invalid syntax, using fallback');
        return {
          success: false,
          error: validationResult.error,
          diagram: this.createFallbackDiagram(analysisData),
          raw: text
        };
      }

      console.log('✅ Mermaid Diagram Builder Agent: Diagram created successfully');
      return {
        success: true,
        diagram: mermaidDiagram,
        raw: text
      };

    } catch (error) {
      console.error('❌ Mermaid Diagram Builder Agent: Diagram creation failed:', error);
      return {
        success: false,
        error: error.message,
        diagram: this.createFallbackDiagram(analysisData),
        raw: ''
      };
    }
  }

  formatComponents(components) {
    if (!Array.isArray(components)) return 'No components identified';
    
    return components.map(comp => {
      const tech = Array.isArray(comp.technologies) ? comp.technologies.join(', ') : comp.technologies || 'Unknown';
      return `- ${comp.name} (${comp.type}): ${tech} - ${comp.description || 'No description'}`;
    }).join('\n');
  }

  formatDependencies(dependencies) {
    if (!Array.isArray(dependencies)) return 'No dependencies identified';
    
    return dependencies.map(dep => {
      return `- ${dep.from} --[${dep.type}]--> ${dep.to}`;
    }).join('\n');
  }

  formatFileStructure(fileStructure) {
    const mainDirs = Array.isArray(fileStructure.main_directories) ? fileStructure.main_directories.join(', ') : 'Unknown';
    const configFiles = Array.isArray(fileStructure.configuration_files) ? fileStructure.configuration_files.join(', ') : 'None';
    return `Main directories: ${mainDirs}\nConfig files: ${configFiles}`;
  }

  cleanMermaidDiagram(text) {
    if (!text) return '';
    
    // Remove any markdown code blocks
    let cleaned = text.replace(/```(?:mermaid)?\s*([\s\S]*?)```/gi, '$1');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Ensure it starts with graph TD
    if (!cleaned.toLowerCase().startsWith('graph')) {
      cleaned = 'graph TD\n' + cleaned;
    }
    
    // Fix common syntax issues
    cleaned = cleaned
      .replace(/--\s*>/g, '-->')  // Fix arrow syntax
      .replace(/\|\s*([^|]+)\s*\|/g, '|$1|')  // Fix node labels
      .replace(/\s*;\s*/g, ';\n')  // Add line breaks after semicolons
      .replace(/\n\s*\n/g, '\n');  // Remove extra blank lines
    
    return cleaned;
  }

  validateMermaidSyntax(diagram) {
    if (!diagram) {
      return { isValid: false, error: 'Empty diagram' };
    }
    
    // Basic syntax validation
    const issues = [];
    
    // Check for proper start
    if (!diagram.toLowerCase().includes('graph')) {
      issues.push('Missing graph declaration');
    }
    
    // Check for valid node syntax
    const nodePattern = /\[[^\]]*\]|\([^)]*\)|\{[^}]*\}|\(\([^)]*\)\)/g;
    const nodes = diagram.match(nodePattern);
    if (!nodes || nodes.length === 0) {
      issues.push('No valid nodes found');
    }
    
    // Check for valid arrow syntax
    const arrowPattern = /-->/g;
    const arrows = diagram.match(arrowPattern);
    if (!arrows || arrows.length === 0) {
      issues.push('No valid arrows found');
    }
    
    return {
      isValid: issues.length === 0,
      error: issues.length > 0 ? issues.join(', ') : null
    };
  }

  createFallbackDiagram(analysisData) {
    // Create a simple fallback diagram when the AI fails
    const components = analysisData.key_components || [];
    const techStack = analysisData.tech_stack || [];
    
    let diagram = 'graph TD\n';
    
    if (components.length > 0) {
      components.forEach((comp, index) => {
        const nodeId = String.fromCharCode(65 + index); // A, B, C, etc.
        const label = `${comp.name}: ${comp.type}`;
        diagram += `  ${nodeId}[${label}]\n`;
        
        if (index > 0) {
          diagram += `  ${String.fromCharCode(65 + index - 1)} --> ${nodeId}\n`;
        }
      });
    } else {
      // Very basic fallback
      diagram += '  A[Application]\n';
      diagram += '  B[Database]\n';
      diagram += '  A --> B\n';
    }
    
    return diagram;
  }
}

module.exports = MermaidDiagramBuilderAgent;
