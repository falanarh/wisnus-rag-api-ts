import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ragRoutes from './routes/ragRoutes';
import { initializeRagSystem } from './controllers/ragController';

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

// Initialize RAG system on startup
const startupEvent = async () => {
  try {
    await initializeRagSystem();
    console.log('✅ RAG system initialized successfully!');
  } catch (error: any) {
    console.log(`❌ Failed to initialize RAG system: ${error.message}`);
  }
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startupEvent();
}); 