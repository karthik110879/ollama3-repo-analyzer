const { ChatOllama } = require('@langchain/community/chat_models/ollama');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

class ResultsAggregator {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: config.model || process.env.OLLAMA_AGGREGATOR_MODEL || 'llama3',
      temperature: config.temperature || 0.2, // Low temperature for consistent aggregation
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
        `You are an expert software architect specializing in aggregating and synthesizing analysis results from multiple codebase chunks into a unified, comprehensive architectural overview.

        Your job is to take multiple chunk analysis results and create a cohesive, unified analysis that represents the entire codebase architecture.

        Return a JSON object with the following structure:
        {{
          "architecture_pattern": "overall pattern (e.g., MVC, Microservices, Monolith, etc.)",
          "tech_stack": ["consolidated technology list"],
          "key_components": [
            {{
              "name": "component name",
              "type": "component type",
              "technologies": ["tech1", "tech2"],
              "description": "comprehensive description",
              "chunks": ["chunk_ids_where_found"]
            }}
          ],
          "insights": [
            "synthesized architectural insights from all chunks"
          ],
          "dependencies": [
            {{
              "from": "source component",
              "to": "target component",
              "type": "dependency type",
              "strength": "strong/medium/weak"
            }}
          ],
          "file_structure_analysis": {{
            "main_directories": ["consolidated directory list"],
            "configuration_files": ["consolidated config files"],
            "test_structure": "overall test organization",
            "documentation_presence": "overall documentation assessment"
          }},
          "scalability_notes": "consolidated scalability analysis",
          "security_considerations": "consolidated security analysis",
          "chunk_analysis_summary": {{
            "total_chunks": 8,
            "successful_chunks": 7,
            "failed_chunks": 1,
            "chunk_types": {{"frontend": 3, "backend": 2, "database": 1, "tests": 1}},
            "processing_time": "4 minutes 32 seconds"
          }}
        }}

        AGGREGATION GUIDELINES:
        1. Merge similar components from different chunks
        2. Consolidate technology stacks across chunks
        3. Identify cross-chunk dependencies and relationships
        4. Synthesize insights to avoid duplication
        5. Maintain architectural coherence across chunks
        6. Highlight patterns that emerge from the full codebase
        7. Preserve important details from individual chunks
        8. Create a unified architectural narrative

        Focus on creating a comprehensive view that shows how all the chunks work together to form the complete system architecture.`
      ],
      [
        'human',
        [
          'Aggregate these chunk analysis results into a unified architectural overview:\n\n',
          'Repository: {repo_name}\n',
          'Total Chunks: {total_chunks}\n',
          'Chunk Results:\n{chunk_results}\n\n',
          'Create a comprehensive unified analysis:'
        ].join('')
      ]
    ]);
  }

  async aggregateResults(chunkResults, repositoryData) {
    try {
      console.log('🔗 Results Aggregator: Starting aggregation of chunk results...');
      
      const { repoName } = repositoryData;
      const successfulResults = chunkResults.results.filter(r => r.success);
      const totalChunks = chunkResults.results.length + chunkResults.errors.length;

      console.log(`📊 Aggregating ${successfulResults.length}/${totalChunks} successful chunk results`);

      if (successfulResults.length === 0) {
        return this.createFallbackAggregation(chunkResults, repositoryData);
      }

      // Use AI to aggregate results intelligently
      const aggregationResult = await this.createIntelligentAggregation(successfulResults, chunkResults, repositoryData);
      
      if (!aggregationResult.success) {
        console.warn('⚠️ AI aggregation failed, using rule-based fallback');
        return this.createRuleBasedAggregation(successfulResults, chunkResults, repositoryData);
      }

      console.log('✅ Results aggregation completed successfully');
      return aggregationResult;

    } catch (error) {
      console.error('❌ Results Aggregator: Aggregation failed:', error);
      return this.createFallbackAggregation(chunkResults, repositoryData);
    }
  }

  async createIntelligentAggregation(successfulResults, chunkResults, repositoryData) {
    try {
      const { repoName } = repositoryData;
      
      const chain = this.prompt.pipe(this.chat);
      const values = {
        repo_name: repoName,
        total_chunks: chunkResults.results.length + chunkResults.errors.length,
        chunk_results: this.formatChunkResultsForAggregation(successfulResults, chunkResults)
      };

      const result = await chain.invoke(values);
      const text = result?.content ? String(result.content).trim() : '';

      // Parse JSON response
      let aggregatedData;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aggregatedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in aggregation response');
        }
      } catch (parseError) {
        console.error('❌ Aggregation JSON parse error:', parseError);
        throw new Error('Failed to parse aggregation response');
      }

      return {
        success: true,
        data: aggregatedData,
        raw: text,
        metadata: {
          aggregationMethod: 'AI-based intelligent aggregation',
          successfulChunks: successfulResults.length,
          totalChunks: chunkResults.results.length + chunkResults.errors.length,
          processingTime: chunkResults.duration
        }
      };

    } catch (error) {
      console.error('❌ Intelligent aggregation failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  createRuleBasedAggregation(successfulResults, chunkResults, repositoryData) {
    console.log('🔄 Creating rule-based aggregation...');
    
    const aggregatedData = {
      architecture_pattern: this.determineArchitecturePattern(successfulResults),
      tech_stack: this.consolidateTechStack(successfulResults),
      key_components: this.mergeComponents(successfulResults),
      insights: this.consolidateInsights(successfulResults),
      dependencies: this.mergeDependencies(successfulResults),
      file_structure_analysis: this.consolidateFileStructure(successfulResults),
      scalability_notes: this.consolidateScalabilityNotes(successfulResults),
      security_considerations: this.consolidateSecurityConsiderations(successfulResults),
      chunk_analysis_summary: {
        total_chunks: chunkResults.results.length + chunkResults.errors.length,
        successful_chunks: successfulResults.length,
        failed_chunks: chunkResults.errors.length,
        chunk_types: this.analyzeChunkTypes(successfulResults),
        processing_time: `${Math.floor(chunkResults.duration / 60000)} minutes ${Math.floor((chunkResults.duration % 60000) / 1000)} seconds`
      }
    };

    return {
      success: true,
      data: aggregatedData,
      raw: 'Rule-based aggregation used',
      metadata: {
        aggregationMethod: 'Rule-based fallback aggregation',
        successfulChunks: successfulResults.length,
        totalChunks: chunkResults.results.length + chunkResults.errors.length,
        processingTime: chunkResults.duration
      }
    };
  }

  createFallbackAggregation(chunkResults, repositoryData) {
    console.log('🔄 Creating fallback aggregation...');
    
    return {
      success: true,
      data: {
        architecture_pattern: 'Unknown',
        tech_stack: [],
        key_components: [],
        insights: ['Analysis failed - no successful chunks to aggregate'],
        dependencies: [],
        file_structure_analysis: {
          main_directories: [],
          configuration_files: [],
          test_structure: 'Unknown',
          documentation_presence: 'Unknown'
        },
        scalability_notes: 'Analysis incomplete',
        security_considerations: 'Analysis incomplete',
        chunk_analysis_summary: {
          total_chunks: chunkResults.results.length + chunkResults.errors.length,
          successful_chunks: 0,
          failed_chunks: chunkResults.results.length + chunkResults.errors.length,
          chunk_types: {},
          processing_time: `${Math.floor(chunkResults.duration / 60000)} minutes ${Math.floor((chunkResults.duration % 60000) / 1000)} seconds`
        }
      },
      raw: 'Fallback aggregation used',
      metadata: {
        aggregationMethod: 'Fallback aggregation',
        successfulChunks: 0,
        totalChunks: chunkResults.results.length + chunkResults.errors.length,
        processingTime: chunkResults.duration
      }
    };
  }

  formatChunkResultsForAggregation(successfulResults, chunkResults) {
    let formatted = `Processing Summary:\n`;
    formatted += `- Total chunks: ${chunkResults.results.length + chunkResults.errors.length}\n`;
    formatted += `- Successful: ${successfulResults.length}\n`;
    formatted += `- Failed: ${chunkResults.errors.length}\n`;
    formatted += `- Processing time: ${chunkResults.duration}ms\n\n`;

    formatted += `Chunk Analysis Results:\n`;
    successfulResults.forEach((result, index) => {
      formatted += `\n--- Chunk ${index + 1}: ${result.chunkName} (${result.chunkType}) ---\n`;
      formatted += `Priority: ${result.priority}\n`;
      formatted += `Files: ${result.fileCount}\n`;
      formatted += `Architecture: ${result.analysis.architecture_pattern || 'Unknown'}\n`;
      formatted += `Tech Stack: ${(result.analysis.tech_stack || []).join(', ')}\n`;
      formatted += `Components: ${(result.analysis.key_components || []).length}\n`;
      formatted += `Insights: ${(result.analysis.insights || []).join('; ')}\n`;
    });

    return formatted;
  }

  determineArchitecturePattern(results) {
    const patterns = results.map(r => r.analysis.architecture_pattern).filter(Boolean);
    if (patterns.length === 0) return 'Unknown';
    
    // Find most common pattern
    const patternCounts = {};
    patterns.forEach(pattern => {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    });
    
    return Object.entries(patternCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  consolidateTechStack(results) {
    const allTech = new Set();
    results.forEach(result => {
      (result.analysis.tech_stack || []).forEach(tech => allTech.add(tech));
    });
    return Array.from(allTech);
  }

  mergeComponents(results) {
    const componentMap = new Map();
    
    results.forEach(result => {
      (result.analysis.key_components || []).forEach(comp => {
        const key = `${comp.name}-${comp.type}`;
        if (componentMap.has(key)) {
          const existing = componentMap.get(key);
          existing.technologies = [...new Set([...existing.technologies, ...(comp.technologies || [])])];
          existing.chunks = [...new Set([...existing.chunks, result.chunkId])];
          existing.description = existing.description + '; ' + (comp.description || '');
        } else {
          componentMap.set(key, {
            ...comp,
            chunks: [result.chunkId]
          });
        }
      });
    });
    
    return Array.from(componentMap.values());
  }

  consolidateInsights(results) {
    const allInsights = new Set();
    results.forEach(result => {
      (result.analysis.insights || []).forEach(insight => allInsights.add(insight));
    });
    return Array.from(allInsights);
  }

  mergeDependencies(results) {
    const allDeps = [];
    results.forEach(result => {
      (result.analysis.dependencies || []).forEach(dep => {
        allDeps.push({
          ...dep,
          strength: 'medium' // Default strength
        });
      });
    });
    return allDeps;
  }

  consolidateFileStructure(results) {
    const allDirs = new Set();
    const allConfigs = new Set();
    let testStructure = '';
    let docPresence = '';

    results.forEach(result => {
      const fs = result.analysis.file_structure_analysis || {};
      (fs.main_directories || []).forEach(dir => allDirs.add(dir));
      (fs.configuration_files || []).forEach(file => allConfigs.add(file));
      if (fs.test_structure) testStructure = fs.test_structure;
      if (fs.documentation_presence) docPresence = fs.documentation_presence;
    });

    return {
      main_directories: Array.from(allDirs),
      configuration_files: Array.from(allConfigs),
      test_structure: testStructure || 'Unknown',
      documentation_presence: docPresence || 'Unknown'
    };
  }

  consolidateScalabilityNotes(results) {
    const notes = results
      .map(r => r.analysis.scalability_notes)
      .filter(Boolean)
      .join('; ');
    return notes || 'No scalability analysis available';
  }

  consolidateSecurityConsiderations(results) {
    const considerations = results
      .map(r => r.analysis.security_considerations)
      .filter(Boolean)
      .join('; ');
    return considerations || 'No security analysis available';
  }

  analyzeChunkTypes(results) {
    const types = {};
    results.forEach(result => {
      const type = result.chunkType || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  // Method to get aggregation configuration
  getAggregationConfig() {
    return {
      model: this.config.model,
      temperature: this.config.temperature,
      baseUrl: this.config.baseUrl
    };
  }

  // Method to update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.chat = new ChatOllama({
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      temperature: this.config.temperature,
    });
  }
}

module.exports = ResultsAggregator;
