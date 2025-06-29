import { LLMHolder } from '../services/ragService';
import { getCurrentLlm, invokeWithRetry } from './llm';
import { getApiKeyManager } from '../services/apiKeyManager';

export class RotatingLlmWrapper {
  private llmHolder: LLMHolder;
  private consecutiveErrors = 0;
  private readonly MAX_CONSECUTIVE_ERRORS = 3;

  constructor(llmHolder: LLMHolder) {
    this.llmHolder = llmHolder;
  }

  async acall(messages: any): Promise<any> {
    let attempts = 0;
    const maxAttempts = 5; // Reduced from total keys to avoid infinite loops
    
    while (attempts < maxAttempts) {
      try {
        // Check if we should rotate proactively
        if (attempts > 0 || this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
          await this.rotateApiKeyProactively();
          this.consecutiveErrors = 0; // Reset error counter
        }

        // Use LangChain's invokeWithRetry for better error handling
        const result = await invokeWithRetry(this.llmHolder.llm, messages);
        
        // Reset error counter on success
        this.consecutiveErrors = 0;
        return result;
      } catch (error: any) {
        this.consecutiveErrors++;
        attempts++;
        
        if (error.toString().includes('429')) {
          console.log(`🔄 Rate limit detected, rotating API key (attempt ${attempts}/${maxAttempts})`);
          await this.rotateApiKeyOnError();
        } else if (error.toString().includes('503') || error.toString().includes('overloaded')) {
          console.log(`🔄 Model overloaded, rotating API key (attempt ${attempts}/${maxAttempts})`);
          await this.rotateApiKeyOnError();
        } else {
          // For other errors, try rotating anyway if we have consecutive errors
          if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
            console.log(`🔄 Too many consecutive errors, rotating API key (attempt ${attempts}/${maxAttempts})`);
            await this.rotateApiKeyOnError();
          }
        }
      }
    }
    throw new Error('Semua API key telah digunakan karena batas rate limit.');
  }

  private async rotateApiKeyOnError(): Promise<void> {
    try {
      // Get new LLM with different API key
      this.llmHolder.llm = await getCurrentLlm();
    } catch (error) {
      console.warn('⚠️ Failed to rotate API key on error:', error);
    }
  }

  private async rotateApiKeyProactively(): Promise<void> {
    try {
      const apiKeyManager = await getApiKeyManager();
      const result = await apiKeyManager.getNextKeyForRotation();
      
      if (result.success && result.data) {
        const [apiKey, keyStatus] = result.data;
        console.log(`🔄 Proactive rotation: ${apiKey.substring(0, 8)}... (score: ${result.metadata?.availabilityScore?.toFixed(2)})`);
        
        // Create new LLM with the rotated key
        this.llmHolder.llm = await getCurrentLlm();
      } else {
        // Fallback to regular rotation
        await this.rotateApiKeyOnError();
      }
    } catch (error) {
      console.warn('⚠️ Failed to rotate API key proactively:', error);
      await this.rotateApiKeyOnError();
    }
  }
} 