# AI Repository Analyzer - Model Configuration Summary

## Current Setup

Your AI Repository Analyzer is now configured with a **hybrid model approach**:

### 🎯 Repository Analysis (CodeLlama 34B)
- **Agent**: RepositoryAnalyzerAgent
- **Model**: `codellama:34b`
- **Purpose**: Deep architectural analysis and code understanding
- **Why CodeLlama 34B**: Best performance for understanding code structure, relationships, and architectural patterns
- **Resource Usage**: High (16GB+ RAM recommended)

### 🎨 Diagram Generation (Ollama3)
- **Agent**: MermaidDiagramBuilderAgent
- **Model**: `llama3`
- **Purpose**: Creative Mermaid diagram generation
- **Why Ollama3**: Excellent for creative tasks and Mermaid syntax generation

### 🔪 Repository Chunking (Ollama3)
- **Agent**: CodebaseChunkingAgent
- **Model**: `llama3`
- **Purpose**: Large repository chunking and processing
- **Why Ollama3**: Efficient for text processing and chunk boundary detection

### 🔗 Results Aggregation (Ollama3)
- **Agent**: ResultsAggregator
- **Model**: `llama3`
- **Purpose**: Combining and synthesizing chunk results
- **Why Ollama3**: Good for text synthesis and result combination

## Benefits of This Setup

1. **Optimized Performance**: CodeLlama 34B provides the best code analysis quality
2. **Resource Efficiency**: Only the most critical agent uses the resource-intensive model
3. **Cost Effective**: Other agents use the lighter Ollama3 model
4. **Specialized Tasks**: Each model is optimized for its specific purpose

## Configuration Files

- **Environment**: `backend/env.example` - Contains all model configurations
- **Model Config**: `backend/src/config/modelConfig.js` - Detailed model specifications
- **Agent Config**: Each agent automatically uses the correct model

## Testing Your Setup

Run the test to verify everything is working:

```bash
cd backend
npm run test-codellama
```

## Model Status Check

You can check which models each agent is using by calling the `getAgentStatus()` method on the AgentOrchestrator.

## Next Steps

1. Make sure you have both models installed:
   - `codellama:34b` (for repository analysis)
   - `llama3` (for other agents)

2. Start your application:
   ```bash
   cd backend
   npm run dev
   ```

3. Test with a real repository through your frontend!

Your setup is now optimized for the best code analysis results while maintaining efficiency for other tasks.
