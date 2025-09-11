const RepositoryAnalyzerAgent = require('./RepositoryAnalyzerAgent');
const MermaidDiagramBuilderAgent = require('./MermaidDiagramBuilderAgent');

class ParallelAnalysisCoordinator {
  constructor(config = {}) {
    this.config = {
      maxConcurrentChunks: config.maxConcurrentChunks || 3, // Max parallel chunk processing
      chunkTimeout: config.chunkTimeout || 120000, // 2 minutes per chunk
      retryAttempts: config.retryAttempts || 2,
      analyzerConfig: config.analyzerConfig || {},
      diagramBuilderConfig: config.diagramBuilderConfig || {},
      ...config
    };

    // Initialize agents for parallel processing
    this.analyzerAgent = new RepositoryAnalyzerAgent(this.config.analyzerConfig);
    this.diagramBuilderAgent = new MermaidDiagramBuilderAgent(this.config.diagramBuilderConfig);
  }

  async processChunksInParallel(chunks, repositoryData) {
    console.log(`🚀 Parallel Analysis Coordinator: Processing ${chunks.length} chunks with max ${this.config.maxConcurrentChunks} concurrent workers`);
    
    const startTime = Date.now();
    const results = [];
    const errors = [];

    // Process chunks in batches to control concurrency
    for (let i = 0; i < chunks.length; i += this.config.maxConcurrentChunks) {
      const batch = chunks.slice(i, i + this.config.maxConcurrentChunks);
      console.log(`📦 Processing batch ${Math.floor(i / this.config.maxConcurrentChunks) + 1}/${Math.ceil(chunks.length / this.config.maxConcurrentChunks)} (${batch.length} chunks)`);
      
      const batchPromises = batch.map((chunk, index) => 
        this.processChunkWithRetry(chunk, repositoryData, i + index)
      );

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            const chunkIndex = i + index;
            console.error(`❌ Chunk ${chunkIndex} failed:`, result.reason);
            errors.push({
              chunkIndex,
              chunkId: batch[index].id,
              error: result.reason.message || result.reason
            });
          }
        });

      } catch (error) {
        console.error('❌ Batch processing failed:', error);
        errors.push({
          batchIndex: Math.floor(i / this.config.maxConcurrentChunks),
          error: error.message
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`⏱️ Parallel processing completed in ${duration}ms`);

    return {
      results,
      errors,
      duration,
      success: results.length > 0,
      processedChunks: results.length,
      totalChunks: chunks.length,
      errorRate: errors.length / chunks.length
    };
  }

  async processChunkWithRetry(chunk, repositoryData, chunkIndex) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`🔄 Processing chunk ${chunk.id} (attempt ${attempt}/${this.config.retryAttempts})`);
        
        const result = await this.processChunk(chunk, repositoryData, chunkIndex);
        
        if (result.success) {
          console.log(`✅ Chunk ${chunk.id} completed successfully`);
          return result;
        } else {
          lastError = new Error(result.error || 'Chunk processing failed');
        }
        
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Chunk ${chunk.id} attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.config.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Retrying chunk ${chunk.id} in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  async processChunk(chunk, repositoryData, chunkIndex) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Chunk processing timeout')), this.config.chunkTimeout);
    });

    const processPromise = this.analyzeChunk(chunk, repositoryData, chunkIndex);

    try {
      const result = await Promise.race([processPromise, timeoutPromise]);
      return result;
    } catch (error) {
      if (error.message === 'Chunk processing timeout') {
        throw new Error(`Chunk ${chunk.id} timed out after ${this.config.chunkTimeout}ms`);
      }
      throw error;
    }
  }

  async analyzeChunk(chunk, repositoryData, chunkIndex) {
    try {
      // Create chunk-specific repository data
      const chunkRepoData = {
        repoName: repositoryData.repoName,
        branchName: repositoryData.branchName,
        repoTree: this.createChunkTree(chunk, repositoryData.repoName, repositoryData.branchName)
      };

      // Analyze the chunk
      const analysisResult = await this.analyzerAgent.analyze(chunkRepoData);
      
      if (!analysisResult.success) {
        return {
          success: false,
          error: analysisResult.error,
          chunkId: chunk.id,
          chunkIndex
        };
      }

      // Build diagram for the chunk
      const diagramResult = await this.diagramBuilderAgent.buildDiagram(analysisResult.data);
      
      return {
        success: true,
        chunkId: chunk.id,
        chunkIndex,
        chunkName: chunk.name,
        chunkType: chunk.chunk_type,
        priority: chunk.priority,
        fileCount: chunk.files.length,
        analysis: analysisResult.data,
        diagram: diagramResult.diagram || '',
        diagramSuccess: diagramResult.success,
        processingTime: Date.now() - Date.now(), // Will be set by coordinator
        raw: {
          analysis: analysisResult.raw,
          diagram: diagramResult.raw
        }
      };

    } catch (error) {
      console.error(`❌ Chunk ${chunk.id} analysis failed:`, error);
      return {
        success: false,
        error: error.message,
        chunkId: chunk.id,
        chunkIndex
      };
    }
  }

  createChunkTree(chunk, repoName, branchName) {
    const lines = [
      `Repository: ${repoName}`,
      `Branch: ${branchName}`,
      `Chunk: ${chunk.name}`,
      `Type: ${chunk.chunk_type}`,
      `Priority: ${chunk.priority}`,
      `Files (${chunk.files.length}):`,
      ...chunk.files.map(file => `- ${file}`)
    ];
    
    return lines.join('\n');
  }

  // Utility method for sleep/delay
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to get processing statistics
  getProcessingStats() {
    return {
      maxConcurrentChunks: this.config.maxConcurrentChunks,
      chunkTimeout: this.config.chunkTimeout,
      retryAttempts: this.config.retryAttempts,
      analyzerConfig: this.analyzerAgent.config,
      diagramBuilderConfig: this.diagramBuilderAgent.config
    };
  }

  // Method to update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.analyzerConfig) {
      this.analyzerAgent = new RepositoryAnalyzerAgent({
        ...this.analyzerAgent.config,
        ...newConfig.analyzerConfig
      });
    }
    
    if (newConfig.diagramBuilderConfig) {
      this.diagramBuilderAgent = new MermaidDiagramBuilderAgent({
        ...this.diagramBuilderAgent.config,
        ...newConfig.diagramBuilderConfig
      });
    }
  }

  // Method to estimate processing time
  estimateProcessingTime(chunkCount) {
    const batches = Math.ceil(chunkCount / this.config.maxConcurrentChunks);
    const avgTimePerChunk = 30000; // 30 seconds average
    const totalTime = batches * avgTimePerChunk;
    
    return {
      estimatedSeconds: Math.ceil(totalTime / 1000),
      estimatedMinutes: Math.ceil(totalTime / 60000),
      batches,
      chunksPerBatch: this.config.maxConcurrentChunks
    };
  }
}

module.exports = ParallelAnalysisCoordinator;
