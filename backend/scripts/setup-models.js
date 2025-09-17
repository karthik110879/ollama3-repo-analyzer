#!/usr/bin/env node

/**
 * Model Setup Script for AI Repository Analyzer
 * 
 * This script helps you install and test the recommended Ollama models
 * for optimal codebase analysis and diagram generation.
 */

const { execSync } = require('child_process');
const { getAvailableModels, getModelConfig, getRecommendedModel } = require('../src/config/modelConfig');

class ModelSetup {
  constructor() {
    this.installedModels = [];
    this.availableModels = getAvailableModels('codeAnalysis');
  }

  /**
   * Check if Ollama is running
   */
  checkOllamaStatus() {
    try {
      execSync('ollama list', { stdio: 'pipe' });
      console.log('✅ Ollama is running');
      return true;
    } catch (error) {
      console.error('❌ Ollama is not running or not installed');
      console.error('Please install Ollama from https://ollama.com and start it');
      return false;
    }
  }

  /**
   * Get list of currently installed models
   */
  getInstalledModels() {
    try {
      const output = execSync('ollama list', { encoding: 'utf8' });
      const lines = output.split('\n').slice(1); // Skip header
      this.installedModels = lines
        .filter(line => line.trim())
        .map(line => line.split(/\s+/)[0])
        .filter(model => model);
      
      console.log(`📋 Found ${this.installedModels.length} installed models`);
      return this.installedModels;
    } catch (error) {
      console.error('❌ Failed to get installed models:', error.message);
      return [];
    }
  }

  /**
   * Install a model
   */
  async installModel(modelName) {
    try {
      console.log(`📥 Installing ${modelName}...`);
      execSync(`ollama pull ${modelName}`, { stdio: 'inherit' });
      console.log(`✅ Successfully installed ${modelName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to install ${modelName}:`, error.message);
      return false;
    }
  }

  /**
   * Test a model with a simple code analysis
   */
  async testModel(modelName) {
    try {
      console.log(`🧪 Testing ${modelName}...`);
      
      const testPrompt = `Analyze this simple code structure and return JSON:
      - src/
        - app.js
        - routes/
          - api.js
        - models/
          - user.js
      - package.json
      
      Return only JSON with architecture_pattern, tech_stack, and key_components.`;
      
      const command = `echo "${testPrompt}" | ollama run ${modelName}`;
      const output = execSync(command, { encoding: 'utf8', timeout: 30000 });
      
      // Check if output contains JSON
      if (output.includes('{') && output.includes('}')) {
        console.log(`✅ ${modelName} test passed`);
        return true;
      } else {
        console.log(`⚠️ ${modelName} test inconclusive - output may not be JSON`);
        return false;
      }
    } catch (error) {
      console.error(`❌ ${modelName} test failed:`, error.message);
      return false;
    }
  }

  /**
   * Show model recommendations based on system resources
   */
  showRecommendations() {
    console.log('\n🎯 Model Recommendations:');
    console.log('========================');
    
    const resourceLevels = ['low', 'medium', 'high'];
    
    resourceLevels.forEach(level => {
      const recommended = getRecommendedModel('codeAnalysis', level);
      const config = getModelConfig('codeAnalysis', recommended);
      
      console.log(`\n${level.toUpperCase()} RESOURCES (${config.resourceRequirements}):`);
      console.log(`  Model: ${recommended}`);
      console.log(`  Name: ${config.name}`);
      console.log(`  Description: ${config.description}`);
      console.log(`  Strengths: ${config.strengths.join(', ')}`);
    });
  }

  /**
   * Interactive model selection and installation
   */
  async interactiveSetup() {
    console.log('\n🚀 AI Repository Analyzer - Model Setup');
    console.log('=====================================\n');

    if (!this.checkOllamaStatus()) {
      return;
    }

    this.getInstalledModels();
    this.showRecommendations();

    console.log('\n📋 Available Code Analysis Models:');
    console.log('==================================');
    
    this.availableModels.forEach((model, index) => {
      const config = getModelConfig('codeAnalysis', model);
      const isInstalled = this.installedModels.includes(model);
      const status = isInstalled ? '✅ Installed' : '❌ Not installed';
      
      console.log(`${index + 1}. ${model} (${config.name})`);
      console.log(`   ${status} | ${config.resourceRequirements}`);
      console.log(`   ${config.description}`);
      console.log('');
    });

    // Check if any recommended models are installed
    const recommendedModels = ['codellama:13b-instruct', 'codellama:34b-instruct', 'deepseek-coder:6.7b-instruct'];
    const installedRecommended = recommendedModels.filter(model => this.installedModels.includes(model));
    
    if (installedRecommended.length > 0) {
      console.log('✅ You have recommended models installed!');
      console.log('Installed recommended models:', installedRecommended.join(', '));
    } else {
      console.log('⚠️ No recommended models installed. Consider installing one of the recommended models above.');
    }

    console.log('\n💡 To install a model, run:');
    console.log('   ollama pull <model-name>');
    console.log('\n💡 To test a model, run:');
    console.log('   ollama run <model-name>');
  }

  /**
   * Quick setup with automatic installation of recommended model
   */
  async quickSetup(resourceLevel = 'medium') {
    console.log('\n🚀 Quick Setup - Installing Recommended Model');
    console.log('============================================\n');

    if (!this.checkOllamaStatus()) {
      return;
    }

    const recommendedModel = getRecommendedModel('codeAnalysis', resourceLevel);
    const config = getModelConfig('codeAnalysis', recommendedModel);
    
    console.log(`🎯 Installing recommended model for ${resourceLevel} resources:`);
    console.log(`   Model: ${recommendedModel}`);
    console.log(`   Name: ${config.name}`);
    console.log(`   Requirements: ${config.resourceRequirements}\n`);

    const success = await this.installModel(recommendedModel);
    
    if (success) {
      console.log('\n🧪 Testing the installed model...');
      const testPassed = await this.testModel(recommendedModel);
      
      if (testPassed) {
        console.log('\n🎉 Setup completed successfully!');
        console.log(`Your Repository Analyzer Agent will now use ${recommendedModel}`);
      } else {
        console.log('\n⚠️ Setup completed but model test was inconclusive');
        console.log('The model is installed but may need manual testing');
      }
    } else {
      console.log('\n❌ Setup failed. Please check the error messages above.');
    }
  }
}

// Command line interface
async function main() {
  const setup = new ModelSetup();
  const args = process.argv.slice(2);
  
  if (args.includes('--quick') || args.includes('-q')) {
    const resourceLevel = args.find(arg => arg.startsWith('--resources='))?.split('=')[1] || 'medium';
    await setup.quickSetup(resourceLevel);
  } else {
    await setup.interactiveSetup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ModelSetup;
