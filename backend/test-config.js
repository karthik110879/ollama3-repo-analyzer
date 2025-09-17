#!/usr/bin/env node

/**
 * Simple test to verify the new model configuration is working
 */

const { getModelConfig, printConfig } = require('./src/config/modelConfig');

console.log('🧪 Testing New Model Configuration');
console.log('==================================\n');

try {
  // Test getting analyzer config
  const analyzerConfig = getModelConfig('analyzer');
  console.log('✅ Analyzer Config:');
  console.log(`   Model: ${analyzerConfig.model}`);
  console.log(`   Temperature: ${analyzerConfig.temperature}`);
  console.log(`   Purpose: ${analyzerConfig.purpose}\n`);

  // Test getting all configs
  console.log('✅ All Configurations:');
  printConfig();

  console.log('\n🎯 Configuration Test: PASSED ✅');
  console.log('The new model configuration system is working correctly!');

} catch (error) {
  console.error('❌ Configuration Test Failed:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Make sure you have a .env file with the correct variables');
  console.log('2. Check that the modelConfig.js file is correct');
  console.log('3. Restart your server after making changes');
}
