# Multi-Agent Repository Analysis System

This document describes the new multi-agent architecture for repository analysis, which separates concerns between code analysis and diagram generation for improved quality and maintainability.

## Architecture Overview

The system consists of three main components:

### 1. Repository Analyzer Agent (`RepositoryAnalyzerAgent.js`)
- **Purpose**: Deep analysis of repository structure and architecture
- **Responsibilities**:
  - Analyze file structure and patterns
  - Identify architectural patterns (MVC, Microservices, etc.)
  - Extract technology stack
  - Generate architectural insights
  - Create structured analysis data

### 2. Mermaid Diagram Builder Agent (`MermaidDiagramBuilderAgent.js`)
- **Purpose**: Specialized Mermaid diagram creation
- **Responsibilities**:
  - Takes structured analysis data as input
  - Creates clean, valid Mermaid diagrams
  - Focuses purely on diagram syntax and aesthetics
  - Optimizes diagram layout and readability

### 3. Agent Orchestrator (`AgentOrchestrator.js`)
- **Purpose**: Coordinates the workflow between agents
- **Responsibilities**:
  - Manages the pipeline between agents
  - Handles error recovery and fallbacks
  - Combines outputs from both agents
  - Manages different model configurations

## Configuration

### Environment Variables

```bash
# Ollama Base URL
OLLAMA_BASE_URL=http://localhost:11434

# Repository Analyzer Agent
OLLAMA_ANALYZER_MODEL=llama3
OLLAMA_ANALYZER_TEMPERATURE=0.1

# Mermaid Diagram Builder Agent
OLLAMA_DIAGRAM_MODEL=llama3
OLLAMA_DIAGRAM_TEMPERATURE=0.3

# Fallback model
OLLAMA_MODEL=llama3
```

### Agent-Specific Configuration

Each agent can be configured independently:

```javascript
const orchestrator = new AgentOrchestrator({
  analyzerConfig: {
    baseUrl: 'http://localhost:11434',
    model: 'llama3',
    temperature: 0.1  // Low for consistent analysis
  },
  diagramBuilderConfig: {
    baseUrl: 'http://localhost:11434',
    model: 'llama3',
    temperature: 0.3  // Higher for creative diagramming
  }
});
```

## Usage

### Basic Usage

```javascript
const AgentOrchestrator = require('./src/agents/AgentOrchestrator');

const orchestrator = new AgentOrchestrator();

const repositoryData = {
  repoName: 'owner/repo',
  branchName: 'main',
  repoTree: 'file1\nfile2\n...'
};

const result = await orchestrator.analyzeRepository(repositoryData);
```

### Response Structure

```javascript
{
  success: true,
  data: {
    architecture: "MVC Pattern",
    techStack: ["Angular", "TypeScript", "Node.js"],
    insights: ["Key insight 1", "Key insight 2"],
    keyComponents: [
      {
        name: "Frontend",
        type: "UI Layer",
        technologies: ["Angular", "TypeScript"],
        description: "User interface components"
      }
    ],
    dependencies: [
      {
        from: "Frontend",
        to: "Backend",
        type: "API calls"
      }
    ],
    fileStructureAnalysis: {
      main_directories: ["src", "public"],
      configuration_files: ["package.json", "angular.json"],
      test_structure: "Unit tests in src/app",
      documentation_presence: "Good documentation"
    },
    scalabilityNotes: "Architecture supports horizontal scaling",
    securityConsiderations: "Authentication implemented",
    mermaid: "graph TD\n  A[Frontend] --> B[Backend]",
    raw: {
      analysis: "Raw analysis response",
      diagram: "Raw diagram response"
    }
  },
  metadata: {
    analysisDuration: 2500,
    analyzerSuccess: true,
    diagramBuilderSuccess: true,
    timestamp: "2024-01-01T00:00:00.000Z"
  }
}
```

## Testing

Run the test script to verify the multi-agent system:

```bash
# Make sure Ollama is running
ollama serve

# Run the test
node test-multi-agent.js
```

## Benefits of Multi-Agent Architecture

### 1. **Separation of Concerns**
- Analysis logic is separate from diagram generation
- Each agent can be optimized for its specific task
- Easier to maintain and debug

### 2. **Improved Quality**
- Repository Analyzer focuses on deep architectural analysis
- Diagram Builder specializes in clean, valid Mermaid syntax
- Each agent can use different models/temperatures

### 3. **Better Error Handling**
- Fallback mechanisms for each agent
- Graceful degradation when one agent fails
- Detailed error reporting and recovery

### 4. **Scalability**
- Agents can be run on different models
- Easy to add new specialized agents
- Independent configuration and optimization

### 5. **Maintainability**
- Clear separation of responsibilities
- Easier to test individual components
- Modular architecture allows for easy updates

## Error Handling

The system includes comprehensive error handling:

1. **Agent Failure Recovery**: If one agent fails, the system uses fallback data
2. **JSON Parsing Errors**: Fallback analysis structures are provided
3. **Mermaid Syntax Validation**: Invalid diagrams are replaced with fallback versions
4. **Model Availability**: Graceful handling when models are unavailable

## Monitoring

The system provides detailed metadata for monitoring:

- Analysis duration
- Individual agent success/failure status
- Timestamps and performance metrics
- Error details and fallback usage

## Future Enhancements

Potential improvements to the multi-agent system:

1. **Additional Specialized Agents**:
   - Security Analysis Agent
   - Performance Analysis Agent
   - Documentation Analysis Agent

2. **Advanced Orchestration**:
   - Parallel agent execution
   - Agent result validation
   - Dynamic agent selection

3. **Enhanced Configuration**:
   - Runtime agent configuration updates
   - A/B testing of different models
   - Performance-based agent selection

## Migration from Single-Agent System

The new multi-agent system is backward compatible with the existing API. The response structure has been enhanced with additional fields, but existing clients will continue to work with the core fields:

- `mermaid`: Mermaid diagram
- `insights`: Key insights
- `techStack`: Technology stack
- `architecture`: Architecture pattern
- `raw`: Raw response data
