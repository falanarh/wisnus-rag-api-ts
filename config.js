const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnvConfig() {
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return envVars;
  }
  
  return {};
}

// Get API configuration
function getApiConfig() {
  const envVars = loadEnvConfig();
  
  const port = envVars.PORT || '3001';
  const host = envVars.HOST || 'localhost';
  
  return {
    port,
    host,
    baseUrl: `http://${host}:${port}`,
    timeout: parseInt(envVars.TIMEOUT) || 120000, // 2 minutes default
    corsOrigins: envVars.CORS_ORIGINS || 'http://localhost:3000'
  };
}

// Get test configuration
function getTestConfig() {
  const envVars = loadEnvConfig();
  
  return {
    concurrentRequests: parseInt(envVars.TEST_CONCURRENT_REQUESTS) || 5,
    stressBurstRequests: parseInt(envVars.TEST_STRESS_BURST_REQUESTS) || 20,
    stressBurstInterval: parseInt(envVars.TEST_STRESS_BURST_INTERVAL) || 1000,
    stressTotalBursts: parseInt(envVars.TEST_STRESS_TOTAL_BURSTS) || 5,
    monitoringInterval: parseInt(envVars.TEST_MONITORING_INTERVAL) || 5000,
    testDuration: parseInt(envVars.TEST_DURATION) || 300000, // 5 minutes
    saveResults: envVars.TEST_SAVE_RESULTS !== 'false',
    resultsDir: envVars.TEST_RESULTS_DIR || './test-results'
  };
}

module.exports = {
  loadEnvConfig,
  getApiConfig,
  getTestConfig
}; 