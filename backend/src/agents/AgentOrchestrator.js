const RepositoryAnalyzerAgent = require('./RepositoryAnalyzerAgent');
const MermaidDiagramBuilderAgent = require('./MermaidDiagramBuilderAgent');
const CodebaseChunkingAgent = require('./CodebaseChunkingAgent');
const ParallelAnalysisCoordinator = require('./ParallelAnalysisCoordinator');
const ResultsAggregator = require('./ResultsAggregator');

class AgentOrchestrator {
  constructor(config = {}) {
    this.config = {
      analyzerConfig: config.analyzerConfig || {},
      diagramBuilderConfig: config.diagramBuilderConfig || {},
      chunkingConfig: config.chunkingConfig || {},
      parallelConfig: config.parallelConfig || {},
      aggregatorConfig: config.aggregatorConfig || {},
      enableFallback: config.enableFallback !== false, // Default to true
      enableChunking: config.enableChunking !== false, // Default to true
      chunkingThreshold: config.chunkingThreshold || 500, // Files threshold for chunking
      ...config
    };

    // Initialize agents
    this.analyzerAgent = new RepositoryAnalyzerAgent(this.config.analyzerConfig);
    this.diagramBuilderAgent = new MermaidDiagramBuilderAgent(this.config.diagramBuilderConfig);
    this.chunkingAgent = new CodebaseChunkingAgent(this.config.chunkingConfig);
    this.parallelCoordinator = new ParallelAnalysisCoordinator({
      ...this.config.parallelConfig,
      analyzerConfig: this.config.analyzerConfig,
      diagramBuilderConfig: this.config.diagramBuilderConfig
    });
    this.resultsAggregator = new ResultsAggregator(this.config.aggregatorConfig);
  }

  async analyzeRepository(repositoryData) {
    const startTime = Date.now();
    console.log('🚀 Agent Orchestrator: Starting multi-agent analysis...');

    try {
      // Check if repository needs chunking
      const fileCount = this.countFilesInRepository(repositoryData.repoTree);
      console.log(`📊 Repository has ${fileCount} files`);

      if (fileCount > this.config.chunkingThreshold && this.config.enableChunking) {
        console.log('🔪 Repository is large, using chunking strategy...');
        return await this.analyzeWithChunking(repositoryData, startTime);
      } else {
        console.log('📦 Repository is small enough for single-chunk processing...');
        return await this.analyzeWithoutChunking(repositoryData, startTime);
      }

    } catch (error) {
      console.error('❌ Agent Orchestrator: Multi-agent analysis failed:', error);
      return this.createErrorResponse(repositoryData, error);
    }
  }

  async analyzeWithChunking(repositoryData, startTime) {
    try {
      // Step 1: Chunk the repository
      console.log('🔪 Step 1: Chunking repository...');
      const chunkingResult = await this.chunkingAgent.chunkRepository(repositoryData);
      
      if (!chunkingResult.success) {
        console.warn('⚠️ Chunking failed, falling back to single-chunk analysis');
        return await this.analyzeWithoutChunking(repositoryData, startTime);
      }

      const chunks = chunkingResult.data.chunks;
      console.log(`✅ Created ${chunks.length} chunks for parallel processing`);

      // Step 2: Process chunks in parallel
      console.log('⚡ Step 2: Processing chunks in parallel...');
      const parallelResult = await this.parallelCoordinator.processChunksInParallel(chunks, repositoryData);
      
      if (!parallelResult.success) {
        console.warn('⚠️ Parallel processing failed, using fallback');
        return this.createFallbackResponse(repositoryData, 'Parallel processing failed');
      }

      console.log(`✅ Processed ${parallelResult.processedChunks}/${parallelResult.totalChunks} chunks successfully`);

      // Step 3: Aggregate results
      console.log('🔗 Step 3: Aggregating results...');
      const aggregationResult = await this.resultsAggregator.aggregateResults(parallelResult, repositoryData);
      
      if (!aggregationResult.success) {
        console.warn('⚠️ Aggregation failed, using fallback');
        return this.createFallbackResponse(repositoryData, 'Results aggregation failed');
      }

      console.log('✅ Results aggregation completed successfully');

      // Step 4: Create final unified diagram
      console.log('🎨 Step 4: Creating unified diagram...');
      const diagramResult = await this.diagramBuilderAgent.buildDiagram(aggregationResult.data);
      
      const finalResult = this.combineChunkedResults(aggregationResult.data, diagramResult.diagram || '');
      
      const duration = Date.now() - startTime;
      console.log(`🎉 Chunked analysis completed in ${duration}ms`);

      return {
        success: true,
        data: finalResult,
        metadata: {
          analysisDuration: duration,
          analysisMethod: 'chunked',
          chunkingStrategy: chunkingResult.data.chunkingStrategy,
          totalChunks: chunks.length,
          processedChunks: parallelResult.processedChunks,
          failedChunks: parallelResult.errors.length,
          parallelProcessingTime: parallelResult.duration,
          aggregationMethod: aggregationResult.metadata?.aggregationMethod || 'unknown',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Chunked analysis failed:', error);
      return this.createErrorResponse(repositoryData, error);
    }
  }

  async analyzeWithoutChunking(repositoryData, startTime) {
    try {
      // Step 1: Repository Analysis
      console.log('📊 Step 1: Running Repository Analyzer Agent...');
      const analysisResult = await this.analyzerAgent.analyze(repositoryData);
      
      if (!analysisResult.success) {
        console.warn('⚠️ Repository analysis failed, using fallback data');
        return this.createFallbackResponse(repositoryData, analysisResult.error);
      }

      console.log('✅ Repository analysis completed successfully');

      // Step 2: Diagram Building
      console.log('🎨 Step 2: Running Mermaid Diagram Builder Agent...');
      const diagramResult = await this.diagramBuilderAgent.buildDiagram(analysisResult.data);
      
      if (!diagramResult.success) {
        console.warn('⚠️ Diagram building failed, using fallback diagram');
        return this.createResponseWithFallbackDiagram(analysisResult, diagramResult.error);
      }

      console.log('✅ Diagram building completed successfully');

      // Step 3: Combine Results
      const finalResult = this.combineResults(analysisResult, diagramResult);
      
      const duration = Date.now() - startTime;
      console.log(`🎉 Single-chunk analysis completed in ${duration}ms`);

      return {
        success: true,
        data: finalResult,
        metadata: {
          analysisDuration: duration,
          analysisMethod: 'single-chunk',
          analyzerSuccess: analysisResult.success,
          diagramBuilderSuccess: diagramResult.success,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Single-chunk analysis failed:', error);
      return this.createErrorResponse(repositoryData, error);
    }
  }

  combineResults(analysisResult, diagramResult) {
    const analysisData = analysisResult.data;
    
    return {
      // From analysis
      architecture: analysisData.architecture_pattern || 'Unknown',
      techStack: analysisData.tech_stack || [],
      insights: analysisData.insights || [],
      keyComponents: analysisData.key_components || [],
      dependencies: analysisData.dependencies || [],
      fileStructureAnalysis: analysisData.file_structure_analysis || {},
      scalabilityNotes: analysisData.scalability_notes || '',
      securityConsiderations: analysisData.security_considerations || '',
      
      // From diagram builder
      mermaid: diagramResult.diagram || '',
      
      // Raw data for debugging
      raw: {
        analysis: analysisResult.raw || '',
        diagram: diagramResult.raw || ''
      }
    };
  }

  createFallbackResponse(repositoryData, error) {
    console.log('🔄 Creating fallback response...');
    
    const fallbackAnalysis = this.analyzerAgent.createFallbackAnalysis(repositoryData.repoTree);
    const fallbackDiagram = this.diagramBuilderAgent.createFallbackDiagram(fallbackAnalysis);
    
    return {
      success: true,
      data: {
        architecture: fallbackAnalysis.architecture_pattern,
        techStack: fallbackAnalysis.tech_stack,
        insights: [
          'Analysis completed with fallback method due to agent failure',
          error ? `Error: ${error}` : 'Unknown error occurred'
        ],
        keyComponents: fallbackAnalysis.key_components,
        dependencies: fallbackAnalysis.dependencies,
        fileStructureAnalysis: fallbackAnalysis.file_structure_analysis,
        scalabilityNotes: fallbackAnalysis.scalability_notes,
        securityConsiderations: fallbackAnalysis.security_considerations,
        mermaid: fallbackDiagram,
        raw: {
          analysis: 'Fallback analysis used',
          diagram: 'Fallback diagram used'
        }
      },
      metadata: {
        fallbackUsed: true,
        error: error,
        timestamp: new Date().toISOString()
      }
    };
  }

  createResponseWithFallbackDiagram(analysisResult, diagramError) {
    console.log('🔄 Creating response with fallback diagram...');
    
    const analysisData = analysisResult.data;
    const fallbackDiagram = this.diagramBuilderAgent.createFallbackDiagram(analysisData);
    
    return {
      success: true,
      data: {
        architecture: analysisData.architecture_pattern || 'Unknown',
        techStack: analysisData.tech_stack || [],
        insights: [
          ...(analysisData.insights || []),
          'Diagram created using fallback method due to diagram builder failure'
        ],
        keyComponents: analysisData.key_components || [],
        dependencies: analysisData.dependencies || [],
        fileStructureAnalysis: analysisData.file_structure_analysis || {},
        scalabilityNotes: analysisData.scalability_notes || '',
        securityConsiderations: analysisData.security_considerations || '',
        mermaid: fallbackDiagram,
        raw: {
          analysis: analysisResult.raw || '',
          diagram: 'Fallback diagram used'
        }
      },
      metadata: {
        fallbackDiagramUsed: true,
        diagramError: diagramError,
        timestamp: new Date().toISOString()
      }
    };
  }

  createErrorResponse(repositoryData, error) {
    console.log('🔄 Creating error response...');
    
    return {
      success: false,
      error: 'Multi-agent analysis failed',
      message: error.message,
      data: {
        architecture: 'Unknown',
        techStack: [],
        insights: ['Analysis failed due to system error'],
        keyComponents: [],
        dependencies: [],
        fileStructureAnalysis: {},
        scalabilityNotes: '',
        securityConsiderations: '',
        mermaid: '',
        raw: {
          analysis: '',
          diagram: ''
        }
      },
      metadata: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }

  countFilesInRepository(repoTree) {
    const lines = repoTree.split('\n');
    return lines.filter(line => line.startsWith('- ')).length;
  }

  combineChunkedResults(aggregatedData, mermaidDiagram) {
    return {
      // From aggregated analysis
      architecture: aggregatedData.architecture_pattern || 'Unknown',
      techStack: aggregatedData.tech_stack || [],
      insights: aggregatedData.insights || [],
      keyComponents: aggregatedData.key_components || [],
      dependencies: aggregatedData.dependencies || [],
      fileStructureAnalysis: aggregatedData.file_structure_analysis || {},
      scalabilityNotes: aggregatedData.scalability_notes || '',
      securityConsiderations: aggregatedData.security_considerations || '',
      
      // From diagram builder
      mermaid: mermaidDiagram || '',
      
      // Chunking-specific data
      chunkAnalysisSummary: aggregatedData.chunk_analysis_summary || {},
      
      // Raw data for debugging
      raw: {
        analysis: 'Aggregated from multiple chunks',
        diagram: 'Unified diagram from aggregated analysis'
      }
    };
  }

  // Method to get agent status (useful for monitoring)
  getAgentStatus() {
    return {
      analyzerAgent: {
        model: this.analyzerAgent.config.model,
        temperature: this.analyzerAgent.config.temperature,
        baseUrl: this.analyzerAgent.config.baseUrl,
        purpose: 'Code Analysis (CodeLlama 34B)',
        description: 'Specialized for deep architectural analysis and code understanding'
      },
      diagramBuilderAgent: {
        model: this.diagramBuilderAgent.config.model,
        temperature: this.diagramBuilderAgent.config.temperature,
        baseUrl: this.diagramBuilderAgent.config.baseUrl,
        purpose: 'Diagram Generation (Ollama3)',
        description: 'Creative Mermaid diagram generation'
      },
      chunkingAgent: {
        model: this.chunkingAgent.config.model,
        temperature: this.chunkingAgent.config.temperature,
        baseUrl: this.chunkingAgent.config.baseUrl,
        maxChunkSize: this.chunkingAgent.config.maxChunkSize,
        maxChunks: this.chunkingAgent.config.maxChunks,
        purpose: 'Repository Chunking (Ollama3)',
        description: 'Large repository chunking and processing'
      },
      parallelCoordinator: {
        maxConcurrentChunks: this.parallelCoordinator.config.maxConcurrentChunks,
        chunkTimeout: this.parallelCoordinator.config.chunkTimeout,
        retryAttempts: this.parallelCoordinator.config.retryAttempts,
        purpose: 'Parallel Processing Coordinator',
        description: 'Manages parallel chunk processing'
      },
      resultsAggregator: {
        model: this.resultsAggregator.config.model,
        temperature: this.resultsAggregator.config.temperature,
        baseUrl: this.resultsAggregator.config.baseUrl,
        purpose: 'Results Aggregation (Ollama3)',
        description: 'Combines and synthesizes chunk results'
      }
    };
  }

  // Method to update agent configurations
  updateAnalyzerConfig(newConfig) {
    this.analyzerAgent = new RepositoryAnalyzerAgent({
      ...this.analyzerAgent.config,
      ...newConfig
    });
  }

  updateDiagramBuilderConfig(newConfig) {
    this.diagramBuilderAgent = new MermaidDiagramBuilderAgent({
      ...this.diagramBuilderAgent.config,
      ...newConfig
    });
  }
}

module.exports = AgentOrchestrator;
