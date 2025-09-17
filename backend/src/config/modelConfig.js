/**
 * Model Configuration Reader for AI Repository Analyzer
 * 
 * This file reads model configurations from environment variables
 * and provides a simple interface for agents to get their model settings.
 */

require('dotenv').config();

/**
 * Get model configuration for a specific agent type
 * @param {string} agentType - The agent type (analyzer, diagram, chunking, aggregator)
 * @returns {Object} Model configuration object
 */
function getModelConfig(agentType) {
  const configs = {
    analyzer: {
      model: process.env.OLLAMA_ANALYZER_MODEL || 'codellama:13b',
      temperature: parseFloat(process.env.OLLAMA_ANALYZER_TEMPERATURE) || 0.1,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      purpose: 'Code Analysis',
      description: 'Deep architectural analysis and code understanding'
    },
    diagram: {
      model: process.env.OLLAMA_DIAGRAM_MODEL || 'llama3',
      temperature: parseFloat(process.env.OLLAMA_DIAGRAM_TEMPERATURE) || 0.3,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      purpose: 'Diagram Generation',
      description: 'Creative Mermaid diagram generation'
    },
    chunking: {
      model: process.env.OLLAMA_CHUNKING_MODEL || 'llama3',
      temperature: parseFloat(process.env.OLLAMA_CHUNKING_TEMPERATURE) || 0.1,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      purpose: 'Repository Chunking',
      description: 'Large repository chunking and processing'
    },
    aggregator: {
      model: process.env.OLLAMA_AGGREGATOR_MODEL || 'llama3',
      temperature: parseFloat(process.env.OLLAMA_AGGREGATOR_TEMPERATURE) || 0.2,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      purpose: 'Results Aggregation',
      description: 'Combining and synthesizing chunk results'
    }
  };

  if (!configs[agentType]) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  return configs[agentType];
}

/**
 * Get all agent configurations
 * @returns {Object} All agent configurations
 */
function getAllConfigs() {
  return {
    analyzer: getModelConfig('analyzer'),
    diagram: getModelConfig('diagram'),
    chunking: getModelConfig('chunking'),
    aggregator: getModelConfig('aggregator')
  };
}

/**
 * Get model name for a specific agent
 * @param {string} agentType - The agent type
 * @returns {string} Model name
 */
function getModelName(agentType) {
  return getModelConfig(agentType).model;
}

/**
 * Get temperature for a specific agent
 * @param {string} agentType - The agent type
 * @returns {number} Temperature value
 */
function getTemperature(agentType) {
  return getModelConfig(agentType).temperature;
}

/**
 * Get base URL for Ollama
 * @returns {string} Base URL
 */
function getBaseUrl() {
  return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
}

/**
 * Print current configuration (useful for debugging)
 */
function printConfig() {
  console.log('🔧 Current Model Configuration:');
  console.log('================================');
  
  const configs = getAllConfigs();
  Object.entries(configs).forEach(([agentType, config]) => {
    console.log(`\n${agentType.toUpperCase()}:`);
    console.log(`  Model: ${config.model}`);
    console.log(`  Temperature: ${config.temperature}`);
    console.log(`  Purpose: ${config.purpose}`);
    console.log(`  Description: ${config.description}`);
  });
}

module.exports = {
  getModelConfig,
  getAllConfigs,
  getModelName,
  getTemperature,
  getBaseUrl,
  printConfig
};