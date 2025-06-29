# Concurrent Test Endpoint Documentation

## Overview

The Concurrent Test Endpoint (`/api/rag/concurrent-test`) is designed to test the performance and reliability of the RAG system under concurrent load. This endpoint simulates multiple simultaneous requests to evaluate how well the system handles parallel processing, API key rotation, and resource management.

## Endpoint Details

### URL
```
POST /api/rag/concurrent-test
```

### Content-Type
```
application/json
```

### Request Body
```json
{
  "numRequests": 5
}
```

**Parameters:**
- `numRequests` (number, optional): Number of concurrent requests to execute
  - Default: 5
  - Minimum: 1
  - Maximum: 50
  - Recommended: 5-10 for testing

## Response Format

### Success Response
```json
{
  "success": true,
  "testType": "concurrent",
  "numRequests": 5,
  "result": {
    "totalRequests": 5,
    "successful": 4,
    "failed": 1,
    "successRate": 80.0,
    "totalTime": 8500,
    "avgExecutionTime": 2125,
    "minTime": 1800,
    "maxTime": 2500,
    "throughput": 0.59,
    "details": {
      "successful": [
        {
          "requestId": 1,
          "status": "success",
          "executionTime": 1800,
          "question": "apa yang dimaksud dengan ekowisata?",
          "answerLength": 245,
          "contextCount": 3
        }
      ],
      "failed": [
        {
          "requestId": 3,
          "status": "error",
          "error": "Rate limit exceeded",
          "executionTime": 0
        }
      ]
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Invalid number of requests. Must be between 1 and 50.",
  "message": "Please provide a valid number of requests",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Response Fields

### Main Response
- `success` (boolean): Whether the test completed successfully
- `testType` (string): Always "concurrent"
- `numRequests` (number): Number of requests that were executed
- `result` (object): Detailed test results
- `timestamp` (string): ISO timestamp of when the test completed

### Result Object
- `totalRequests` (number): Total number of requests executed
- `successful` (number): Number of successful requests
- `failed` (number): Number of failed requests
- `successRate` (number): Percentage of successful requests (0-100)
- `totalTime` (number): Total execution time in milliseconds
- `avgExecutionTime` (number): Average execution time per request in milliseconds
- `minTime` (number): Fastest request execution time in milliseconds
- `maxTime` (number): Slowest request execution time in milliseconds
- `throughput` (number): Requests per second
- `details` (object): Detailed results for each request

### Details Object
- `successful` (array): Array of successful request results
- `failed` (array): Array of failed request results

### Request Result Object
- `requestId` (number): Unique identifier for the request
- `status` (string): Request status ("success", "error", "promise_rejected")
- `executionTime` (number): Execution time in milliseconds
- `question` (string, optional): The question that was asked
- `answerLength` (number, optional): Length of the generated answer
- `contextCount` (number, optional): Number of context documents used
- `error` (string, optional): Error message if request failed

## Test Questions

The endpoint uses a predefined set of 10 tourism-related questions to test the RAG system:

1. "apa yang dimaksud dengan ekowisata?"
2. "jelaskan tentang wisata bahari"
3. "apa itu wisata petualangan?"
4. "bagaimana cara melakukan survei wisatawan?"
5. "apa saja jenis kegiatan wisata?"
6. "jelaskan tentang wisata sejarah dan religi"
7. "apa yang dimaksud dengan wisata kuliner?"
8. "bagaimana karakteristik wisata kota dan pedesaan?"
9. "apa itu wisata MICE?"
10. "jelaskan tentang wisata olahraga dan kesehatan"

Questions are randomly selected for each request to simulate real-world usage patterns.

## Features

### Auto-Initialization
- Automatically initializes the RAG system if not already initialized
- Handles initialization errors gracefully
- Ensures the system is ready before testing

### Concurrent Execution
- Uses `Promise.allSettled()` for true concurrent execution
- All requests start simultaneously
- Handles both successful and failed requests

### Performance Metrics
- **Execution Time**: Measures individual request performance
- **Throughput**: Calculates requests per second
- **Success Rate**: Percentage of successful requests
- **Min/Max Times**: Identifies performance outliers

### Error Handling
- Comprehensive error catching and reporting
- Distinguishes between different types of failures
- Provides detailed error messages for debugging

### Rate Limiting Protection
- Works with the API key rotation system
- Handles rate limit errors gracefully
- Continues testing even if some requests fail

## Usage Examples

### Basic Test (5 requests)
```bash
curl -X POST https://wisnus-rag-api-ts.vercel.app/api/rag/concurrent-test \
  -H "Content-Type: application/json" \
  -d '{"numRequests": 5}'
```

### Load Test (10 requests)
```bash
curl -X POST https://wisnus-rag-api-ts.vercel.app/api/rag/concurrent-test \
  -H "Content-Type: application/json" \
  -d '{"numRequests": 10}'
```

### JavaScript/Node.js
```javascript
const response = await fetch('https://wisnus-rag-api-ts.vercel.app/api/rag/concurrent-test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    numRequests: 5
  })
});

const result = await response.json();
console.log(`Success Rate: ${result.result.successRate}%`);
console.log(`Average Time: ${result.result.avgExecutionTime}ms`);
console.log(`Throughput: ${result.result.throughput} req/s`);
```

### Python
```python
import requests
import json

response = requests.post(
    'https://wisnus-rag-api-ts.vercel.app/api/rag/concurrent-test',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({'numRequests': 5})
)

result = response.json()
print(f"Success Rate: {result['result']['successRate']}%")
print(f"Average Time: {result['result']['avgExecutionTime']}ms")
print(f"Throughput: {result['result']['throughput']} req/s")
```

## Performance Benchmarks

### Expected Performance (Typical)
- **Success Rate**: 90-100% (depending on API key availability)
- **Average Execution Time**: 2-5 seconds per request
- **Throughput**: 0.2-0.5 requests per second
- **Concurrent Speedup**: 3-5x faster than sequential execution

### Performance Factors
1. **API Key Availability**: More keys = better performance
2. **Database Connection**: MongoDB Atlas performance
3. **Network Latency**: Distance to Vercel servers
4. **Request Complexity**: Question length and complexity
5. **System Load**: Current server utilization

## Monitoring and Debugging

### Console Logs
The endpoint provides detailed console logging:
```
🧪 Starting concurrent test with 5 requests...
🚀 Request 1: Starting request for "apa yang dimaksud dengan ekowisata..."
✅ Request 1: Success (1800ms)
❌ Request 3: Failed
   Error: Rate limit exceeded
📊 CONCURRENT TEST RESULTS
==================================================
Total Requests: 5
Successful: 4
Failed: 1
Success Rate: 80.0%
Total Time: 8500ms
Average Execution Time: 2125ms
Throughput: 0.59 requests/second
```

### Common Issues and Solutions

#### High Failure Rate
- **Cause**: API key rate limits or insufficient keys
- **Solution**: Add more API keys or reduce concurrent requests

#### Slow Performance
- **Cause**: Database connection issues or high latency
- **Solution**: Check MongoDB connection and network status

#### Initialization Errors
- **Cause**: RAG system not properly initialized
- **Solution**: Check environment variables and database connectivity

## Integration with Other Systems

### API Key Management
- Works seamlessly with the API key rotation system
- Automatically handles rate limit errors
- Provides feedback on key utilization

### Monitoring Systems
- Can be integrated with monitoring dashboards
- Provides metrics for alerting systems
- Supports performance trend analysis

### Load Testing Tools
- Compatible with external load testing tools
- Can be used as part of CI/CD pipelines
- Supports automated performance testing

## Best Practices

### Testing Recommendations
1. **Start Small**: Begin with 1-3 requests to establish baseline
2. **Gradual Increase**: Incrementally increase load to find limits
3. **Monitor Resources**: Watch for memory and CPU usage
4. **Check Logs**: Review console logs for detailed insights
5. **Validate Results**: Ensure success rates are acceptable

### Production Usage
1. **Limit Concurrent Requests**: Don't exceed 20 concurrent requests
2. **Monitor API Keys**: Ensure sufficient API key availability
3. **Schedule Tests**: Run during off-peak hours
4. **Set Alerts**: Monitor for performance degradation
5. **Document Results**: Keep track of performance trends

## Troubleshooting

### Common Error Messages

#### "Invalid number of requests"
- **Cause**: Request count outside allowed range (1-50)
- **Solution**: Use a valid number between 1 and 50

#### "Failed to run concurrent test"
- **Cause**: Internal server error or system failure
- **Solution**: Check server logs and system status

#### "RAG system not initialized"
- **Cause**: RAG system failed to initialize
- **Solution**: Check environment variables and database connection

### Performance Optimization
1. **Database Indexing**: Ensure proper MongoDB indexes
2. **API Key Management**: Optimize key rotation strategy
3. **Caching**: Implement response caching where appropriate
4. **Connection Pooling**: Optimize database connections
5. **Resource Limits**: Monitor and adjust server resources

## Security Considerations

### Rate Limiting
- Endpoint respects API rate limits
- Implements request validation
- Provides graceful degradation

### Input Validation
- Validates request parameters
- Prevents excessive resource usage
- Sanitizes input data

### Error Handling
- Doesn't expose sensitive information
- Provides appropriate error messages
- Logs errors for debugging

## Future Enhancements

### Planned Features
1. **Custom Questions**: Allow custom test questions
2. **Advanced Metrics**: More detailed performance analytics
3. **Load Profiles**: Predefined load testing scenarios
4. **Real-time Monitoring**: Live performance dashboards
5. **Automated Testing**: Scheduled performance tests

### Integration Opportunities
1. **Grafana Dashboards**: Real-time performance monitoring
2. **Slack Notifications**: Performance alerts
3. **GitHub Actions**: Automated performance testing
4. **Prometheus Metrics**: Standardized monitoring
5. **Health Checks**: Integration with health monitoring systems 