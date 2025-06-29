require('dotenv').config();

function validateEnvironment() {
  console.log('🔍 Validating environment variables...\n');
  
  const errors = [];
  const warnings = [];
  
  // Required variables
  const required = {
    'MONGODB_URI': process.env.MONGODB_URI,
    'MONGODB_DB_NAME': process.env.MONGODB_DB_NAME,
    'GEMINI_API_KEY_1': process.env.GEMINI_API_KEY_1
  };
  
  // Check required variables
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      errors.push(`❌ Missing required environment variable: ${key}`);
    } else {
      console.log(`✅ ${key}: ${key.includes('KEY') ? value.substring(0, 8) + '...' : value}`);
    }
  }
  
  // Check optional but recommended variables
  const optional = {
    'MONGODB_COLLECTION_NAME': process.env.MONGODB_COLLECTION_NAME || 'documents (default)',
    'PORT': process.env.PORT || '3001 (default)',
    'CORS_ORIGINS': process.env.CORS_ORIGINS || 'http://localhost:3000 (default)'
  };
  
  for (const [key, value] of Object.entries(optional)) {
    console.log(`ℹ️ ${key}: ${value}`);
  }
  
  // Check for additional API keys
  const apiKeys = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) {
      apiKeys.push(`GEMINI_API_KEY_${i}`);
    }
  }
  
  console.log(`📊 API Keys found: ${apiKeys.length}`);
  if (apiKeys.length === 1) {
    warnings.push('⚠️ Only one API key found. Consider adding more for better reliability.');
  } else if (apiKeys.length > 1) {
    console.log(`✅ Multiple API keys configured: ${apiKeys.join(', ')}`);
  }
  
  // Check LangSmith configuration
  if (process.env.LANGSMITH_API_KEY) {
    console.log('✅ LangSmith tracing enabled');
  } else {
    console.log('ℹ️ LangSmith tracing disabled (optional)');
  }
  
  // Display results
  console.log('\n' + '='.repeat(50));
  
  if (errors.length > 0) {
    console.log('❌ Validation failed:');
    errors.forEach(error => console.log(error));
    console.log('\n💡 Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.log('⚠️ Warnings:');
    warnings.forEach(warning => console.log(warning));
  }
  
  console.log('✅ Environment validation passed!');
  console.log('🚀 Ready to start the application.');
}

// Run validation if this file is executed directly
if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment }; 