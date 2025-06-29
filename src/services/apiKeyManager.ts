import { MongoClient, Db, Collection } from 'mongodb';
import { settings } from '../configuration';
import { 
  ApiKeyStatus, 
  ApiKeyManager, 
  ApiKeyLimit, 
  RateLimitInfo, 
  ApiKeyUsage,
  ServiceResponse 
} from '../types/mainTypes';
import { Settings } from '../configuration';

export class ApiKeyManagerService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private apiKeysCollection: Collection | null = null;
  private usageCollection: Collection | null = null;
  private manager: ApiKeyManager;
  private isInitialized = false;

  // Fast rotation mechanism
  private currentKeyIndex = 0;
  private availableKeysCache: ApiKeyStatus[] = [];
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds cache
  private readonly ROTATION_THRESHOLD = 0.3; // Rotate when availability < 30%

  // Gemini 2.0 Flash-Lite limits
  private readonly GEMINI_LIMITS = {
    RPM: 30,
    RPD: 200,
    TPM: 1000000
  };

  constructor() {
    this.manager = {
      keys: [],
      currentIndex: 0,
      totalKeys: 0,
      lastRotation: new Date()
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Validate MongoDB URI
      const mongoUri = Settings.MONGO_URI;
      if (!mongoUri || typeof mongoUri !== 'string' || mongoUri.trim() === '') {
        throw new Error('Invalid MongoDB URI. Please check MONGODB_URI environment variable.');
      }
      
      // Initialize MongoDB connection
      this.client = new MongoClient(mongoUri);
      await this.client.connect();
      
      this.db = this.client.db(Settings.MONGO_DB_NAME);
      this.apiKeysCollection = this.db.collection('api_keys');
      this.usageCollection = this.db.collection('api_key_usage');
      
      this.isInitialized = true;
      console.log('✅ MongoDB connection established for API key management');
    } catch (error: any) {
      console.error('❌ Failed to initialize MongoDB connection:', error.message);
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }
  }

  async initialize(): Promise<ServiceResponse<ApiKeyManager>> {
    try {
      await this.ensureInitialized();

      // Load API keys from environment
      const keys: string[] = [];
      let i = 1;
      while (true) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (!key) break;
        keys.push(key);
        i++;
      }

      if (keys.length === 0) {
        throw new Error('No Gemini API keys provided in environment variables');
      }

      // Initialize or load existing API key statuses from database
      await this.initializeApiKeyStatuses(keys);

      // Create indexes for better performance
      await this.createIndexes();

      console.log(`✅ API Key Manager initialized with ${keys.length} keys`);
      return { success: true, data: this.manager, metadata: { totalKeys: keys.length } };
    } catch (error: any) {
      console.error('❌ Failed to initialize API Key Manager:', error);
      
      // Fallback to in-memory mode
      console.log('🔄 Falling back to in-memory mode...');
      return this.initializeInMemoryMode();
    }
  }

  private initializeInMemoryMode(): ServiceResponse<ApiKeyManager> {
    try {
      // Load API keys from environment
      const keys: string[] = [];
      let i = 1;
      while (true) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (!key) break;
        keys.push(key);
        i++;
      }

      if (keys.length === 0) {
        throw new Error('No Gemini API keys provided in environment variables');
      }

      // Create in-memory API key statuses
      for (const apiKey of keys) {
        const status: ApiKeyStatus = {
          apiKey,
          isActive: true,
          lastUsed: new Date(),
          limits: this.createInitialLimits(),
          errorCount: 0
        };
        this.manager.keys.push(status);
      }
      
      this.manager.totalKeys = this.manager.keys.length;
      console.log(`✅ In-memory API Key Manager initialized with ${keys.length} keys`);
      return { success: true, data: this.manager, metadata: { totalKeys: keys.length, mode: 'in-memory' } };
    } catch (error: any) {
      return { success: false, error: error.message, metadata: {} };
    }
  }

  private async initializeApiKeyStatuses(keys: string[]): Promise<void> {
    for (const apiKey of keys) {
      const existingStatus = await this.apiKeysCollection?.findOne({ apiKey });
      
      if (!existingStatus) {
        // Create new API key status
        const newStatus: ApiKeyStatus = {
          apiKey,
          isActive: true,
          lastUsed: new Date(),
          limits: this.createInitialLimits(),
          errorCount: 0
        };
        
        await this.apiKeysCollection?.insertOne(newStatus);
        this.manager.keys.push(newStatus);
      } else {
        // Load existing status and update limits if needed
        const status: ApiKeyStatus = {
          apiKey: existingStatus.apiKey,
          isActive: existingStatus.isActive,
          lastUsed: new Date(existingStatus.lastUsed),
          limits: this.updateLimitsIfNeeded(existingStatus.limits),
          errorCount: existingStatus.errorCount || 0,
          lastError: existingStatus.lastError,
          lastErrorTime: existingStatus.lastErrorTime ? new Date(existingStatus.lastErrorTime) : undefined
        };
        
        await this.apiKeysCollection?.updateOne(
          { apiKey },
          { $set: status }
        );
        
        this.manager.keys.push(status);
      }
    }
    
    this.manager.totalKeys = this.manager.keys.length;
  }

  private createInitialLimits(): ApiKeyLimit {
    const now = new Date();
    return {
      rpm: {
        current: 0,
        limit: this.GEMINI_LIMITS.RPM,
        resetTime: new Date(now.getTime() + 60000) // 1 minute from now
      },
      rpd: {
        current: 0,
        limit: this.GEMINI_LIMITS.RPD,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
      },
      tpm: {
        current: 0,
        limit: this.GEMINI_LIMITS.TPM,
        resetTime: new Date(now.getTime() + 60000) // 1 minute from now
      }
    };
  }

  private updateLimitsIfNeeded(limits: any): ApiKeyLimit {
    const now = new Date();
    
    // Update RPM if reset time has passed
    if (new Date(limits.rpm.resetTime) <= now) {
      limits.rpm.current = 0;
      limits.rpm.resetTime = new Date(now.getTime() + 60000);
    }
    
    // Update RPD if reset time has passed
    if (new Date(limits.rpd.resetTime) <= now) {
      limits.rpd.current = 0;
      limits.rpd.resetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
    
    // Update TPM if reset time has passed
    if (new Date(limits.tpm.resetTime) <= now) {
      limits.tpm.current = 0;
      limits.tpm.resetTime = new Date(now.getTime() + 60000);
    }
    
    return limits;
  }

  private async createIndexes(): Promise<void> {
    await this.apiKeysCollection?.createIndex({ apiKey: 1 }, { unique: true });
    await this.apiKeysCollection?.createIndex({ isActive: 1 });
    await this.apiKeysCollection?.createIndex({ lastUsed: 1 });
    
    await this.usageCollection?.createIndex({ apiKey: 1 });
    await this.usageCollection?.createIndex({ timestamp: 1 });
    await this.usageCollection?.createIndex({ success: 1 });
  }

  async getBestAvailableKey(): Promise<ServiceResponse<[string, ApiKeyStatus]>> {
    try {
      // Use cached available keys if cache is still valid
      const now = Date.now();
      if (now - this.lastCacheUpdate < this.CACHE_TTL && this.availableKeysCache.length > 0) {
        const keyStatus = this.availableKeysCache[this.currentKeyIndex % this.availableKeysCache.length];
        
        // Quick check if current key is still good
        if (this.isKeyAvailable(keyStatus)) {
          this.currentKeyIndex++;
          keyStatus.lastUsed = new Date();
          
          // Async update without waiting
          this.updateKeyStatusAsync(keyStatus);
          
          return { 
            success: true, 
            data: [keyStatus.apiKey, keyStatus], 
            metadata: { 
              availabilityScore: this.calculateAvailabilityScore(keyStatus),
              totalAvailable: this.availableKeysCache.length,
              rotationMethod: 'cached-round-robin'
            } 
          };
        }
      }

      // Refresh cache and get fresh available keys
      await this.refreshAvailableKeysCache();
      
      if (this.availableKeysCache.length === 0) {
        throw new Error('No active API keys available');
      }

      // Use round-robin for fast rotation
      const keyStatus = this.availableKeysCache[this.currentKeyIndex % this.availableKeysCache.length];
      this.currentKeyIndex++;
      
      // Update last used time
      keyStatus.lastUsed = new Date();
      
      // Async update without waiting
      this.updateKeyStatusAsync(keyStatus);

      return { 
        success: true, 
        data: [keyStatus.apiKey, keyStatus], 
        metadata: { 
          availabilityScore: this.calculateAvailabilityScore(keyStatus),
          totalAvailable: this.availableKeysCache.length,
          rotationMethod: 'round-robin'
        } 
      };
    } catch (error: any) {
      return { success: false, error: error.message, metadata: {} };
    }
  }

  private async refreshAvailableKeysCache(): Promise<void> {
    const availableKeys = this.manager.keys.filter(key => key.isActive && this.isKeyAvailable(key));
    
    // Sort by availability score for better distribution
    availableKeys.sort((a, b) => {
      const aScore = this.calculateAvailabilityScore(a);
      const bScore = this.calculateAvailabilityScore(b);
      return bScore - aScore;
    });
    
    this.availableKeysCache = availableKeys;
    this.lastCacheUpdate = Date.now();
  }

  private isKeyAvailable(keyStatus: ApiKeyStatus): boolean {
    const limits = keyStatus.limits;
    const now = new Date();
    
    // Check if any limits are reset
    if (now >= limits.rpm.resetTime) {
      limits.rpm.current = 0;
      limits.rpm.resetTime = new Date(now.getTime() + 60000);
    }
    if (now >= limits.rpd.resetTime) {
      limits.rpd.current = 0;
      limits.rpd.resetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
    if (now >= limits.tpm.resetTime) {
      limits.tpm.current = 0;
      limits.tpm.resetTime = new Date(now.getTime() + 60000);
    }
    
    // Check if key has capacity
    return limits.rpm.current < limits.rpm.limit && 
           limits.rpd.current < limits.rpd.limit && 
           limits.tpm.current < limits.tpm.limit;
  }

  private async updateKeyStatusAsync(keyStatus: ApiKeyStatus): Promise<void> {
    // Fire and forget - don't wait for database update
    if (this.isInitialized) {
      this.updateKeyStatus(keyStatus).catch(error => {
        console.warn('⚠️ Async key status update failed:', error);
      });
    }
  }

  private calculateAvailabilityScore(keyStatus: ApiKeyStatus): number {
    const limits = keyStatus.limits;
    
    // Calculate remaining capacity for each limit type
    const rpmRemaining = Math.max(0, limits.rpm.limit - limits.rpm.current);
    const rpdRemaining = Math.max(0, limits.rpd.limit - limits.rpd.current);
    const tpmRemaining = Math.max(0, limits.tpm.limit - limits.tpm.current);
    
    // Normalize scores (0-1 scale)
    const rpmScore = rpmRemaining / limits.rpm.limit;
    const rpdScore = rpdRemaining / limits.rpd.limit;
    const tpmScore = tpmRemaining / limits.tpm.limit;
    
    // Weighted average (RPM is most important for speed)
    return (rpmScore * 0.5) + (rpdScore * 0.3) + (tpmScore * 0.2);
  }

  async recordUsage(apiKey: string, tokensUsed: number, success: boolean, error?: string, responseTime?: number): Promise<ServiceResponse<void>> {
    try {
      // Async database operations - don't wait
      if (this.isInitialized) {
        this.ensureInitialized().then(() => {
          const usage: ApiKeyUsage = {
            apiKey,
            timestamp: new Date(),
            tokensUsed,
            success,
            error,
            responseTime: responseTime || 0
          };
          return this.usageCollection?.insertOne(usage);
        }).catch(error => {
          console.warn('⚠️ Async usage recording failed:', error);
        });
      }

      // Update API key status in memory (immediate)
      const keyStatus = this.manager.keys.find(k => k.apiKey === apiKey);
      if (keyStatus) {
        if (success) {
          // Increment counters
          keyStatus.limits.rpm.current++;
          keyStatus.limits.rpd.current++;
          keyStatus.limits.tpm.current += tokensUsed;
          
          // Reset error count on success
          keyStatus.errorCount = 0;
          keyStatus.lastError = undefined;
          keyStatus.lastErrorTime = undefined;
        } else {
          // Increment error count
          keyStatus.errorCount++;
          keyStatus.lastError = error;
          keyStatus.lastErrorTime = new Date();
          
          // Deactivate key if too many errors
          if (keyStatus.errorCount >= 5) {
            keyStatus.isActive = false;
            console.log(`⚠️ API key deactivated due to ${keyStatus.errorCount} consecutive errors`);
            // Invalidate cache to force refresh
            this.availableKeysCache = [];
          }
        }

        // Async database update
        this.updateKeyStatusAsync(keyStatus);
      }

      return { success: true, data: undefined, metadata: {} };
    } catch (error: any) {
      return { success: false, error: error.message, metadata: {} };
    }
  }

  async handleRateLimit(apiKey: string, limitType: 'RPM' | 'RPD' | 'TPM'): Promise<ServiceResponse<void>> {
    try {
      const keyStatus = this.manager.keys.find(k => k.apiKey === apiKey);
      if (!keyStatus) {
        throw new Error('API key not found');
      }

      // Mark the specific limit as reached
      const limit = keyStatus.limits[limitType.toLowerCase() as keyof ApiKeyLimit] as any;
      limit.current = limit.limit; // Set to limit to indicate it's reached

      // Update error count
      keyStatus.errorCount++;
      keyStatus.lastError = `${limitType} rate limit exceeded`;
      keyStatus.lastErrorTime = new Date();

      // Invalidate cache to force refresh
      this.availableKeysCache = [];

      // Async database update
      this.updateKeyStatusAsync(keyStatus);

      console.log(`⚠️ Rate limit hit for ${limitType} on API key ${apiKey.substring(0, 8)}...`);

      return { success: true, data: undefined, metadata: {} };
    } catch (error: any) {
      return { success: false, error: error.message, metadata: {} };
    }
  }

  async getRateLimitInfo(apiKey: string): Promise<ServiceResponse<RateLimitInfo[]>> {
    try {
      const keyStatus = this.manager.keys.find(k => k.apiKey === apiKey);
      if (!keyStatus) {
        throw new Error('API key not found');
      }

      const limits = keyStatus.limits;
      const rateLimitInfo: RateLimitInfo[] = [
        {
          type: 'RPM',
          current: limits.rpm.current,
          limit: limits.rpm.limit,
          resetTime: limits.rpm.resetTime,
          isLimited: limits.rpm.current >= limits.rpm.limit
        },
        {
          type: 'RPD',
          current: limits.rpd.current,
          limit: limits.rpd.limit,
          resetTime: limits.rpd.resetTime,
          isLimited: limits.rpd.current >= limits.rpd.limit
        },
        {
          type: 'TPM',
          current: limits.tpm.current,
          limit: limits.tpm.limit,
          resetTime: limits.tpm.resetTime,
          isLimited: limits.tpm.current >= limits.tpm.limit
        }
      ];

      return { success: true, data: rateLimitInfo, metadata: {} };
    } catch (error: any) {
      return { success: false, error: error.message, metadata: {} };
    }
  }

  async getAllKeysStatus(): Promise<ServiceResponse<ApiKeyStatus[]>> {
    try {
      return { success: true, data: this.manager.keys, metadata: { totalKeys: this.manager.totalKeys } };
    } catch (error: any) {
      return { success: false, error: error.message, metadata: {} };
    }
  }

  async reactivateKey(apiKey: string): Promise<ServiceResponse<void>> {
    try {
      const keyStatus = this.manager.keys.find(k => k.apiKey === apiKey);
      if (!keyStatus) {
        throw new Error('API key not found');
      }

      keyStatus.isActive = true;
      keyStatus.errorCount = 0;
      keyStatus.lastError = undefined;
      keyStatus.lastErrorTime = undefined;

      await this.updateKeyStatus(keyStatus);

      return { success: true, data: undefined, metadata: {} };
    } catch (error: any) {
      return { success: false, error: error.message, metadata: {} };
    }
  }

  async resetAllLimits(): Promise<ServiceResponse<void>> {
    try {
      for (const keyStatus of this.manager.keys) {
        keyStatus.limits = this.createInitialLimits();
        await this.updateKeyStatus(keyStatus);
      }

      return { success: true, data: undefined, metadata: {} };
    } catch (error: any) {
      return { success: false, error: error.message, metadata: {} };
    }
  }

  private async updateKeyStatus(keyStatus: ApiKeyStatus): Promise<void> {
    await this.apiKeysCollection?.updateOne(
      { apiKey: keyStatus.apiKey },
      { $set: keyStatus },
      { upsert: true }
    );
  }

  async close(): Promise<void> {
    await this.client?.close();
  }

  // Smart rotation method - rotate before hitting limits
  async getNextKeyForRotation(): Promise<ServiceResponse<[string, ApiKeyStatus]>> {
    try {
      await this.refreshAvailableKeysCache();
      
      if (this.availableKeysCache.length === 0) {
        throw new Error('No active API keys available');
      }

      // Find key with lowest availability score for rotation
      const keyToRotate = this.availableKeysCache.reduce((lowest, current) => {
        const lowestScore = this.calculateAvailabilityScore(lowest);
        const currentScore = this.calculateAvailabilityScore(current);
        return currentScore < lowestScore ? current : lowest;
      });

      // If current key is getting close to limits, rotate
      const currentScore = this.calculateAvailabilityScore(keyToRotate);
      if (currentScore < this.ROTATION_THRESHOLD) {
        // Find next best key
        const nextKey = this.availableKeysCache.find(key => 
          key.apiKey !== keyToRotate.apiKey && 
          this.calculateAvailabilityScore(key) > this.ROTATION_THRESHOLD
        );
        
        if (nextKey) {
          nextKey.lastUsed = new Date();
          this.updateKeyStatusAsync(nextKey);
          
          return { 
            success: true, 
            data: [nextKey.apiKey, nextKey], 
            metadata: { 
              availabilityScore: this.calculateAvailabilityScore(nextKey),
              rotationReason: 'proactive-rotation',
              previousKeyScore: currentScore
            } 
          };
        }
      }

      // Use round-robin if no proactive rotation needed
      return this.getBestAvailableKey();
    } catch (error: any) {
      return { success: false, error: error.message, metadata: {} };
    }
  }

  // Force cache refresh
  async refreshCache(): Promise<ServiceResponse<void>> {
    try {
      this.availableKeysCache = [];
      this.lastCacheUpdate = 0;
      await this.refreshAvailableKeysCache();
      return { success: true, data: undefined, metadata: { cacheRefreshed: true } };
    } catch (error: any) {
      return { success: false, error: error.message, metadata: {} };
    }
  }
}

// Singleton instance
let apiKeyManagerInstance: ApiKeyManagerService | null = null;

export async function getApiKeyManager(): Promise<ApiKeyManagerService> {
  if (!apiKeyManagerInstance) {
    apiKeyManagerInstance = new ApiKeyManagerService();
    
    try {
      await apiKeyManagerInstance.initialize();
    } catch (error: any) {
      console.warn('⚠️ API Key Manager initialization failed, using in-memory mode:', error.message);
      // Continue with in-memory mode
    }
  }
  return apiKeyManagerInstance;
} 