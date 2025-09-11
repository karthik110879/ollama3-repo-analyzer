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
        `You are an expert Mermaid diagram specialist specializing in creating comprehensive, detailed architectural diagrams that reveal the true complexity and relationships within software systems.

        You will receive structured analysis data and must create a Mermaid diagram that represents the COMPLETE architecture with all meaningful relationships and data flows.

        CRITICAL REQUIREMENTS:
        1. Return ONLY valid Mermaid syntax - no explanations, no markdown, no code blocks
        2. Start with "graph TD" for top-down flow
        3. Use clear, descriptive node labels with technologies and purposes
        4. Use appropriate node shapes:
           - [rectangles] for components/modules/services
           - (cylinders) for databases and data stores
           - {{diamonds}} for decision points and gateways
           - ((circles)) for external services and APIs
           - [hexagons] for APIs and interfaces
           - [parallelograms] for data processing components
           - [trapezoids] for infrastructure components
        5. Use proper arrow syntax with labels:
           - --> for direct relationships
           - -.-> for optional/conditional relationships
           - ==> for data flow
           - -->|label| for labeled relationships
        6. Create COMPREHENSIVE diagrams (up to 50+ nodes if needed)
        7. Group related components using subgraphs
        8. Show ALL meaningful relationships and data flows
        9. Use consistent naming conventions
        10. Include architectural layers and boundaries
        11. For insights and recommendations, create a dedicated subgraph named "Insights & Recommendations" at the end of the diagram. Each insight/recommendation should be a separate node within this subgraph.

        DIAGRAM STRUCTURE GUIDELINES:
        - Create multiple subgraphs for architectural layers (Presentation, Business Logic, Data Access, Infrastructure)
        - Show detailed component relationships within each layer
        - Map out data flow between all components
        - Include external dependencies and integrations
        - Show API endpoints and communication protocols
        - Display database relationships and data access patterns
        - Include configuration and deployment components
        - Show testing and monitoring components
        - Use different colors/styles for different types of components
        - Include component responsibilities and technologies in labels

        ADVANCED DIAGRAM FEATURES:
        - Use subgraphs to group related components
        - Show bidirectional relationships where appropriate
        - Include data flow labels on arrows
        - Show different types of dependencies (strong/weak)
        - Display architectural patterns visually
        - Include performance and scalability indicators
        - Show security boundaries and access controls

        EXAMPLE COMPREHENSIVE OUTPUT:
        graph TD
          subgraph "Presentation Layer"
            A[Web App: React/TypeScript]
            B[Mobile App: React Native]
            C[Admin Dashboard: Vue.js]
          end
          
          subgraph "API Gateway Layer"
            D[API Gateway: Express.js]
            E[Load Balancer: Nginx]
            F[Rate Limiter: Redis]
          end
          
          subgraph "Business Logic Layer"
            G[Auth Service: Node.js]
            H[User Service: Node.js]
            I[Order Service: Node.js]
            J[Payment Service: Node.js]
          end
          
          subgraph "Data Access Layer"
            K[User Repository: TypeORM]
            L[Order Repository: Prisma]
            M[Cache Layer: Redis]
          end
          
          subgraph "Data Storage"
            N[(User DB: PostgreSQL)]
            O[(Order DB: MongoDB)]
            P[(File Storage: AWS S3)]
          end
          
          subgraph "External Services"
            Q[Payment Gateway: Stripe]
            R[Email Service: SendGrid]
            S[Analytics: Google Analytics]
          end
          
          subgraph "Insights & Recommendations"
            IR1[Insight: Modular architecture observed]
            IR2[Recommendation: Implement caching for performance]
            IR3[Insight: Strong separation of concerns]
            IR4[Recommendation: Add comprehensive testing]
          end
          
          A -->|HTTPS| D
          B -->|HTTPS| D
          C -->|HTTPS| D
          D -->|JWT Auth| G
          D -->|API Calls| H
          D -->|API Calls| I
          D -->|API Calls| J
          G -->|User Data| K
          H -->|User Queries| K
          I -->|Order Data| L
          J -->|Payment Data| L
          K -->|SQL Queries| N
          L -->|Document Queries| O
          J -->|Payment API| Q
          H -->|Email API| R
          A -->|Analytics| S
          M -->|Cache| N
          M -->|Cache| O

        Remember: Create COMPREHENSIVE diagrams that show the TRUE architectural complexity and relationships. Return ONLY the Mermaid diagram syntax, nothing else.`
      ],
      [
        'human',
        [
          'Create a comprehensive Mermaid diagram based on this detailed architectural analysis:\n\n',
          'Architecture Pattern: {architecture_pattern}\n',
          'Technology Stack: {tech_stack}\n',
          'Key Components:\n{key_components}\n',
          'Architectural Layers:\n{architectural_layers}\n',
          'Data Flow:\n{data_flow}\n',
          'Dependencies:\n{dependencies}\n',
          'File Structure: {file_structure}\n',
          'Code Quality: {code_quality}\n',
          'Insights: {insights}\n',
          'Recommendations: {recommendations}\n\n',
          'Generate a comprehensive Mermaid diagram that reveals the TRUE architectural complexity and relationships:'
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
        architectural_layers: this.formatArchitecturalLayers(analysisData.architectural_layers || []),
        data_flow: this.formatDataFlow(analysisData.data_flow || []),
        dependencies: this.formatDependencies(analysisData.dependencies || []),
        file_structure: this.formatFileStructure(analysisData.file_structure_analysis || {}),
        code_quality: this.formatCodeQuality(analysisData.code_quality_indicators || {}),
        insights: this.formatInsights(analysisData.insights || []),
        recommendations: this.formatRecommendations(analysisData.recommendations || [])
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
      const files = Array.isArray(comp.files) ? comp.files.slice(0, 3).join(', ') : '';
      const deps = Array.isArray(comp.dependencies) ? comp.dependencies.join(', ') : '';
      const interfaces = Array.isArray(comp.interfaces) ? comp.interfaces.join(', ') : '';
      
      let result = `- ${comp.name} (${comp.type}): ${tech}`;
      if (files) result += `\n  Files: ${files}`;
      if (deps) result += `\n  Dependencies: ${deps}`;
      if (interfaces) result += `\n  Interfaces: ${interfaces}`;
      result += `\n  Description: ${comp.description || 'No description'}`;
      return result;
    }).join('\n');
  }

  formatArchitecturalLayers(layers) {
    if (!Array.isArray(layers)) return 'No architectural layers identified';
    
    return layers.map(layer => {
      const components = Array.isArray(layer.components) ? layer.components.join(', ') : '';
      const technologies = Array.isArray(layer.technologies) ? layer.technologies.join(', ') : '';
      const interactions = Array.isArray(layer.interactions) ? layer.interactions.join(', ') : '';
      
      let result = `- ${layer.name}: ${layer.description || 'No description'}`;
      if (components) result += `\n  Components: ${components}`;
      if (technologies) result += `\n  Technologies: ${technologies}`;
      if (interactions) result += `\n  Interactions: ${interactions}`;
      return result;
    }).join('\n');
  }

  formatDataFlow(dataFlow) {
    if (!Array.isArray(dataFlow)) return 'No data flow identified';
    
    return dataFlow.map(flow => {
      const protocol = flow.protocol ? ` (${flow.protocol})` : '';
      return `- ${flow.from} --[${flow.type}${protocol}]--> ${flow.to}: ${flow.description || 'No description'}`;
    }).join('\n');
  }

  formatDependencies(dependencies) {
    if (!Array.isArray(dependencies)) return 'No dependencies identified';
    
    return dependencies.map(dep => {
      const strength = dep.strength ? ` (${dep.strength})` : '';
      const description = dep.description ? `: ${dep.description}` : '';
      return `- ${dep.from} --[${dep.type}${strength}]--> ${dep.to}${description}`;
    }).join('\n');
  }

  formatCodeQuality(codeQuality) {
    if (!codeQuality || typeof codeQuality !== 'object') return 'No code quality analysis available';
    
    const indicators = [];
    if (codeQuality.modularity) indicators.push(`Modularity: ${codeQuality.modularity}`);
    if (codeQuality.coupling) indicators.push(`Coupling: ${codeQuality.coupling}`);
    if (codeQuality.reusability) indicators.push(`Reusability: ${codeQuality.reusability}`);
    if (codeQuality.testability) indicators.push(`Testability: ${codeQuality.testability}`);
    
    return indicators.length > 0 ? indicators.join('\n') : 'No code quality indicators available';
  }

  formatInsights(insights) {
    if (!Array.isArray(insights)) return 'No insights available';
    
    return insights.map((insight, index) => {
      return `${index + 1}. ${insight}`;
    }).join('\n');
  }

  formatRecommendations(recommendations) {
    if (!Array.isArray(recommendations)) return 'No recommendations available';
    
    return recommendations.map((rec, index) => {
      return `${index + 1}. ${rec}`;
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
