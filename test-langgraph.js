const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/rag';

async function testLangGraphPipeline() {
  console.log('🧪 Testing LangGraph Pipeline Implementation...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');

    // Test 2: Initialize RAG System
    console.log('2️⃣ Testing RAG System Initialization...');
    const initResponse = await axios.post(`${BASE_URL}/initialize`);
    console.log('✅ RAG System Initialized:', initResponse.data);
    console.log('');

    // Test 3: Pipeline Info
    console.log('3️⃣ Testing Pipeline Info Endpoint...');
    const testQuestion = 'Apa definisi dari eko wisata?';
    const pipelineResponse = await axios.get(`${BASE_URL}/pipeline-info`, {
      params: { question: testQuestion }
    });
    console.log('✅ Pipeline Info:', JSON.stringify(pipelineResponse.data, null, 2));
    console.log('');

    // Test 4: Ask Question
    console.log('4️⃣ Testing Ask Question with LangGraph...');
    const askResponse = await axios.post(`${BASE_URL}/ask`, {
      question: testQuestion
    });
    console.log('✅ Ask Question Response:');
    console.log('Question:', askResponse.data.question);
    console.log('Answer:', askResponse.data.answer.substring(0, 200) + '...');
    console.log('Context Count:', askResponse.data.context.length);
    console.log('');

    // Test 5: Database Status
    console.log('5️⃣ Testing Database Status...');
    const statusResponse = await axios.get(`${BASE_URL}/status`);
    console.log('✅ Database Status:', statusResponse.data);
    console.log('');

    console.log('🎉 All LangGraph tests passed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('- Health Check: ✅');
    console.log('- RAG Initialization: ✅');
    console.log('- Pipeline Info: ✅');
    console.log('- Ask Question: ✅');
    console.log('- Database Status: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 503) {
      console.log('\n💡 Tip: Server might be starting up. Try again in a few seconds.');
    }
  }
}

async function testPipelineSteps() {
  console.log('🔍 Testing Individual Pipeline Steps...\n');

  const testQuestions = [
    'Apa definisi dari eko wisata?',
    'Bagaimana cara melakukan survei wisatawan?',
    'Apa itu wisatawan nusantara?'
  ];

  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    console.log(`${i + 1}️⃣ Testing: "${question}"`);
    
    try {
      const response = await axios.get(`${BASE_URL}/pipeline-info`, {
        params: { question }
      });
      
      const info = response.data.pipelineInfo;
      console.log(`   Step: ${info.step}`);
      console.log(`   Queries: ${info.queries?.length || 0} generated`);
      console.log(`   Retrieved: ${info.retrievedCount || 0} documents`);
      console.log(`   Reranked: ${info.rerankedCount || 0} documents`);
      console.log(`   Error: ${info.error || 'None'}`);
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.data?.error || error.message}`);
      console.log('');
    }
  }
}

async function testConcurrentRequests() {
  console.log('⚡ Testing Concurrent Requests with LangGraph...\n');

  const concurrentRequests = 3;
  const testQuestion = 'Apa definisi dari eko wisata?';
  
  console.log(`Sending ${concurrentRequests} concurrent requests...`);
  
  const promises = Array(concurrentRequests).fill().map(async (_, index) => {
    try {
      const startTime = Date.now();
      const response = await axios.post(`${BASE_URL}/ask`, {
        question: `${testQuestion} (Request ${index + 1})`
      });
      const endTime = Date.now();
      
      return {
        success: true,
        requestId: index + 1,
        duration: endTime - startTime,
        answerLength: response.data.answer.length
      };
    } catch (error) {
      return {
        success: false,
        requestId: index + 1,
        error: error.response?.data?.error || error.message
      };
    }
  });

  const results = await Promise.all(promises);
  
  console.log('📊 Concurrent Test Results:');
  results.forEach(result => {
    if (result.success) {
      console.log(`   Request ${result.requestId}: ✅ ${result.duration}ms (${result.answerLength} chars)`);
    } else {
      console.log(`   Request ${result.requestId}: ❌ ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  const avgDuration = results.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / successCount;
  
  console.log('');
  console.log(`📈 Summary: ${successCount}/${concurrentRequests} successful, Avg: ${avgDuration.toFixed(0)}ms`);
}

// Main execution
async function main() {
  console.log('🚀 LangGraph RAG Pipeline Test Suite');
  console.log('=====================================\n');

  await testLangGraphPipeline();
  console.log('');
  
  await testPipelineSteps();
  console.log('');
  
  await testConcurrentRequests();
  console.log('');
  
  console.log('✨ Test suite completed!');
}

// Run tests
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testLangGraphPipeline,
  testPipelineSteps,
  testConcurrentRequests
}; 