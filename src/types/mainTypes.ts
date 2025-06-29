export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  metadata: Record<string, any>;
  error?: string;
}

export interface KeyState {
  currentIndex: number;
  keys: string[];
}

// New types for enhanced API key management
export interface ApiKeyLimit {
  rpm: {
    current: number;
    limit: number;
    resetTime: Date;
  };
  rpd: {
    current: number;
    limit: number;
    resetTime: Date;
  };
  tpm: {
    current: number;
    limit: number;
    resetTime: Date;
  };
}

export interface ApiKeyStatus {
  apiKey: string;
  isActive: boolean;
  lastUsed: Date;
  limits: ApiKeyLimit;
  errorCount: number;
  lastError?: string;
  lastErrorTime?: Date;
}

export interface ApiKeyManager {
  keys: ApiKeyStatus[];
  currentIndex: number;
  totalKeys: number;
  lastRotation: Date;
}

export interface RateLimitInfo {
  type: 'RPM' | 'RPD' | 'TPM';
  current: number;
  limit: number;
  resetTime: Date;
  isLimited: boolean;
}

export interface ApiKeyUsage {
  apiKey: string;
  timestamp: Date;
  tokensUsed: number;
  success: boolean;
  error?: string;
  responseTime: number;
} 