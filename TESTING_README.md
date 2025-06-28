# Quick Testing Guide - Wisnus RAG API

## 🚀 Quick Start

### Prerequisites
1. Server running: `npm run dev`
2. RAG system initialized
3. API keys configured in `.env`

### Basic Testing Commands

```bash
# Test basic functionality
npm run test:api

# Test concurrent requests (5 requests)
npm run test:concurrent

# Run stress test
npm run test:stress

# Start real-time monitoring
npm run test:monitor

# Run all tests in sequence
npm run test:all
```

## 📊 Test Types

### 1. Basic API Test (`test-api.js`)
- **Purpose**: Verify basic functionality
- **Duration**: ~1-2 minutes
- **What it tests**: Single request, response structure, health check

### 2. Concurrent Load Test (`test-concurrent.js`)
- **Purpose**: Test multiple simultaneous requests
- **Duration**: ~3-5 minutes
- **What it tests**: 5 concurrent requests, load testing (1-10 requests), performance comparison

### 3. Stress Test (`test-stress.js`)
- **Purpose**: High-load testing to find breaking points
- **Duration**: ~5-10 minutes
- **What it tests**: Burst requests (20 per burst), ramp-up, sustained load

### 4. Real-Time Monitoring (`test-monitor.js`)
- **Purpose**: Continuous monitoring with different patterns
- **Duration**: 5 minutes (configurable)
- **What it tests**: Real-time metrics, different load patterns

### 5. Comprehensive Test Suite (`run-all-tests.js`)
- **Purpose**: Run all tests in sequence
- **Duration**: ~15-20 minutes
- **What it tests**: Complete performance evaluation

## 🎯 Expected Results

### Good Performance Indicators
- ✅ Success Rate: ≥95%
- ✅ Response Time: <30 seconds
- ✅ Throughput: >0.1 requests/second
- ✅ No 503 errors (handled automatically)

### Warning Signs
- ⚠️ Success Rate: 80-95%
- ⚠️ Response Time: 30-60 seconds
- ⚠️ Throughput: 0.05-0.1 requests/second

### Critical Issues
- ❌ Success Rate: <80%
- ❌ Response Time: >60 seconds
- ❌ Throughput: <0.05 requests/second

## 🔧 Troubleshooting

### Common Issues

**Server not running**:
```bash
❌ Cannot connect to server
# Solution: npm run dev
```

**RAG not initialized**:
```bash
❌ RAG not initialized
# Solution: POST /api/rag/initialize
```

**503 Model Overloaded**:
```bash
❌ Service temporarily unavailable
# Solution: System handles automatically with retry
```

**Timeout errors**:
```bash
❌ Request timeout
# Solution: Check API keys, reduce concurrent requests
```

## 📈 Performance Optimization

### If Tests Show Poor Performance:

1. **Add more API keys**:
   ```
   GEMINI_API_KEY_1=key1
   GEMINI_API_KEY_2=key2
   GEMINI_API_KEY_3=key3
   ```

2. **Check system resources**:
   - CPU usage
   - Memory usage
   - Network connectivity

3. **Optimize configuration**:
   - Reduce concurrent requests
   - Increase timeouts
   - Add caching

## 📋 Test Results

Results are automatically saved to:
- `./test-results/` directory
- JSON format for detailed analysis
- Text summary for quick review

## 🎮 Interactive Testing

For interactive testing with different patterns:
```bash
npm run test:monitor
# Then select pattern:
# 1. steady - Constant load
# 2. increasing - Gradual increase
# 3. burst - Random bursts
# 4. wave - Sine wave pattern
```

## 📚 Detailed Documentation

For comprehensive testing information, see:
- `PERFORMANCE_TESTING_GUIDE.md` - Complete testing guide
- `SOLUTION_503_ERROR.md` - Error handling solutions
- `TESTING_GUIDE.md` - Original testing documentation 