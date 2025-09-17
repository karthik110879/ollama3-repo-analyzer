#!/usr/bin/env node

/**
 * Test script to verify CodeLlama integration with Repository Analyzer
 */

const RepositoryAnalyzerAgent = require('./src/agents/RepositoryAnalyzerAgent');
const { printConfig } = require('./src/config/modelConfig');

async function testCodeLlamaIntegration() {
  console.log('🧪 Testing CodeLlama Integration with Repository Analyzer');
  console.log('============================================================\n');

  try {
    // Print current configuration
    printConfig();
    console.log('\n');

    // Initialize the analyzer (will use environment variables)
    const analyzer = new RepositoryAnalyzerAgent();

    console.log('✅ Repository Analyzer Agent initialized successfully');
    console.log(`📊 Using model: ${analyzer.config.model}`);
    console.log(`🌡️ Temperature: ${analyzer.config.temperature}\n`);

    // Create a test repository structure
    const testRepositoryData = {
      repoName: 'test-ai-repo-analyzer',
      branchName: 'main',
      repoTree: `- src/
  - agents/
    - AgentOrchestrator.js
    - RepositoryAnalyzerAgent.js
    - MermaidDiagramBuilderAgent.js
    - CodebaseChunkingAgent.js
    - ParallelAnalysisCoordinator.js
    - ResultsAggregator.js
  - config/
    - modelConfig.js
  - routes/
    - analyze.js
    - repos.js
  - index.js
- package.json
- README.md
- .env.example`
    };

    console.log('🔍 Testing repository analysis...');
    console.log('Repository structure:');
    console.log(testRepositoryData.repoTree);
    console.log('\n⏳ Running analysis (this may take 30-60 seconds)...\n');

    const startTime = Date.now();
    const result = await analyzer.analyze(testRepositoryData);
    const duration = Date.now() - startTime;

    console.log(`⏱️ Analysis completed in ${duration}ms\n`);

    if (result.success) {
      console.log('✅ Analysis successful!');
      console.log('\n📊 Analysis Results:');
      console.log('===================');
      console.log(`Architecture Pattern: ${result.data.architecture_pattern}`);
      console.log(`Tech Stack: ${Array.isArray(result.data.tech_stack) ? result.data.tech_stack.join(', ') : result.data.tech_stack}`);
      console.log(`Key Components: ${result.data.key_components?.length || 0} identified`);
      
      if (result.data.insights && result.data.insights.length > 0) {
        console.log('\n💡 Key Insights:');
        result.data.insights.slice(0, 3).forEach((insight, index) => {
          console.log(`   ${index + 1}. ${insight}`);
        });
      }

      console.log('\n🎯 CodeLlama Integration Test: PASSED ✅');
      console.log('Your repository analyzer is now using the configured model!');
      
    } else {
      console.log('❌ Analysis failed');
      console.log('Error:', result.error);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Make sure Ollama is running: ollama serve');
      console.log('2. Verify the model is installed: ollama list');
      console.log('3. Check your .env file for correct model configuration');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure Ollama is running: ollama serve');
    console.log('2. Verify the model is installed: ollama list');
    console.log('3. Check your .env file for correct model configuration');
  }
}

// Run the test
if (require.main === module) {
  testCodeLlamaIntegration().catch(console.error);
}

module.exports = testCodeLlamaIntegration;