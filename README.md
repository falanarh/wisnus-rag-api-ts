# 🚀 Wisnus RAG API - TypeScript Version

A high-performance RAG (Retrieval-Augmented Generation) API built with Express.js and TypeScript, designed for the Wisnus (Wisatawan Nusantara) survey system.

## ✨ Features

- **RAG-powered Q&A** using Gemini AI and MongoDB Atlas Vector Search
- **LangGraph-based pipeline** for structured and observable RAG processing
- **LangSmith integration** for detailed tracing and monitoring
- **Multi-query retrieval** for improved answer accuracy
- **Document reranking** based on semantic similarity
- **API key rotation** for handling rate limits
- **Comprehensive error handling** with retry mechanisms
- **Performance monitoring** and testing tools
- **Concurrent request handling** with proper resource management
- **Pipeline observability** with step-by-step tracking

## Architecture

The TypeScript version maintains the same architecture as the Python version with added LangGraph and LangSmith support:

```
src/
├── config/
│   ├── llm.ts                    # LLM configuration and API key rotation
│   ├── langsmith.ts              # LangSmith tracing configuration
│   └── rotatingLlmWrapper.ts     # Rotating LLM wrapper for evaluation
├── controllers/
│   └── ragController.ts          # Request handlers
├── models/
│   └── questionRequest.ts        # Request/response models
├── routes/
│   └── ragRoutes.ts              # API route definitions
├── services/
│   ├── mdProcessor.ts            # Markdown document processing
│   ├── ragService.ts             # Core RAG functionality (LangGraph-based)
│   ├── ragGraph.ts               # LangGraph pipeline implementation with LangSmith
│   └── vectorStore.ts            # Vector store initialization
├── types/
│   └── mainTypes.ts              # TypeScript type definitions
├── utils/
│   └── apiKeyRotation.ts         # API key rotation utilities
├── configuration.ts              # Application configuration
└── main.ts                       # Application entry point
```

## LangGraph Pipeline

The RAG system now uses LangGraph for structured pipeline processing:

### Pipeline Steps:
1. **Generate Queries** - Creates 4 different search queries from user question
2. **Retrieve Documents** - Searches vector database with multiple queries
3. **Rerank Documents** - LLM-based reranking for relevance
4. **Generate Answer** - Final answer generation with context

### Benefits:
- **Structured Processing** - Clear step-by-step pipeline
- **Better Debugging** - State tracking at each step
- **Observability** - Pipeline info endpoint for monitoring
- **Modularity** - Easy to add/remove pipeline steps
- **Error Handling** - Robust error handling per step

## LangSmith Tracing

LangSmith integration provides detailed tracing and monitoring:

### Node Structure in LangSmith:
- **Main Pipeline**: `rag_pipeline` - Overall RAG execution
- **Generate Queries**: `generate_queries` - Query generation step
- **Retrieve Documents**: `retrieve_documents` - Document retrieval step
- **Rerank Documents**: `rerank_documents` - Document reranking step
- **Generate Answer**: `generate_answer` - Final answer generation

### Benefits:
- **Detailed Tracing** - See input/output for each node
- **Performance Monitoring** - Track execution times
- **Error Tracking** - Detailed error analysis
- **Debugging** - Step-by-step debugging capabilities

## API Endpoints

- `GET /api/rag/health` - Health check
- `GET /api/rag/status` - Database status
- `GET /api/rag/pipeline-info` - Get pipeline information for a question
- `POST /api/rag/initialize` - Initialize RAG system
- `POST /api/rag/ask` - Ask a question
- `POST /api/rag/concurrent-test` - Test concurrent requests

### New Pipeline Info Endpoint

```http
GET /api/rag/pipeline-info?question=Apa definisi dari eko wisata?
```

Response:
```json
{
  "success": true,
  "question": "Apa definisi dari eko wisata?",
  "pipelineInfo": {
    "step": "answer_generated",
    "queries": ["Eko wisata?", "Apa itu eko wisata?", "Jelaskan tentang eko wisata?", "Definisi dari eko wisata"],
    "retrievedCount": 12,
    "rerankedCount": 8,
    "error": null
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Environment Variables

Required environment variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=rag_db
MONGODB_COLLECTION_NAME=documents

# Gemini AI Configuration
GEMINI_API_KEY_1=your_api_key_here
GEMINI_API_KEY_2=your_second_api_key
# ... up to GEMINI_API_KEY_10

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# LangSmith Configuration (Optional - for tracing and monitoring)
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_PROJECT=wisnus-rag-pipeline
LANGSMITH_ENDPOINT=https://api.smith.langchain.com

# Optional
PORT=3001
```

## Installation

1. Install dependencies:
```bash
npm install
```
2. Set up environment variables (see above)

3. Build the project:
```bash
npm run build
```

4. Start the server:
```bash
npm start
```

For development:
```bash
npm run dev
```

## LangSmith Setup

### 1. Get LangSmith API Key
1. Visit [LangSmith](https://smith.langchain.com/)
2. Create account and project
3. Get API key from dashboard

### 2. Configure Environment
Add LangSmith variables to `.env`:
```env
LANGSMITH_API_KEY=your_api_key_here
LANGSMITH_PROJECT=wisnus-rag-pipeline
```

### 3. View Traces
- Open [LangSmith Dashboard](https://smith.langchain.com/)
- Select your project
- View detailed traces of each pipeline execution

For detailed setup instructions, see [LangSmith Setup Guide](LANGSMITH_SETUP.md).

## Testing LangGraph Implementation

Run the LangGraph test suite:

```bash
node test-langgraph.js
```

This will test:
- Pipeline initialization
- Step-by-step processing
- Concurrent request handling
- Error scenarios

## Key Features Implementation

### 1. LangGraph Pipeline
Structured RAG processing with 4 distinct steps:
- Query generation
- Document retrieval
- Document reranking
- Answer generation

### 2. LangSmith Tracing
Detailed tracing and monitoring:
- Node-level input/output tracking
- Performance metrics
- Error analysis
- Debugging capabilities

### 3. Multi-Query Retrieval
Generates multiple search queries from user questions to improve document retrieval accuracy.

### 4. Document Reranking
LLM-based reranking of retrieved documents based on relevance to the question.

### 5. Error Handling & Retry
Comprehensive error handling with automatic API key rotation and retry mechanisms.

### 6. API Key Rotation
Automatic rotation of Gemini API keys when rate limits (429 errors) are encountered.

### 7. Pipeline Observability
Real-time tracking of pipeline steps and performance metrics.

### 8. Evaluation System
Comprehensive evaluation with:
- MongoDB caching of evaluation results
- File hash-based result reuse
- Detailed performance metrics

## Implementation Differences from Python Version

1. **Framework**: Express.js instead of FastAPI
2. **Language**: TypeScript instead of Python
3. **Response Format**: JSON responses instead of streaming
4. **Memory Management**: Node.js memory management
5. **Pipeline**: LangGraph-based structured processing
6. **Tracing**: LangSmith integration for detailed monitoring

## Performance

The TypeScript version provides equivalent performance to the Python version with:
- Async/await for non-blocking operations
- Efficient MongoDB operations
- Optimized vector search queries
- Memory-efficient streaming
- Structured LangGraph pipeline
- LangSmith tracing overhead is minimal

## Error Handling

Comprehensive error handling including:
- API key rotation on rate limits
- Graceful degradation on service failures
- Detailed error logging
- User-friendly error messages
- Pipeline step error tracking
- LangSmith error tracing

## Monitoring

Health check endpoint provides:
- System status
- RAG initialization status
- Vector store readiness
- LLM availability

Pipeline info endpoint provides:
- Current pipeline step
- Generated queries
- Document counts
- Error information

LangSmith provides:
- Detailed node-level traces
- Performance metrics
- Error analysis
- Debugging tools

## Troubleshooting

### Common Errors

#### 503 Service Unavailable - Model Overloaded

If you encounter this error:
```
{
    "error": "Processing failed: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent: [503 Service Unavailable] The model is overloaded. Please try again later."
}
```

**Solutions:**

1. **Multiple API Keys**: The system now supports multiple Gemini API keys for automatic rotation. Add multiple keys to your `.env` file:
   ```
   GEMINI_API_KEY_1=your_first_api_key_here
   GEMINI_API_KEY_2=your_second_api_key_here
   GEMINI_API_KEY_3=your_third_api_key_here
   ```

2. **Automatic Retry with Exponential Backoff**: The system will automatically retry failed requests with exponential backoff (1s, 2s, 4s delays).

3. **Model Fallback**: If `gemini-1.5-flash` is overloaded, the system will automatically try:
   - `gemini-1.5-pro`
   - `gemini-pro`

4. **Request Timeout**: Requests have a 30-second timeout to prevent hanging.

5. **Wait and Retry**: If all models are overloaded, wait a few minutes and try again.

#### Rate Limiting (429 Error)

If you hit rate limits:
- The system will automatically rotate API keys
- Wait for the suggested retry time in the error response
- Consider adding more API keys to your configuration

#### Request Timeout (408 Error)

If requests timeout:
- The system will retry automatically
- Consider breaking down complex questions into simpler ones
- Check your internet connection

#### Pipeline Errors

If pipeline steps fail:
- Check the pipeline info endpoint for detailed error information
- Review logs for specific step failures
- Verify vector store connectivity
- Use LangSmith traces for detailed debugging

#### LangSmith Issues

If LangSmith tracing fails:
- Pipeline continues to work normally
- Check API key validity
- Verify network connectivity
- Review LangSmith setup guide

### Best Practices

1. **Use Multiple API Keys**: Always configure at least 2-3 API keys for redundancy
2. **Monitor Logs**: Check console logs for retry attempts and model switches
3. **Handle Errors Gracefully**: Implement proper error handling in your client applications
4. **Rate Limiting**: Don't send too many requests simultaneously
5. **Pipeline Monitoring**: Use the pipeline info endpoint for debugging
6. **LangSmith Tracing**: Enable LangSmith for detailed monitoring and debugging

## Documentation

- [LangGraph Implementation Guide](LANGGRAPH_IMPLEMENTATION.md) - Detailed LangGraph documentation
- [LangSmith Setup Guide](LANGSMITH_SETUP.md) - LangSmith integration guide
- [Testing Guide](TESTING_GUIDE.md) - Comprehensive testing documentation
- [Performance Testing Guide](PERFORMANCE_TESTING_GUIDE.md) - Performance testing guidelines

## License

MIT License 
