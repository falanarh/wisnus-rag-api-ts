import { Router } from 'express';
import { ApiKeyController } from '../controllers/apiKeyController';

const router = Router();
const apiKeyController = new ApiKeyController();

// Get status of all API keys
router.get('/status', apiKeyController.getAllKeysStatus.bind(apiKeyController));

// Get best available API key info
router.get('/best', apiKeyController.getBestAvailableKey.bind(apiKeyController));

// Proactive API key rotation
router.post('/rotate', apiKeyController.rotateApiKeyProactively.bind(apiKeyController));

// Refresh API key cache
router.post('/refresh-cache', apiKeyController.refreshCache.bind(apiKeyController));

// Get rate limit info for a specific API key
router.get('/rate-limit/:apiKey', apiKeyController.getRateLimitInfo.bind(apiKeyController));

// Reactivate a deactivated API key
router.post('/reactivate/:apiKey', apiKeyController.reactivateKey.bind(apiKeyController));

// Reset all API key limits
router.post('/reset-limits', apiKeyController.resetAllLimits.bind(apiKeyController));

// Get API key usage statistics
router.get('/usage-stats', apiKeyController.getUsageStats.bind(apiKeyController));

export default router; 