import express from 'express';
import { healthCheck, initializeRag, askQuestion, concurrentTest } from '../controllers/ragController';

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// Initialize RAG system
router.post('/initialize', initializeRag);

// Ask question endpoint
router.post('/ask', askQuestion);

// Concurrent test endpoint
router.post('/concurrent-test', concurrentTest);

export default router; 