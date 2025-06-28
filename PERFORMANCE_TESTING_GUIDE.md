# Performance Testing Guide - Wisnus RAG API

## Overview

This guide provides comprehensive testing tools and methodologies to evaluate the performance and reliability of the Wisnus RAG API under various load conditions.

## Testing Scripts

### 1. Basic Concurrent Testing (`test-concurrent.js`)

**Purpose**: Test basic concurrent request handling and compare with sequential performance.

**Features**:
- Tests 5 concurrent requests by default
- Compares sequential vs concurrent performance
- Load testing with increasing concurrent requests (1, 3, 5, 8, 10)
- Detailed performance metrics and analysis

**Usage**:
```bash
node test-concurrent.js
```

**Output Example**:
```
🚀 Starting Comprehensive API Performance Tests

📊 CONCURRENT TEST RESULTS
==================================================
Total Requests: 5
Successful: 5
Failed: 0
Success Rate: 100.0%
Total Time: 45000ms
Average Execution Time: 9000ms
Throughput: 0.11 requests/second
```

### 2. Stress Testing (`test-stress.js`)

**Purpose**: Intensive testing under high load conditions to identify breaking points.

**Features**:
- Burst testing (20 requests per burst)
- Ramp-up phase (gradual load increase)
- Sustained load testing
- Detailed error analysis
- Performance recommendations

**Configuration**:
```javascript
const STRESS_CONFIG = {
  burstRequests: 20,        // Requests per burst
  burstInterval: 1000,      // Time between bursts (ms)
  totalBursts: 5,           // Number of bursts
  rampUpTime: 5000,         // Ramp-up duration (ms)
  coolDownTime: 10000       // Cool-down duration (ms)
};
```

**Usage**:
```bash
node test-stress.js
```

**Output Example**:
```
🔥 STRESS TESTING WISNUS RAG API
==================================================
📊 DETAILED STRESS TEST RESULTS
============================================================
Total Requests: 100
Successful: 95
Failed: 5
Success Rate: 95.00%
Total Test Time: 120000ms
Throughput: 0.83 requests/second

⏱️  TIMING STATISTICS:
Average Execution Time: 15000ms
Fastest Request: 8000ms
Slowest Request: 45000ms
```

### 3. Real-Time Monitoring (`test-monitor.js`)

**Purpose**: Continuous monitoring with real-time metrics and different load patterns.

**Features**:
- Real-time performance dashboard
- Multiple load patterns (steady, increasing, burst, wave)
- Interactive pattern selection
- Continuous monitoring for 5 minutes
- Results saved to JSON file

**Load Patterns**:
1. **Steady**: Constant 1 request per interval
2. **Increasing**: Gradually increasing load (1-5 requests)
3. **Burst**: Random burst pattern (30% chance of 3 requests)
4. **Wave**: Sine wave pattern (1-5 requests)

**Usage**:
```bash
node test-monitor.js
```

**Output Example**:
```
📊 WISNUS RAG API - REAL-TIME MONITORING
============================================================
⏱️  Running Time: 2m 30s
🔄 Current Concurrent Requests: 2
📈 Max Concurrent Requests: 5

📈 REQUEST STATISTICS:
Total Requests: 30
Successful: 28
Failed: 2
Success Rate: 93.33%
Error Rate: 6.67%

⚡ PERFORMANCE METRICS:
Throughput: 0.20 requests/second
Average Response Time: 12000ms
```

## Performance Metrics

### Key Metrics Measured

1. **Success Rate**: Percentage of successful requests
2. **Response Time**: Average, minimum, and maximum execution times
3. **Throughput**: Requests per second
4. **Concurrent Requests**: Current and maximum concurrent requests
5. **Error Analysis**: Types and frequency of errors

### Performance Benchmarks

| Metric | Excellent | Good | Needs Improvement |
|--------|-----------|------|-------------------|
| Success Rate | ≥95% | ≥80% | <80% |
| Avg Response Time | <10s | <30s | >30s |
| Throughput | >0.5 req/s | >0.1 req/s | <0.1 req/s |

## Testing Scenarios

### 1. Baseline Testing
```bash
# Single request baseline
node test-concurrent.js
```

### 2. Concurrent Load Testing
```bash
# Test with 5 concurrent requests
node test-concurrent.js
```

### 3. Stress Testing
```bash
# Intensive stress test
node test-stress.js
```

### 4. Continuous Monitoring
```bash
# Real-time monitoring with steady load
node test-monitor.js
```

## Interpreting Results

### Success Rate Analysis
- **≥95%**: Excellent reliability
- **80-95%**: Good reliability with minor issues
- **<80%**: Needs improvement

### Response Time Analysis
- **<10s**: Fast responses
- **10-30s**: Moderate response times
- **>30s**: Slow responses, consider optimization

### Throughput Analysis
- **>0.5 req/s**: Good throughput
- **0.1-0.5 req/s**: Moderate throughput
- **<0.1 req/s**: Low throughput

## Common Issues and Solutions

### High Error Rates
**Symptoms**: Success rate < 80%
**Solutions**:
- Add more API keys for redundancy
- Implement request queuing
- Optimize database queries
- Check network connectivity

### Slow Response Times
**Symptoms**: Average response time > 30s
**Solutions**:
- Optimize vector search
- Use faster LLM models
- Implement response caching
- Scale up server resources

### Low Throughput
**Symptoms**: Throughput < 0.1 req/s
**Solutions**:
- Implement parallel processing
- Optimize async operations
- Add load balancing
- Database optimization

## Configuration Options

### Customizing Test Parameters

**Concurrent Testing**:
```javascript
const CONCURRENT_REQUESTS = 10; // Change number of concurrent requests
const TIMEOUT = 120000; // Change timeout (2 minutes)
```

**Stress Testing**:
```javascript
const STRESS_CONFIG = {
  burstRequests: 30,        // Increase burst size
  burstInterval: 500,       // Decrease interval for more intense testing
  totalBursts: 10,          // More bursts
  rampUpTime: 10000,        // Longer ramp-up
  coolDownTime: 15000       // Longer cool-down
};
```

**Monitoring**:
```javascript
const MONITORING_INTERVAL = 3000; // 3 seconds instead of 5
const TEST_DURATION = 600000;     // 10 minutes instead of 5
```

## Best Practices

### Before Testing
1. Ensure server is running and healthy
2. Check API keys are configured
3. Verify database connectivity
4. Monitor system resources

### During Testing
1. Start with baseline tests
2. Gradually increase load
3. Monitor system resources
4. Watch for error patterns

### After Testing
1. Analyze results thoroughly
2. Identify bottlenecks
3. Implement optimizations
4. Re-test after changes

## Troubleshooting

### Common Errors

**Connection Refused**:
```
❌ Cannot connect to server. Make sure the server is running on port 3001
```
**Solution**: Start the server with `npm run dev`

**Timeout Errors**:
```
❌ Request timed out. The server might be overloaded.
```
**Solution**: Increase timeout or reduce concurrent requests

**503 Service Unavailable**:
```
❌ Service temporarily unavailable. The AI model is currently overloaded.
```
**Solution**: The system should handle this automatically with retry mechanism

### Performance Optimization Tips

1. **Multiple API Keys**: Always use 2-3 API keys for redundancy
2. **Caching**: Implement response caching for repeated questions
3. **Database Optimization**: Optimize vector search queries
4. **Load Balancing**: Consider load balancing for high traffic
5. **Monitoring**: Use real-time monitoring for production

## Results Analysis

### Sample Results Interpretation

```json
{
  "totalRequests": 100,
  "successful": 95,
  "failed": 5,
  "successRate": 95.0,
  "avgExecutionTime": 15000,
  "throughput": 0.83,
  "errorTypes": {
    "timeout": 3,
    "http_error": 2
  }
}
```

**Analysis**:
- ✅ 95% success rate is excellent
- ⚠️ 15s average response time is moderate
- ⚠️ 0.83 req/s throughput is good
- ⚠️ 5 timeouts suggest occasional overload

## Conclusion

These testing tools provide comprehensive evaluation of the Wisnus RAG API's performance under various conditions. Regular testing helps identify bottlenecks and ensure optimal performance in production environments.

For production deployment, consider implementing:
- Automated performance testing in CI/CD
- Real-time monitoring dashboards
- Alert systems for performance degradation
- Load balancing and auto-scaling 