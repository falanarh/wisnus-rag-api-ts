import express from 'express';
import { 
  askQuestion, 
  initializeRagSystem, 
  getHealthStatus, 
  runConcurrentTest,
  getDatabaseStatus 
} from '../controllers/ragController';

const router = express.Router();

// Health check endpoint
router.get('/health', getHealthStatus);

// Database status endpoint
router.get('/status', getDatabaseStatus);

// Initialize RAG system
router.post('/initialize', async (req, res) => {
  try {
    await initializeRagSystem();
    res.json({ 
      message: 'RAG system initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to initialize RAG system',
      details: error.message 
    });
  }
});

// Ask question endpoint
router.post('/ask', askQuestion);

// Concurrent test endpoint
router.post('/concurrent-test', runConcurrentTest);

export default router; 