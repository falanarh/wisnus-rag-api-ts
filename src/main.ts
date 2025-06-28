import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ragRoutes from './routes/ragRoutes';
import { initializeRagSystem } from './controllers/ragController';
import { LangSmithConfig } from './config/langsmith';

const app = express();
const PORT = process.env.PORT || 3001;

// Get CORS configuration from environment variable
// Default to localhost:3000 if not provided
const corsOriginsStr = process.env.CORS_ORIGINS || 'http://localhost:3000';
const corsOrigins = corsOriginsStr.split(',').map(origin => origin.trim());

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'API is running' });
});

app.use('/api/rag', ragRoutes);

// Initialize LangSmith tracing
LangSmithConfig.initialize();

// Initialize RAG system automatically on startup
const startupEvent = async () => {
  try {
    console.log('🚀 Checking if RAG system initialization is needed...');
    await initializeRagSystem(false); // Use smart initialization
    console.log('✅ RAG system startup check completed!');
  } catch (error: any) {
    console.log(`❌ Failed to initialize RAG system: ${error.message}`);
    console.log('⚠️ You may need to manually initialize via POST /api/rag/initialize');
  }
};

// Start server and initialize RAG system
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await startupEvent();
}); 