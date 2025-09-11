#!/usr/bin/env node

/**
 * Test script for the multi-agent repository analysis system
 * Run with: node test-multi-agent.js
 */

const AgentOrchestrator = require('./src/agents/AgentOrchestrator');
require('dotenv').config();

// Test repository data
const testRepositoryData = {
  repoName: 'test/angular-realworld-example-app',
  branchName: 'main',
  repoTree: `Repository: test/angular-realworld-example-app
Default branch: main
Files (45):
- README.md
- angular.json
- package.json
- src/app/app.component.html
- src/app/app.component.scss
- src/app/app.component.ts
- src/app/app.module.ts
- src/app/app.routing.ts
- src/app/auth/auth.guard.ts
- src/app/auth/auth.service.ts
- src/app/auth/login/login.component.html
- src/app/auth/login/login.component.scss
- src/app/auth/login/login.component.ts
- src/app/auth/register/register.component.html
- src/app/auth/register/register.component.scss
- src/app/auth/register/register.component.ts
- src/app/editor/editor.component.html
- src/app/editor/editor.component.scss
- src/app/editor/editor.component.ts
- src/app/home/home.component.html
- src/app/home/home.component.scss
- src/app/home/home.component.ts
- src/app/home/home.resolver.ts
- src/app/layout/footer/footer.component.html
- src/app/layout/footer/footer.component.scss
- src/app/layout/footer/footer.component.ts
- src/app/layout/header/header.component.html
- src/app/layout/header/header.component.scss
- src/app/layout/header/header.component.ts
- src/app/profile/profile.component.html
- src/app/profile/profile.component.html
- src/app/profile/profile.component.scss
- src/app/profile/profile.component.ts
- src/app/profile/profile.resolver.ts
- src/app/settings/settings.component.html
- src/app/settings/settings.component.scss
- src/app/settings/settings.component.ts
- src/app/shared/article/article.component.html
- src/app/shared/article/article.component.scss
- src/app/shared/article/article.component.ts
- src/app/shared/article-list/article-list.component.html
- src/app/shared/article-list/article-list.component.scss
- src/app/shared/article-list/article-list.component.ts
- src/app/shared/favorite/favorite.component.html
- src/app/shared/favorite/favorite.component.scss
- src/app/shared/favorite/favorite.component.ts
- src/app/shared/follow/follow.component.html
- src/app/shared/follow/follow.component.scss
- src/app/shared/follow/follow.component.ts`
};

async function testMultiAgentSystem() {
  console.log('🧪 Testing Multi-Agent Repository Analysis System\n');
  
  // Initialize the orchestrator
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
    }
  });

  console.log('📊 Agent Configuration:');
  console.log(JSON.stringify(orchestrator.getAgentStatus(), null, 2));
  console.log('');

  try {
    console.log('🚀 Starting analysis...');
    const startTime = Date.now();
    
    const result = await orchestrator.analyzeRepository(testRepositoryData);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Analysis completed in ${duration}ms\n`);

    if (result.success) {
      console.log('✅ Analysis Results:');
      console.log('==================');
      
      console.log('\n🏗️  Architecture Pattern:', result.data.architecture);
      console.log('\n🛠️  Technology Stack:', result.data.techStack.join(', '));
      
      console.log('\n💡 Key Insights:');
      result.data.insights.forEach((insight, index) => {
        console.log(`   ${index + 1}. ${insight}`);
      });
      
      console.log('\n🧩 Key Components:');
      result.data.keyComponents.forEach((comp, index) => {
        console.log(`   ${index + 1}. ${comp.name} (${comp.type})`);
        console.log(`      Technologies: ${comp.technologies.join(', ')}`);
        console.log(`      Description: ${comp.description}`);
      });
      
      console.log('\n🔗 Dependencies:');
      if (result.data.dependencies.length > 0) {
        result.data.dependencies.forEach((dep, index) => {
          console.log(`   ${index + 1}. ${dep.from} --[${dep.type}]--> ${dep.to}`);
        });
      } else {
        console.log('   No dependencies identified');
      }
      
      console.log('\n📁 File Structure Analysis:');
      console.log(`   Main Directories: ${result.data.fileStructureAnalysis.main_directories?.join(', ') || 'N/A'}`);
      console.log(`   Config Files: ${result.data.fileStructureAnalysis.configuration_files?.join(', ') || 'N/A'}`);
      
      console.log('\n📈 Scalability Notes:');
      console.log(`   ${result.data.scalabilityNotes || 'No notes available'}`);
      
      console.log('\n🔒 Security Considerations:');
      console.log(`   ${result.data.securityConsiderations || 'No notes available'}`);
      
      console.log('\n🎨 Mermaid Diagram:');
      console.log('```mermaid');
      console.log(result.data.mermaid);
      console.log('```');
      
      console.log('\n📊 Metadata:');
      console.log(JSON.stringify(result.metadata, null, 2));
      
    } else {
      console.log('❌ Analysis Failed:');
      console.log('Error:', result.error);
      console.log('Message:', result.message);
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
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
  console.log('🔍 Multi-Agent Repository Analysis Test\n');
  
  const ollamaAvailable = await checkOllamaAvailability();
  if (!ollamaAvailable) {
    process.exit(1);
  }
  
  console.log('');
  await testMultiAgentSystem();
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testMultiAgentSystem, checkOllamaAvailability };
