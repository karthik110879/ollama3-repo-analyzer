#!/usr/bin/env node

/**
 * Test script for the chunking-based repository analysis system
 * Run with: node test-chunking-system.js
 */

const AgentOrchestrator = require('./src/agents/AgentOrchestrator');
require('dotenv').config();

// Test with a large repository simulation
const createLargeRepositoryData = (fileCount = 1000) => {
  const files = [];
  const directories = ['src/app', 'src/components', 'src/services', 'src/utils', 'src/types', 'tests', 'docs', 'config'];
  const extensions = ['ts', 'tsx', 'js', 'jsx', 'scss', 'css', 'html', 'json', 'md', 'yml', 'yaml'];
  
  for (let i = 0; i < fileCount; i++) {
    const dir = directories[Math.floor(Math.random() * directories.length)];
    const ext = extensions[Math.floor(Math.random() * extensions.length)];
    const fileName = `file_${i + 1}.${ext}`;
    files.push(`${dir}/${fileName}`);
  }
  
  return {
    repoName: 'test/large-repository',
    branchName: 'main',
    repoTree: `Repository: test/large-repository
Default branch: main
Files (${fileCount}):
${files.map(f => `- ${f}`).join('\n')}`
  };
};

async function testChunkingSystem() {
  console.log('🧪 Testing Chunking-Based Repository Analysis System\n');
  
  // Initialize the orchestrator with chunking enabled
  const orchestrator = new AgentOrchestrator({
    analyzerConfig: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_ANALYZER_MODEL || 'llama3',
      temperature: parseFloat(process.env.OLLAMA_ANALYZER_TEMPERATURE) || 0.1
    },
    diagramBuilderConfig: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_DIAGRAM_MODEL || 'llama3',
      temperature: parseFloat(process.env.OLLAMA_DIAGRAM_TEMPERATURE) || 0.3
    },
    chunkingConfig: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_CHUNKING_MODEL || 'llama3',
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
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_AGGREGATOR_MODEL || 'llama3',
      temperature: parseFloat(process.env.OLLAMA_AGGREGATOR_TEMPERATURE) || 0.2
    },
    chunkingThreshold: parseInt(process.env.CHUNKING_THRESHOLD) || 500,
    enableChunking: true
  });

  console.log('📊 Agent Configuration:');
  console.log(JSON.stringify(orchestrator.getAgentStatus(), null, 2));
  console.log('');

  // Test 1: Small repository (should use single-chunk processing)
  console.log('🔬 Test 1: Small Repository (Single-Chunk Processing)');
  console.log('='.repeat(60));
  
  const smallRepoData = createLargeRepositoryData(100);
  console.log(`📁 Testing with ${orchestrator.countFilesInRepository(smallRepoData.repoTree)} files`);
  
  try {
    const startTime = Date.now();
    const smallResult = await orchestrator.analyzeRepository(smallRepoData);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Small repo analysis completed in ${duration}ms`);
    console.log(`📊 Analysis method: ${smallResult.metadata?.analysisMethod || 'unknown'}`);
    console.log(`✅ Success: ${smallResult.success}`);
    
    if (smallResult.success) {
      console.log(`🏗️  Architecture: ${smallResult.data.architecture}`);
      console.log(`🛠️  Tech Stack: ${smallResult.data.techStack.join(', ')}`);
      console.log(`💡 Insights: ${smallResult.data.insights.length} insights found`);
    }
    
  } catch (error) {
    console.error('❌ Small repo test failed:', error.message);
  }

  console.log('\n');

  // Test 2: Large repository (should use chunking)
  console.log('🔬 Test 2: Large Repository (Chunking Processing)');
  console.log('='.repeat(60));
  
  const largeRepoData = createLargeRepositoryData(800);
  console.log(`📁 Testing with ${orchestrator.countFilesInRepository(largeRepoData.repoTree)} files`);
  
  try {
    const startTime = Date.now();
    const largeResult = await orchestrator.analyzeRepository(largeRepoData);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Large repo analysis completed in ${duration}ms`);
    console.log(`📊 Analysis method: ${largeResult.metadata?.analysisMethod || 'unknown'}`);
    console.log(`✅ Success: ${largeResult.success}`);
    
    if (largeResult.success) {
      console.log(`🏗️  Architecture: ${largeResult.data.architecture}`);
      console.log(`🛠️  Tech Stack: ${largeResult.data.techStack.join(', ')}`);
      console.log(`💡 Insights: ${largeResult.data.insights.length} insights found`);
      
      if (largeResult.metadata?.analysisMethod === 'chunked') {
        console.log(`🔪 Chunking strategy: ${largeResult.metadata.chunkingStrategy}`);
        console.log(`📦 Total chunks: ${largeResult.metadata.totalChunks}`);
        console.log(`✅ Processed chunks: ${largeResult.metadata.processedChunks}`);
        console.log(`❌ Failed chunks: ${largeResult.metadata.failedChunks}`);
        console.log(`⚡ Parallel processing time: ${largeResult.metadata.parallelProcessingTime}ms`);
        console.log(`🔗 Aggregation method: ${largeResult.metadata.aggregationMethod}`);
        
        if (largeResult.data.chunkAnalysisSummary) {
          console.log(`📊 Chunk analysis summary:`);
          console.log(`   - Total chunks: ${largeResult.data.chunkAnalysisSummary.total_chunks}`);
          console.log(`   - Successful chunks: ${largeResult.data.chunkAnalysisSummary.successful_chunks}`);
          console.log(`   - Failed chunks: ${largeResult.data.chunkAnalysisSummary.failed_chunks}`);
          console.log(`   - Chunk types: ${JSON.stringify(largeResult.data.chunkAnalysisSummary.chunk_types)}`);
          console.log(`   - Processing time: ${largeResult.data.chunkAnalysisSummary.processing_time}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Large repo test failed:', error.message);
  }

  console.log('\n');

  // Test 3: Very large repository (stress test)
  console.log('🔬 Test 3: Very Large Repository (Stress Test)');
  console.log('='.repeat(60));
  
  const veryLargeRepoData = createLargeRepositoryData(1500);
  console.log(`📁 Testing with ${orchestrator.countFilesInRepository(veryLargeRepoData.repoTree)} files`);
  
  try {
    const startTime = Date.now();
    const veryLargeResult = await orchestrator.analyzeRepository(veryLargeRepoData);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Very large repo analysis completed in ${duration}ms`);
    console.log(`📊 Analysis method: ${veryLargeResult.metadata?.analysisMethod || 'unknown'}`);
    console.log(`✅ Success: ${veryLargeResult.success}`);
    
    if (veryLargeResult.success && veryLargeResult.metadata?.analysisMethod === 'chunked') {
      console.log(`🔪 Chunking strategy: ${veryLargeResult.metadata.chunkingStrategy}`);
      console.log(`📦 Total chunks: ${veryLargeResult.metadata.totalChunks}`);
      console.log(`✅ Processed chunks: ${veryLargeResult.metadata.processedChunks}`);
      console.log(`❌ Failed chunks: ${veryLargeResult.metadata.failedChunks}`);
      console.log(`⚡ Parallel processing time: ${veryLargeResult.metadata.parallelProcessingTime}ms`);
      
      const successRate = (veryLargeResult.metadata.processedChunks / veryLargeResult.metadata.totalChunks) * 100;
      console.log(`📈 Success rate: ${successRate.toFixed(1)}%`);
    }
    
  } catch (error) {
    console.error('❌ Very large repo test failed:', error.message);
  }

  console.log('\n🎉 Chunking system tests completed!');
}

// Check if Ollama is available
async function checkOllamaAvailability() {
  try {
    const response = await fetch(process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama is running');
      console.log('Available models:', data.models?.map(m => m.name).join(', ') || 'None');
      return true;
    }
  } catch (error) {
    console.log('❌ Ollama is not running or not accessible');
    console.log('Please start Ollama and ensure it\'s running on', process.env.OLLAMA_BASE_URL || 'http://localhost:11434');
    return false;
  }
}

// Performance comparison function
async function performanceComparison() {
  console.log('\n📊 Performance Comparison: Single-Chunk vs Chunking');
  console.log('='.repeat(60));
  
  const orchestrator = new AgentOrchestrator({
    analyzerConfig: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_ANALYZER_MODEL || 'llama3',
      temperature: 0.1
    },
    diagramBuilderConfig: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_DIAGRAM_MODEL || 'llama3',
      temperature: 0.3
    },
    chunkingThreshold: 500,
    enableChunking: true
  });

  const testRepoData = createLargeRepositoryData(600);
  console.log(`📁 Testing with ${orchestrator.countFilesInRepository(testRepoData.repoTree)} files`);

  // Test with chunking enabled
  console.log('\n🔪 Testing with chunking enabled...');
  const chunkingStart = Date.now();
  const chunkingResult = await orchestrator.analyzeRepository(testRepoData);
  const chunkingDuration = Date.now() - chunkingStart;
  
  console.log(`⏱️  Chunking analysis: ${chunkingDuration}ms`);
  console.log(`📊 Method: ${chunkingResult.metadata?.analysisMethod}`);
  console.log(`✅ Success: ${chunkingResult.success}`);

  // Test with chunking disabled
  console.log('\n📦 Testing with chunking disabled...');
  const singleChunkOrchestrator = new AgentOrchestrator({
    ...orchestrator.config,
    enableChunking: false
  });
  
  const singleStart = Date.now();
  const singleResult = await singleChunkOrchestrator.analyzeRepository(testRepoData);
  const singleDuration = Date.now() - singleStart;
  
  console.log(`⏱️  Single-chunk analysis: ${singleDuration}ms`);
  console.log(`📊 Method: ${singleResult.metadata?.analysisMethod}`);
  console.log(`✅ Success: ${singleResult.success}`);

  // Performance comparison
  console.log('\n📈 Performance Summary:');
  console.log(`   Chunking: ${chunkingDuration}ms`);
  console.log(`   Single-chunk: ${singleDuration}ms`);
  console.log(`   Speedup: ${(singleDuration / chunkingDuration).toFixed(2)}x`);
  console.log(`   Time saved: ${singleDuration - chunkingDuration}ms`);
}

// Main execution
async function main() {
  console.log('🔍 Chunking-Based Repository Analysis Test\n');
  
  const ollamaAvailable = await checkOllamaAvailability();
  if (!ollamaAvailable) {
    process.exit(1);
  }
  
  console.log('');
  await testChunkingSystem();
  
  // Uncomment to run performance comparison
  // await performanceComparison();
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testChunkingSystem, performanceComparison, checkOllamaAvailability };
