# 🚀 Wisnus RAG API - TypeScript Version

A high-performance RAG (Retrieval-Augmented Generation) API built with Express.js and TypeScript, designed for the Wisnus (Wisatawan Nusantara) survey system.

## ✨ Features

- **RAG-powered Q&A** using Gemini AI and MongoDB Atlas Vector Search
- **Multi-query retrieval** for improved answer accuracy
- **Document reranking** based on semantic similarity
- **API key rotation** for handling rate limits
- **Comprehensive error handling** with retry mechanisms
- **Performance monitoring** and testing tools
- **Concurrent request handling** with proper resource management

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

- `GET /api/rag/health` - Health check
- `POST /api/rag/initialize` - Initialize RAG system
- `POST /api/rag/ask` - Ask a question
- `POST /api/rag/concurrent-test` - Test concurrent requests

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
Generates multiple search queries from user questions to improve document retrieval accuracy.

### 2. Document Reranking
LLM-based reranking of retrieved documents based on relevance to the question.

### 3. Error Handling & Retry
Comprehensive error handling with automatic API key rotation and retry mechanisms.

### 4. API Key Rotation
Automatic rotation of Gemini API keys when rate limits (429 errors) are encountered.

### 5. Evaluation System
Comprehensive evaluation with:
- MongoDB caching of evaluation results
- File hash-based result reuse
- Detailed performance metrics

## Implementation Differences from Python Version

1. **Framework**: Express.js instead of FastAPI
2. **Language**: TypeScript instead of Python
3. **Response Format**: JSON responses instead of streaming
4. **Memory Management**: Node.js memory management

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
