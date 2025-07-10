import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ragRoutes from './routes/ragRoutes';
import apiKeyRoutes from './routes/apiKeyRoutes';
import { initializeRagSystem } from './controllers/ragController';
import { Settings } from './configuration';

// Validate environment variables
const validateEnvironment = () => {
  const required = [
    'MONGODB_URI',
    'MONGODB_DB_NAME', 
    'GEMINI_API_KEY_1'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('💡 Please run: npm run validate');
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
};

const app = express();
const PORT = Settings.PORT;

// Get CORS configuration from environment variable
// Default to localhost:3000 if not provided
const corsOriginsStr = Settings.CORS_ORIGINS;
const corsOrigins = corsOriginsStr.split(',').map(origin => origin.trim());

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ 
    message: 'API is running',
    version: '1.1.0',
    features: ['RAG', 'API Key Management', 'LangGraph', 'LangSmith'],
    timestamp: new Date().toISOString()
  });
});

app.use('/api/rag', ragRoutes);
app.use('/api/keys', apiKeyRoutes);

// Initialize RAG system automatically on startup
const startupEvent = async () => {
  try {
    console.log('🚀 Initializing RAG system...');
    console.log(`🔧 Configuration:`);
    console.log(`   Port: ${PORT}`);
    console.log(`   MongoDB: ${Settings.MONGO_URI}`);
    console.log(`   Database: ${Settings.MONGO_DB_NAME}`);
    console.log(`   API Keys: ${Settings.getGeminiApiKeys().length} found`);
    console.log('');
    
    await initializeRagSystem();
    console.log('✅ RAG system initialized successfully!');
  } catch (error: any) {
    console.log(`❌ Failed to initialize RAG system: ${error.message}`);
    console.log('⚠️ You may need to manually initialize via POST /api/rag/initialize');
    console.log('💡 Check your environment variables and MongoDB connection');
  }
};

// Start server and initialize RAG system
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 CORS origins: ${corsOrigins.join(', ')}`);
  
  // Validate environment before startup
  validateEnvironment();
  
  await startupEvent();
}); 