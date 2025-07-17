import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { getApiKeyManager } from '../services/apiKeyManager';
import { Settings } from '../configuration';

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Helper function for exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fallback function to get API key directly from environment
const getFallbackApiKey = (): string => {
  const apiKeys = Settings.getGeminiApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys found. Please set GEMINI_API_KEY_1 in your environment variables.');
  }
  return apiKeys[0];
};

// LangChain ChatGoogleGenerativeAI wrapper with API key management
export const getCurrentLlm = async (model: string = 'gemini-2.0-flash') => {
  try {
    // Try to use API key manager first
    const apiKeyManager = await getApiKeyManager();
    const result = await apiKeyManager.getBestAvailableKey();
    
    if (result.success && result.data) {
      const [apiKey, keyStatus] = result.data;
      console.log(`🔑 Using managed API key: ${apiKey.substring(0, 8)}...`);
      
      return new ChatGoogleGenerativeAI({
        apiKey,
        model,
        maxOutputTokens: 2048,
        temperature: 0.2,
        streaming: false,
      });
    }
  } catch (error: any) {
    console.warn('⚠️ API Key Manager failed, using fallback:', error.message);
  }
  
  // Fallback to direct environment variable
  const apiKey = getFallbackApiKey();
  console.log(`🔑 Using fallback API key: ${apiKey.substring(0, 8)}...`);
  
  return new ChatGoogleGenerativeAI({
    apiKey,
    model,
    maxOutputTokens: 2048,
    temperature: 0.2,
    streaming: false,
  });
};

// Enhanced LLM invocation with retry mechanism and API key management
export async function invokeWithRetry(llm: ChatGoogleGenerativeAI, messages: any[]): Promise<string> {
  const maxRetries = 3;
  let lastError: any;
  let currentApiKey = '';
  let tokensUsed = 0;
  const startTime = Date.now();

  // Extract API key from LLM instance for tracking
  try {
    currentApiKey = (llm as any).apiKey || '';
  } catch (error) {
    console.warn('Could not extract API key from LLM instance');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 LLM attempt ${attempt}/${maxRetries}`);
      
      const result = await llm.invoke(messages);
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Estimate tokens used (rough calculation)
      const inputTokens = messages.reduce((acc, msg) => {
        const content = msg.content;
        if (typeof content === 'string') {
          return acc + content.length / 4;
        }
        return acc;
      }, 0);
      
      const outputTokens = typeof (result as any) === 'string' ? (result as any).length / 4 : 
                          (result && typeof result === 'object' && 'content' in result) ? 
                          (typeof (result as any).content === 'string' ? (result as any).content.length / 4 : 0) : 0;
      
      tokensUsed = Math.round(inputTokens + outputTokens);
      
      // Record successful usage
      if (currentApiKey) {
        try {
          const apiKeyManager = await getApiKeyManager();
          await apiKeyManager.recordUsage(currentApiKey, tokensUsed, true, undefined, responseTime);
        } catch (usageError) {
          console.warn('⚠️ Failed to record usage:', usageError);
        }
      }
      
      // Handle different response types
      if (typeof result === 'string') {
        return result;
      } else if (result && typeof result === 'object' && 'content' in result) {
        const content = result.content;
        if (typeof content === 'string') {
          return content;
        } else if (Array.isArray(content)) {
          // Handle array of content parts
          return content.map(part => 
            typeof part === 'string' ? part : 
            typeof part === 'object' && 'text' in part ? part.text : 
            JSON.stringify(part)
          ).join('');
        }
      }
      
      // Fallback: convert to string
      return String(result);
      
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.toString();
      const responseTime = Date.now() - startTime;
      
      console.error(`❌ LLM attempt ${attempt} failed:`, errorMessage);
      
      // Record failed usage
      if (currentApiKey) {
        try {
          const apiKeyManager = await getApiKeyManager();
          await apiKeyManager.recordUsage(currentApiKey, tokensUsed, false, errorMessage, responseTime);
        } catch (usageError) {
          console.warn('⚠️ Failed to record failed usage:', usageError);
        }
      }
      
      // Handle rate limiting
      if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        console.log('🔄 Rate limit detected, handling...');
        
        if (currentApiKey) {
          try {
            const apiKeyManager = await getApiKeyManager();
            
            // Determine which type of rate limit was hit
            let limitType: 'RPM' | 'RPD' | 'TPM' = 'RPM'; // Default to RPM
            if (errorMessage.includes('daily') || errorMessage.includes('day')) {
              limitType = 'RPD';
            } else if (errorMessage.includes('token') || errorMessage.includes('TPM')) {
              limitType = 'TPM';
            }
            
            await apiKeyManager.handleRateLimit(currentApiKey, limitType);
          } catch (rateLimitError) {
            console.warn('⚠️ Failed to handle rate limit:', rateLimitError);
          }
        }
        
        // Get new LLM with different API key
        llm = await getCurrentLlm();
        currentApiKey = (llm as any).apiKey || '';
        continue;
      }
      
      // Handle model overloaded
      if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
        console.log('🔄 Model overloaded, trying different API key...');
        llm = await getCurrentLlm();
        currentApiKey = (llm as any).apiKey || '';
        continue;
      }
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`All ${maxRetries} LLM attempts failed. Last error: ${lastError?.message || lastError}`);
}

// Function to get API key status for monitoring
export async function getApiKeyStatus(): Promise<any> {
  try {
    const apiKeyManager = await getApiKeyManager();
    return await apiKeyManager.getAllKeysStatus();
  } catch (error: any) {
    return { success: false, error: error.message, metadata: {} };
  }
}

// Function to get rate limit info for a specific API key
export async function getRateLimitInfo(apiKey: string): Promise<any> {
  try {
    const apiKeyManager = await getApiKeyManager();
    return await apiKeyManager.getRateLimitInfo(apiKey);
  } catch (error: any) {
    return { success: false, error: error.message, metadata: {} };
  }
}

// Function to reactivate a deactivated API key
export async function reactivateApiKey(apiKey: string): Promise<any> {
  try {
    const apiKeyManager = await getApiKeyManager();
    return await apiKeyManager.reactivateKey(apiKey);
  } catch (error: any) {
    return { success: false, error: error.message, metadata: {} };
  }
} 