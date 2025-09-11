#!/usr/bin/env node

/**
 * Test script for the enhanced repository analysis system
 * Run with: node test-enhanced-analysis.js
 */

const AgentOrchestrator = require('./src/agents/AgentOrchestrator');
require('dotenv').config();

// Test with a complex repository simulation
const createComplexRepositoryData = (fileCount = 500) => {
  const files = [];
  const directories = [
    'src/app/components', 'src/app/services', 'src/app/models', 'src/app/controllers',
    'src/app/middleware', 'src/app/routes', 'src/app/utils', 'src/app/config',
    'src/app/tests', 'src/app/docs', 'src/shared/components', 'src/shared/utils',
    'src/shared/types', 'src/shared/hooks', 'src/api/endpoints', 'src/api/middleware',
    'src/api/validation', 'src/database/migrations', 'src/database/models',
    'src/database/seeders', 'src/infrastructure/docker', 'src/infrastructure/k8s',
    'src/infrastructure/ci', 'src/monitoring/logs', 'src/monitoring/metrics',
    'src/security/auth', 'src/security/encryption', 'src/performance/cache',
    'src/performance/optimization', 'src/external/apis', 'src/external/webhooks'
  ];
  
  const extensions = ['ts', 'tsx', 'js', 'jsx', 'scss', 'css', 'html', 'json', 'md', 'yml', 'yaml', 'sql', 'dockerfile'];
  
  for (let i = 0; i < fileCount; i++) {
    const dir = directories[Math.floor(Math.random() * directories.length)];
    const ext = extensions[Math.floor(Math.random() * extensions.length)];
    const fileName = `file_${i + 1}.${ext}`;
    files.push(`${dir}/${fileName}`);
  }
  
  return {
    repoName: 'test/complex-enterprise-app',
    branchName: 'main',
    repoTree: `Repository: test/complex-enterprise-app
Default branch: main
Files (${fileCount}):
${files.map(f => `- ${f}`).join('\n')}`
  };
};

async function testEnhancedAnalysis() {
  console.log('🧪 Testing Enhanced Repository Analysis System\n');
  
  // Initialize the orchestrator with enhanced analysis
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

  console.log('📊 Enhanced Agent Configuration:');
  console.log(JSON.stringify(orchestrator.getAgentStatus(), null, 2));
  console.log('');

  // Test 1: Complex repository (should use chunking)
  console.log('🔬 Test 1: Complex Enterprise Repository (Enhanced Analysis)');
  console.log('='.repeat(70));
  
  const complexRepoData = createComplexRepositoryData(800);
  console.log(`📁 Testing with ${orchestrator.countFilesInRepository(complexRepoData.repoTree)} files`);
  
  try {
    const startTime = Date.now();
    const complexResult = await orchestrator.analyzeRepository(complexRepoData);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Complex repo analysis completed in ${duration}ms`);
    console.log(`📊 Analysis method: ${complexResult.metadata?.analysisMethod || 'unknown'}`);
    console.log(`✅ Success: ${complexResult.success}`);
    
    if (complexResult.success) {
      console.log(`\n🏗️  Enhanced Architecture Analysis:`);
      console.log(`   Pattern: ${complexResult.data.architecture}`);
      console.log(`   Tech Stack: ${complexResult.data.techStack.join(', ')}`);
      console.log(`   Components: ${complexResult.data.keyComponents?.length || 0} identified`);
      console.log(`   Architectural Layers: ${complexResult.data.architecturalLayers?.length || 0} identified`);
      console.log(`   Data Flows: ${complexResult.data.dataFlow?.length || 0} identified`);
      console.log(`   Dependencies: ${complexResult.data.dependencies?.length || 0} identified`);
      console.log(`   Insights: ${complexResult.data.insights?.length || 0} generated`);
      console.log(`   Recommendations: ${complexResult.data.recommendations?.length || 0} provided`);
      
      if (complexResult.data.keyComponents && complexResult.data.keyComponents.length > 0) {
        console.log(`\n🧩 Key Components Details:`);
        complexResult.data.keyComponents.slice(0, 5).forEach((comp, index) => {
          console.log(`   ${index + 1}. ${comp.name} (${comp.type})`);
          console.log(`      Technologies: ${comp.technologies?.join(', ') || 'Unknown'}`);
          console.log(`      Description: ${comp.description || 'No description'}`);
          if (comp.files && comp.files.length > 0) {
            console.log(`      Key Files: ${comp.files.slice(0, 3).join(', ')}`);
          }
          if (comp.dependencies && comp.dependencies.length > 0) {
            console.log(`      Dependencies: ${comp.dependencies.join(', ')}`);
          }
        });
      }
      
      if (complexResult.data.architecturalLayers && complexResult.data.architecturalLayers.length > 0) {
        console.log(`\n🏛️  Architectural Layers:`);
        complexResult.data.architecturalLayers.forEach((layer, index) => {
          console.log(`   ${index + 1}. ${layer.name}`);
          console.log(`      Description: ${layer.description || 'No description'}`);
          console.log(`      Components: ${layer.components?.join(', ') || 'None'}`);
          console.log(`      Technologies: ${layer.technologies?.join(', ') || 'None'}`);
        });
      }
      
      if (complexResult.data.dataFlow && complexResult.data.dataFlow.length > 0) {
        console.log(`\n🌊 Data Flow Analysis:`);
        complexResult.data.dataFlow.slice(0, 5).forEach((flow, index) => {
          console.log(`   ${index + 1}. ${flow.from} --[${flow.type}]--> ${flow.to}`);
          console.log(`      Description: ${flow.description || 'No description'}`);
          if (flow.protocol) {
            console.log(`      Protocol: ${flow.protocol}`);
          }
        });
      }
      
      if (complexResult.data.codeQualityIndicators) {
        console.log(`\n📊 Code Quality Indicators:`);
        console.log(`   Modularity: ${complexResult.data.codeQualityIndicators.modularity || 'Not analyzed'}`);
        console.log(`   Coupling: ${complexResult.data.codeQualityIndicators.coupling || 'Not analyzed'}`);
        console.log(`   Reusability: ${complexResult.data.codeQualityIndicators.reusability || 'Not analyzed'}`);
        console.log(`   Testability: ${complexResult.data.codeQualityIndicators.testability || 'Not analyzed'}`);
      }
      
      if (complexResult.data.recommendations && complexResult.data.recommendations.length > 0) {
        console.log(`\n💡 Recommendations:`);
        complexResult.data.recommendations.slice(0, 5).forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
      
      console.log(`\n🎨 Mermaid Diagram Preview:`);
      console.log(`   Diagram Length: ${complexResult.data.mermaid?.length || 0} characters`);
      console.log(`   Contains Subgraphs: ${complexResult.data.mermaid?.includes('subgraph') ? 'Yes' : 'No'}`);
      console.log(`   Node Count: ${(complexResult.data.mermaid?.match(/\[[^\]]*\]/g) || []).length} nodes`);
      console.log(`   Relationship Count: ${(complexResult.data.mermaid?.match(/-->/g) || []).length} relationships`);
      
      if (complexResult.metadata?.analysisMethod === 'chunked') {
        console.log(`\n🔪 Chunking Analysis:`);
        console.log(`   Chunking Strategy: ${complexResult.metadata.chunkingStrategy}`);
        console.log(`   Total Chunks: ${complexResult.metadata.totalChunks}`);
        console.log(`   Processed Chunks: ${complexResult.metadata.processedChunks}`);
        console.log(`   Failed Chunks: ${complexResult.metadata.failedChunks}`);
        console.log(`   Parallel Processing Time: ${complexResult.metadata.parallelProcessingTime}ms`);
        console.log(`   Aggregation Method: ${complexResult.metadata.aggregationMethod}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Complex repo test failed:', error.message);
  }

  console.log('\n🎉 Enhanced analysis system test completed!');
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

// Main execution
async function main() {
  console.log('🔍 Enhanced Repository Analysis Test\n');
  
  const ollamaAvailable = await checkOllamaAvailability();
  if (!ollamaAvailable) {
    process.exit(1);
  }
  
  console.log('');
  await testEnhancedAnalysis();
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testEnhancedAnalysis, checkOllamaAvailability };
