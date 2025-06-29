const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'rag_db';

async function initializeApiKeySystem() {
  console.log('🚀 Initializing API Key Management System...\n');

  try {
    // Test 1: Check if server is running
    console.log('1️⃣ Checking server status...');
    const healthResponse = await axios.get(`${BASE_URL}/api/rag/health`);
    console.log('✅ Server is running:', healthResponse.data);
    console.log('');

    // Test 2: Initialize API key management
    console.log('2️⃣ Testing API key management initialization...');
    const statusResponse = await axios.get(`${BASE_URL}/api/keys/status`);
    console.log('✅ API Key Management initialized successfully');
    console.log('📊 Total API keys found:', statusResponse.data.metadata?.totalKeys || 0);
    console.log('');

    // Test 3: Check database collections
    console.log('3️⃣ Checking database collections...');
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    const collections = await db.listCollections().toArray();
    const apiKeyCollections = collections.filter(col => 
      col.name === 'api_keys' || col.name === 'api_key_usage'
    );
    
    console.log('✅ Database collections found:');
    apiKeyCollections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    console.log('');

    // Test 4: Get best available key
    console.log('4️⃣ Testing best key selection...');
    const bestKeyResponse = await axios.get(`${BASE_URL}/api/keys/best`);
    console.log('✅ Best key selected:', bestKeyResponse.data.data?.apiKey || 'N/A');
    console.log('📊 Availability score:', bestKeyResponse.data.data?.availabilityScore || 0);
    console.log('');

    // Test 5: Test RAG with API key management
    console.log('5️⃣ Testing RAG with API key management...');
    const ragResponse = await axios.post(`${BASE_URL}/api/rag/ask`, {
      question: 'Apa itu survei wisatawan nusantara?'
    });
    console.log('✅ RAG request successful');
    console.log('📝 Answer length:', ragResponse.data.answer?.length || 0);
    console.log('');

    // Test 6: Check usage after RAG request
    console.log('6️⃣ Checking usage after RAG request...');
    const usageResponse = await axios.get(`${BASE_URL}/api/keys/usage-stats`);
    console.log('✅ Usage statistics retrieved');
    console.log('📊 Active keys:', usageResponse.data.data?.filter(k => k.isActive).length || 0);
    console.log('');

    await client.close();
    console.log('🎉 API Key Management System initialization completed successfully!');
    console.log('');
    console.log('📋 System Status:');
    console.log('   ✅ Server running');
    console.log('   ✅ Database connected');
    console.log('   ✅ API key management active');
    console.log('   ✅ RAG integration working');
    console.log('   ✅ Usage tracking enabled');

  } catch (error) {
    console.error('❌ Initialization failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the server is running: npm run dev');
    } else if (error.response?.status === 404) {
      console.log('💡 Make sure the API key management routes are properly configured');
    }
  }
}

async function testApiKeyLimits() {
  console.log('\n🧪 Testing API Key Limits...\n');

  try {
    // Get current status
    const statusResponse = await axios.get(`${BASE_URL}/api/keys/status`);
    const keys = statusResponse.data.data;
    
    if (keys && keys.length > 0) {
      console.log('📊 Current API Key Status:');
      keys.forEach((key, index) => {
        console.log(`\n   Key ${index + 1}: ${key.apiKey}`);
        console.log(`   Status: ${key.isActive ? '🟢 Active' : '🔴 Inactive'}`);
        console.log(`   RPM: ${key.limits.rpm.current}/${key.limits.rpm.limit}`);
        console.log(`   RPD: ${key.limits.rpd.current}/${key.limits.rpd.limit}`);
        console.log(`   TPM: ${key.limits.tpm.current}/${key.limits.tpm.limit}`);
        console.log(`   Errors: ${key.errorCount}`);
        if (key.lastError) {
          console.log(`   Last Error: ${key.lastError}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Limit test failed:', error.response?.data || error.message);
  }
}

async function testConcurrentRequests() {
  console.log('\n🧪 Testing Concurrent Requests...\n');

  try {
    const promises = [];
    const requestCount = 3; // Reduced for testing

    console.log(`📤 Sending ${requestCount} concurrent requests...`);
    
    for (let i = 0; i < requestCount; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/rag/ask`, {
          question: `Test question ${i + 1}: Apa itu survei wisatawan nusantara?`
        }).catch(error => ({ 
          error: true, 
          status: error.response?.status,
          message: error.response?.data?.error || error.message 
        }))
      );
    }

    const results = await Promise.all(promises);
    
    console.log('📊 Concurrent request results:');
    results.forEach((result, index) => {
      if (result.error) {
        console.log(`   ❌ Request ${index + 1}: Failed - ${result.message}`);
      } else {
        console.log(`   ✅ Request ${index + 1}: Success - Status ${result.status}`);
      }
    });

    // Check API key status after concurrent requests
    console.log('\n📊 API Key Status after concurrent requests:');
    const finalStatus = await axios.get(`${BASE_URL}/api/keys/status`);
    const keys = finalStatus.data.data;
    
    if (keys && keys.length > 0) {
      keys.forEach((key, index) => {
        console.log(`   Key ${index + 1}: RPM ${key.limits.rpm.current}/${key.limits.rpm.limit}`);
      });
    }

  } catch (error) {
    console.error('❌ Concurrent test failed:', error.response?.data || error.message);
  }
}

// Main function
async function main() {
  console.log('🔧 API Key Management System Setup and Testing\n');
  console.log('=' .repeat(50));
  
  await initializeApiKeySystem();
  await testApiKeyLimits();
  await testConcurrentRequests();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎯 Setup and testing completed!');
  console.log('\n📚 Next steps:');
  console.log('   1. Monitor API key usage: GET /api/keys/status');
  console.log('   2. Check best available key: GET /api/keys/best');
  console.log('   3. View usage statistics: GET /api/keys/usage-stats');
  console.log('   4. Run full test suite: npm run test:api-keys');
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  initializeApiKeySystem,
  testApiKeyLimits,
  testConcurrentRequests,
  main
}; 