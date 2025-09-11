const { ChatOllama } = require('@langchain/community/chat_models/ollama');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

class CodebaseChunkingAgent {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: config.model || process.env.OLLAMA_CHUNKING_MODEL || 'llama3',
      temperature: config.temperature || 0.1, // Low temperature for consistent chunking
      maxChunkSize: config.maxChunkSize || 200, // Max files per chunk
      maxChunks: config.maxChunks || 10, // Max number of chunks
      minChunkSize: config.minChunkSize || 50, // Min files per chunk
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
        `You are an expert codebase analyzer specializing in intelligently chunking large repositories for efficient parallel processing.

        Your job is to analyze a repository structure and create logical, meaningful chunks that can be processed independently while maintaining architectural coherence.

        Return a JSON object with the following structure:
        {{
          "chunks": [
            {{
              "id": "chunk_1",
              "name": "Frontend Components",
              "description": "All frontend UI components and related files",
              "files": ["src/app/component1.ts", "src/app/component2.ts"],
              "priority": "high",
              "dependencies": ["chunk_2"],
              "chunk_type": "frontend"
            }}
          ],
          "chunking_strategy": "description of the chunking approach used",
          "total_files": 1500,
          "chunk_count": 8,
          "estimated_processing_time": "2-3 minutes"
        }}

        CHUNKING GUIDELINES:
        1. Group related files together (components, services, utilities, etc.)
        2. Maintain architectural boundaries (frontend, backend, database, etc.)
        3. Keep chunks balanced in size (aim for 100-300 files per chunk)
        4. Identify dependencies between chunks
        5. Prioritize chunks by importance (core functionality first)
        6. Consider file types and their relationships

        CHUNK TYPES:
        - "frontend": UI components, styles, templates
        - "backend": API routes, services, business logic
        - "database": Models, migrations, schemas
        - "configuration": Config files, package files, deployment
        - "tests": Test files and testing infrastructure
        - "documentation": README, docs, examples
        - "utilities": Shared utilities, helpers, common code
        - "infrastructure": Docker, CI/CD, deployment scripts

        PRIORITY LEVELS:
        - "high": Core application logic, main components
        - "medium": Supporting services, utilities
        - "low": Tests, documentation, configuration

        Make chunks that can be analyzed independently while preserving the overall architecture understanding.`
      ],
      [
        'human',
        [
          'Analyze this repository structure and create intelligent chunks for parallel processing:\n\n',
          'Repository: {repo_name}\n',
          'Total Files: {total_files}\n',
          'File Structure:\n{file_structure}\n\n',
          'Create logical chunks that maintain architectural coherence while enabling parallel analysis:'
        ].join('')
      ]
    ]);
  }

  async chunkRepository(repositoryData) {
    try {
      console.log('🔪 Codebase Chunking Agent: Starting repository chunking...');
      
      const { repoName, repoTree } = repositoryData;
      const files = this.extractFilesFromTree(repoTree);
      const totalFiles = files.length;

      console.log(`📊 Repository has ${totalFiles} files`);

      // If repository is small enough, return single chunk
      if (totalFiles <= this.config.maxChunkSize) {
        console.log('📦 Repository is small enough for single-chunk processing');
        return this.createSingleChunk(repositoryData, files);
      }

      // Use AI to create intelligent chunks
      const chunkingResult = await this.createIntelligentChunks(repositoryData, files);
      
      if (!chunkingResult.success) {
        console.warn('⚠️ AI chunking failed, using fallback strategy');
        return this.createFallbackChunks(repositoryData, files);
      }

      console.log(`✅ Created ${chunkingResult.data.chunks.length} chunks for parallel processing`);
      return chunkingResult;

    } catch (error) {
      console.error('❌ Codebase Chunking Agent: Chunking failed:', error);
      return this.createFallbackChunks(repositoryData, this.extractFilesFromTree(repositoryData.repoTree));
    }
  }

  async createIntelligentChunks(repositoryData, files) {
    try {
      const { repoName, repoTree } = repositoryData;
      
      const chain = this.prompt.pipe(this.chat);
      const values = {
        repo_name: repoName,
        total_files: files.length,
        file_structure: this.formatFileStructureForChunking(files)
      };

      const result = await chain.invoke(values);
      const text = result?.content ? String(result.content).trim() : '';

      // Parse JSON response
      let chunkingData;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          chunkingData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in chunking response');
        }
      } catch (parseError) {
        console.error('❌ Chunking JSON parse error:', parseError);
        throw new Error('Failed to parse chunking response');
      }

      // Validate and clean chunks
      const validatedChunks = this.validateAndCleanChunks(chunkingData.chunks, files);
      
      return {
        success: true,
        data: {
          chunks: validatedChunks,
          chunkingStrategy: chunkingData.chunking_strategy || 'AI-based intelligent chunking',
          totalFiles: files.length,
          chunkCount: validatedChunks.length,
          estimatedProcessingTime: chunkingData.estimated_processing_time || 'Unknown'
        },
        raw: text
      };

    } catch (error) {
      console.error('❌ Intelligent chunking failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  createSingleChunk(repositoryData, files) {
    return {
      success: true,
      data: {
        chunks: [{
          id: 'single_chunk',
          name: 'Complete Repository',
          description: 'All repository files in a single chunk',
          files: files,
          priority: 'high',
          dependencies: [],
          chunk_type: 'mixed'
        }],
        chunkingStrategy: 'Single chunk (repository too small for chunking)',
        totalFiles: files.length,
        chunkCount: 1,
        estimatedProcessingTime: '30-60 seconds'
      },
      raw: 'Single chunk processing'
    };
  }

  createFallbackChunks(repositoryData, files) {
    console.log('🔄 Creating fallback chunks using rule-based strategy');
    
    const chunks = [];
    const chunkSize = Math.min(this.config.maxChunkSize, Math.ceil(files.length / this.config.maxChunks));
    
    // Group files by directory/type
    const fileGroups = this.groupFilesByType(files);
    
    let chunkId = 1;
    for (const [type, typeFiles] of Object.entries(fileGroups)) {
      // Split large groups into multiple chunks
      for (let i = 0; i < typeFiles.length; i += chunkSize) {
        const chunkFiles = typeFiles.slice(i, i + chunkSize);
        chunks.push({
          id: `chunk_${chunkId}`,
          name: `${type} (Part ${Math.floor(i / chunkSize) + 1})`,
          description: `Files from ${type} category`,
          files: chunkFiles,
          priority: this.getPriorityForType(type),
          dependencies: [],
          chunk_type: type.toLowerCase()
        });
        chunkId++;
      }
    }

    return {
      success: true,
      data: {
        chunks,
        chunkingStrategy: 'Fallback rule-based chunking',
        totalFiles: files.length,
        chunkCount: chunks.length,
        estimatedProcessingTime: `${chunks.length * 30}-${chunks.length * 60} seconds`
      },
      raw: 'Fallback chunking used'
    };
  }

  extractFilesFromTree(repoTree) {
    const lines = repoTree.split('\n');
    return lines
      .filter(line => line.startsWith('- '))
      .map(line => line.substring(2).trim())
      .filter(file => file.length > 0);
  }

  formatFileStructureForChunking(files) {
    // Group files by directory for better chunking
    const dirGroups = {};
    files.forEach(file => {
      const parts = file.split('/');
      const dir = parts.length > 1 ? parts[0] : 'root';
      if (!dirGroups[dir]) dirGroups[dir] = [];
      dirGroups[dir].push(file);
    });

    let structure = '';
    Object.entries(dirGroups).forEach(([dir, dirFiles]) => {
      structure += `\n${dir}/ (${dirFiles.length} files):\n`;
      dirFiles.slice(0, 20).forEach(file => structure += `  - ${file}\n`);
      if (dirFiles.length > 20) {
        structure += `  ... and ${dirFiles.length - 20} more files\n`;
      }
    });

    return structure;
  }

  groupFilesByType(files) {
    const groups = {
      'Frontend': [],
      'Backend': [],
      'Configuration': [],
      'Tests': [],
      'Documentation': [],
      'Utilities': [],
      'Other': []
    };

    files.forEach(file => {
      const ext = file.split('.').pop()?.toLowerCase();
      const filename = file.toLowerCase();
      const path = file.toLowerCase();

      if (path.includes('src/app') || path.includes('components') || ext === 'html' || ext === 'scss' || ext === 'css') {
        groups.Frontend.push(file);
      } else if (path.includes('src/') && (ext === 'ts' || ext === 'js' || ext === 'py' || ext === 'java')) {
        groups.Backend.push(file);
      } else if (filename.includes('test') || filename.includes('spec') || ext === 'test') {
        groups.Tests.push(file);
      } else if (filename.includes('readme') || filename.includes('doc') || ext === 'md') {
        groups.Documentation.push(file);
      } else if (filename.includes('config') || filename.includes('package') || filename.includes('yarn') || ext === 'json' || ext === 'yml' || ext === 'yaml') {
        groups.Configuration.push(file);
      } else if (path.includes('utils') || path.includes('helpers') || path.includes('common')) {
        groups.Utilities.push(file);
      } else {
        groups.Other.push(file);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }

  getPriorityForType(type) {
    const priorities = {
      'Frontend': 'high',
      'Backend': 'high',
      'Configuration': 'medium',
      'Tests': 'low',
      'Documentation': 'low',
      'Utilities': 'medium',
      'Other': 'low'
    };
    return priorities[type] || 'low';
  }

  validateAndCleanChunks(chunks, allFiles) {
    if (!Array.isArray(chunks)) {
      throw new Error('Invalid chunks format');
    }

    const fileSet = new Set(allFiles);
    const validatedChunks = [];

    chunks.forEach((chunk, index) => {
      if (!chunk.files || !Array.isArray(chunk.files)) {
        console.warn(`⚠️ Chunk ${index} has invalid files array, skipping`);
        return;
      }

      // Filter out non-existent files
      const validFiles = chunk.files.filter(file => fileSet.has(file));
      
      if (validFiles.length === 0) {
        console.warn(`⚠️ Chunk ${index} has no valid files, skipping`);
        return;
      }

      validatedChunks.push({
        id: chunk.id || `chunk_${index + 1}`,
        name: chunk.name || `Chunk ${index + 1}`,
        description: chunk.description || 'Generated chunk',
        files: validFiles,
        priority: chunk.priority || 'medium',
        dependencies: chunk.dependencies || [],
        chunk_type: chunk.chunk_type || 'mixed'
      });
    });

    return validatedChunks;
  }

  // Method to get chunking configuration
  getChunkingConfig() {
    return {
      maxChunkSize: this.config.maxChunkSize,
      maxChunks: this.config.maxChunks,
      minChunkSize: this.config.minChunkSize,
      model: this.config.model,
      temperature: this.config.temperature
    };
  }

  // Method to update chunking configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.chat = new ChatOllama({
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      temperature: this.config.temperature,
    });
  }
}

module.exports = CodebaseChunkingAgent;
