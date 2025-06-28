# Wisnus RAG API - TypeScript Version

This is the TypeScript implementation of the Wisnus RAG API, providing 100% functional parity with the Python version.

## Features

- **RAG (Retrieval-Augmented Generation)** system with multi-query retrieval
- **Streaming responses** for real-time answer generation
- **Advanced reranking** using LLM-based document relevance scoring
- **API key rotation** for handling rate limits
- **MongoDB Atlas Vector Search** integration
- **Google Gemini AI** integration with multiple API keys
- **Comprehensive evaluation system** with caching
- **Health check endpoints** for monitoring
- **CORS support** with configurable origins

## Architecture

The TypeScript version maintains the same architecture as the Python version:

```
src/
├── config/
│   ├── llm.ts                    # LLM configuration and API key rotation
│   └── rotatingLlmWrapper.ts     # Rotating LLM wrapper for evaluation
├── controllers/
│   └── ragController.ts          # Request handlers
├── models/
│   └── questionRequest.ts        # Request/response models
├── routes/
│   └── ragRoutes.ts              # API route definitions
├── services/
│   ├── mdProcessor.ts            # Markdown document processing
│   ├── ragService.ts             # Core RAG functionality
│   └── vectorStore.ts            # Vector store initialization
├── types/
│   └── mainTypes.ts              # TypeScript type definitions
├── utils/
│   └── apiKeyRotation.ts         # API key rotation utilities
├── configuration.ts              # Application configuration
└── main.ts                       # Application entry point
```

## API Endpoints

### Health Check
- `GET /api/rag/health` - System health status

### RAG Operations
- `POST /api/rag/initialize` - Initialize the RAG system
- `POST /api/rag/ask` - Ask a question (supports streaming)

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

# Optional
LANGSMITH_TRACING=false
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

## Key Features Implementation

### 1. Multi-Query Retrieval
The system generates 4 different queries for each question to improve retrieval accuracy:
- Query 1: `[keyword]?`
- Query 2: `Apa itu [keyword]?`
- Query 3: `Jelaskan tentang [keyword]?`
- Query 4: Simplified original question

### 2. LLM-Based Reranking
Documents are reranked using an LLM that evaluates relevance based on:
- Topic and concept relevance
- Information suitability
- Completeness of required information
- Accuracy and reliability

### 3. Streaming Responses
Real-time streaming of generated answers with proper error handling and API key rotation.

### 4. API Key Rotation
Automatic rotation of Gemini API keys when rate limits (429 errors) are encountered.

### 5. Evaluation System
Comprehensive evaluation with:
- MongoDB caching of evaluation results
- File hash-based result reuse
- Detailed performance metrics

## Differences from Python Version

The TypeScript version maintains 100% functional parity with the Python version, with the following implementation differences:

1. **Framework**: Express.js instead of FastAPI
2. **Language**: TypeScript instead of Python
3. **Evaluation**: Simplified evaluation metrics (ragas library not available in TypeScript)
4. **Streaming**: Express.js streaming instead of FastAPI StreamingResponse

## Performance

The TypeScript version provides equivalent performance to the Python version with:
- Async/await for non-blocking operations
- Efficient MongoDB operations
- Optimized vector search queries
- Memory-efficient streaming

## Error Handling

Comprehensive error handling including:
- API key rotation on rate limits
- Graceful degradation on service failures
- Detailed error logging
- User-friendly error messages

## Monitoring

Health check endpoint provides:
- System status
- RAG initialization status
- Vector store readiness
- LLM availability

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

### Best Practices

1. **Use Multiple API Keys**: Always configure at least 2-3 API keys for redundancy
2. **Monitor Logs**: Check console logs for retry attempts and model switches
3. **Handle Errors Gracefully**: Implement proper error handling in your client applications
4. **Rate Limiting**: Don't send too many requests simultaneously

## License

MIT License 
