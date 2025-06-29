import { Request, Response } from 'express';
import { getApiKeyManager } from '../services/apiKeyManager';
import { getApiKeyStatus, getRateLimitInfo, reactivateApiKey } from '../config/llm';

export class ApiKeyController {
  // Get status of all API keys
  async getAllKeysStatus(req: Request, res: Response): Promise<void> {
    try {
      const result = await getApiKeyStatus();
      
      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error,
          message: 'Failed to get API key status'
        });
        return;
      }

      // Mask API keys for security
      const maskedKeys = result.data?.map((keyStatus: any) => ({
        ...keyStatus,
        apiKey: keyStatus.apiKey.substring(0, 8) + '...' + keyStatus.apiKey.substring(keyStatus.apiKey.length - 4)
      }));

      res.json({
        success: true,
        data: maskedKeys,
        metadata: result.metadata,
        message: 'API key status retrieved successfully'
      });
    } catch (error: any) {
      console.error('Error getting API key status:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Internal server error'
      });
    }
  }

  // Get rate limit info for a specific API key
  async getRateLimitInfo(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.params;
      
      if (!apiKey) {
        res.status(400).json({
          success: false,
          error: 'API key is required',
          message: 'Please provide an API key'
        });
        return;
      }

      const result = await getRateLimitInfo(apiKey);
      
      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error,
          message: 'Failed to get rate limit info'
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Rate limit info retrieved successfully'
      });
    } catch (error: any) {
      console.error('Error getting rate limit info:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Internal server error'
      });
    }
  }

  // Reactivate a deactivated API key
  async reactivateKey(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.params;
      
      if (!apiKey) {
        res.status(400).json({
          success: false,
          error: 'API key is required',
          message: 'Please provide an API key'
        });
        return;
      }

      const result = await reactivateApiKey(apiKey);
      
      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error,
          message: 'Failed to reactivate API key'
        });
        return;
      }

      res.json({
        success: true,
        message: 'API key reactivated successfully'
      });
    } catch (error: any) {
      console.error('Error reactivating API key:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Internal server error'
      });
    }
  }

  // Reset all API key limits
  async resetAllLimits(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyManager = await getApiKeyManager();
      const result = await apiKeyManager.resetAllLimits();
      
      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error,
          message: 'Failed to reset API key limits'
        });
        return;
      }

      res.json({
        success: true,
        message: 'All API key limits reset successfully'
      });
    } catch (error: any) {
      console.error('Error resetting API key limits:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Internal server error'
      });
    }
  }

  // Get API key usage statistics
  async getUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyManager = await getApiKeyManager();
      const { startDate, endDate } = req.query;
      
      // This would require additional implementation in the service
      // For now, return basic stats
      const allKeysStatus = await apiKeyManager.getAllKeysStatus();
      
      if (!allKeysStatus.success) {
        res.status(500).json({
          success: false,
          error: allKeysStatus.error,
          message: 'Failed to get usage statistics'
        });
        return;
      }

      const stats = allKeysStatus.data?.map((keyStatus: any) => ({
        apiKey: keyStatus.apiKey.substring(0, 8) + '...' + keyStatus.apiKey.substring(keyStatus.apiKey.length - 4),
        isActive: keyStatus.isActive,
        lastUsed: keyStatus.lastUsed,
        rpmUsage: `${keyStatus.limits.rpm.current}/${keyStatus.limits.rpm.limit}`,
        rpdUsage: `${keyStatus.limits.rpd.current}/${keyStatus.limits.rpd.limit}`,
        tpmUsage: `${keyStatus.limits.tpm.current}/${keyStatus.limits.tpm.limit}`,
        errorCount: keyStatus.errorCount,
        lastError: keyStatus.lastError
      }));

      res.json({
        success: true,
        data: stats,
        message: 'Usage statistics retrieved successfully'
      });
    } catch (error: any) {
      console.error('Error getting usage statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Internal server error'
      });
    }
  }

  // Get best available API key info
  async getBestAvailableKey(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyManager = await getApiKeyManager();
      const result = await apiKeyManager.getBestAvailableKey();
      
      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error,
          message: 'Failed to get best available API key'
        });
        return;
      }

      if (!result.data) {
        res.status(500).json({
          success: false,
          error: 'No data returned',
          message: 'Failed to get best available API key'
        });
        return;
      }

      const [apiKey, keyStatus] = result.data;
      
      res.json({
        success: true,
        data: {
          apiKey: apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4),
          availabilityScore: result.metadata?.availabilityScore,
          totalAvailable: result.metadata?.totalAvailable,
          rotationMethod: result.metadata?.rotationMethod,
          lastUsed: keyStatus.lastUsed,
          limits: keyStatus.limits
        },
        metadata: result.metadata,
        message: 'Best available API key retrieved successfully'
      });
    } catch (error: any) {
      console.error('Error getting best available API key:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Internal server error'
      });
    }
  }

  // Proactive API key rotation
  async rotateApiKeyProactively(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyManager = await getApiKeyManager();
      const result = await apiKeyManager.getNextKeyForRotation();
      
      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error,
          message: 'Failed to rotate API key proactively'
        });
        return;
      }

      if (!result.data) {
        res.status(500).json({
          success: false,
          error: 'No data returned from rotation',
          message: 'Failed to rotate API key proactively'
        });
        return;
      }

      const [apiKey, keyStatus] = result.data;
      
      res.json({
        success: true,
        data: {
          apiKey: apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4),
          availabilityScore: result.metadata?.availabilityScore,
          rotationReason: result.metadata?.rotationReason,
          previousKeyScore: result.metadata?.previousKeyScore,
          lastUsed: keyStatus.lastUsed,
          limits: keyStatus.limits
        },
        metadata: result.metadata,
        message: 'API key rotated proactively'
      });
    } catch (error: any) {
      console.error('Error rotating API key proactively:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Internal server error'
      });
    }
  }

  // Refresh API key cache
  async refreshCache(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyManager = await getApiKeyManager();
      const result = await apiKeyManager.refreshCache();
      
      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error,
          message: 'Failed to refresh cache'
        });
        return;
      }

      res.json({
        success: true,
        message: 'API key cache refreshed successfully',
        metadata: result.metadata
      });
    } catch (error: any) {
      console.error('Error refreshing cache:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Internal server error'
      });
    }
  }
} 