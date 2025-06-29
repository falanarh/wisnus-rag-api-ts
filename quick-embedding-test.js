const { VectorStoreInitializer } = require('./dist/services/vectorStore');
const { MarkdownProcessor } = require('./dist/services/mdProcessor');

async function testEmbeddingManagement() {
  console.log('🚀 Testing Embedding Management System...\n');

  try {
    // Initialize vector store
    console.log('1️⃣ Initializing vector store...');
    const vectorStoreInitializer = new VectorStoreInitializer();
    console.log('✅ Vector store initializer created\n');

    // Check if initialization is needed
    console.log('2️⃣ Checking if initialization is needed...');
    const needsInit = await vectorStoreInitializer.isInitializationNeeded();
    console.log(`   Needs initialization: ${needsInit}\n`);

    // Get database stats
    console.log('3️⃣ Getting database statistics...');
    const stats = await vectorStoreInitializer.getDatabaseStats();
    console.log(`   Total documents: ${stats.totalDocuments}`);
    console.log(`   Sources: ${stats.sourceBreakdown.map(s => `${s._id}: ${s.count}`).join(', ')}`);
    console.log(`   Last updated: ${stats.lastUpdated || 'Never'}\n`);

    // Find documents without embeddings
    console.log('4️⃣ Finding documents without embeddings...');
    const documentsWithoutEmbeddings = await vectorStoreInitializer.findDocumentsWithoutEmbeddings();
    console.log(`   Found ${documentsWithoutEmbeddings.length} documents without embeddings\n`);

    if (documentsWithoutEmbeddings.length > 0) {
      console.log('5️⃣ Sample documents without embeddings:');
      documentsWithoutEmbeddings.slice(0, 3).forEach((doc, i) => {
        console.log(`   ${i + 1}. ${doc.metadata?.chunkId || 'unknown'}`);
        console.log(`      Source: ${doc.metadata?.source || 'unknown'}`);
        console.log(`      Content: ${doc.pageContent.substring(0, 80)}...`);
      });
      console.log('');

      // Test embedding generation (small batch)
      console.log('6️⃣ Testing embedding generation (small batch)...');
      const result = await vectorStoreInitializer.generateEmbeddingsForExistingDocuments(2);
      console.log(`   Processed: ${result.processed}`);
      console.log(`   Failed: ${result.failed}\n`);
    } else {
      console.log('5️⃣ No documents without embeddings found\n');
    }

    // Test comprehensive check
    console.log('7️⃣ Running comprehensive embedding check...');
    const checkResult = await vectorStoreInitializer.checkAndFixEmbeddings();
    console.log(`   Total documents: ${checkResult.totalDocuments}`);
    console.log(`   Without embeddings: ${checkResult.withoutEmbeddings}`);
    console.log(`   Processed: ${checkResult.processed}`);
    console.log(`   Failed: ${checkResult.failed}\n`);

    // Test document processing
    console.log('8️⃣ Testing document processing with embedding check...');
    const processor = new MarkdownProcessor();
    const sampleDocs = processor.processMarkdowns();
    
    if (sampleDocs.length > 0) {
      console.log(`   Processing ${sampleDocs.length} sample documents...`);
      const addResult = await vectorStoreInitializer.addDocumentsWithEmbeddingCheck(sampleDocs);
      console.log(`   Added: ${addResult.added}`);
      console.log(`   Skipped: ${addResult.skipped}`);
      console.log(`   Updated: ${addResult.updated}\n`);
    }

    console.log('🎉 Embedding management test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testEmbeddingManagement(); 