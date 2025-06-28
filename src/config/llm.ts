import { GoogleGenerativeAI } from '@google/generative-ai';

// Ambil API key dari environment variable dengan format GEMINI_API_KEY_1, GEMINI_API_KEY_2, ...
const geminiKeys: string[] = [];
let i = 1;
while (true) {
  const key = process.env[`GEMINI_API_KEY_${i}`];
  if (!key) break;
  geminiKeys.push(key);
  i++;
}

if (geminiKeys.length === 0) {
  throw new Error('No Gemini API keys provided in environment variables');
}

let currentApiKeyIndex = 0;

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Helper function for exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to add timeout to a promise
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

export const getCurrentLlm = async (): Promise<GoogleGenerativeAI> => {
  console.log(`Membuat instance LLM dengan API key ke-${currentApiKeyIndex + 1}`);
  return new GoogleGenerativeAI(geminiKeys[currentApiKeyIndex]);
};

export const getNextLlm = async (): Promise<GoogleGenerativeAI> => {
  currentApiKeyIndex = (currentApiKeyIndex + 1) % geminiKeys.length;
  console.log(`Merotasi LLM dengan API key ke-${currentApiKeyIndex + 1}`);
  return new GoogleGenerativeAI(geminiKeys[currentApiKeyIndex]);
};

// Enhanced LLM invocation with retry mechanism
export const invokeWithRetry = async (
  llm: GoogleGenerativeAI, 
  prompt: string, 
  model: string = 'gemini-2.0-flash-lite'
): Promise<any> => {
  let lastError: any;
  
  // Define fallback models in order of preference
  const fallbackModels = ['gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
  
  for (const currentModel of fallbackModels) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const modelInstance = llm.getGenerativeModel({ model: currentModel });
        const result = await withTimeout(
          modelInstance.generateContent(prompt),
          REQUEST_TIMEOUT
        );
        console.log(`Successfully used model: ${currentModel}`);
        return result;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.toString();
        
        // Check if it's a retryable error (503, 429, timeout, or model overload)
        if (errorMessage.includes('503') || 
            errorMessage.includes('429') || 
            errorMessage.includes('overloaded') ||
            errorMessage.includes('Service Unavailable') ||
            errorMessage.includes('timeout')) {
          
          console.log(`Attempt ${attempt + 1} failed with retryable error on model ${currentModel}: ${errorMessage}`);
          
          // Calculate delay with exponential backoff
          const delay = BASE_DELAY * Math.pow(2, attempt);
          console.log(`Waiting ${delay}ms before retry...`);
          await sleep(delay);
          
          // If we have multiple API keys, try rotating to the next one
          if (geminiKeys.length > 1) {
            await getNextLlm();
            llm = await getCurrentLlm();
          }
          
          continue;
        } else {
          // Non-retryable error, try next model
          console.log(`Non-retryable error on model ${currentModel}, trying next model...`);
          break;
        }
      }
    }
  }
  
  // All retries and models exhausted
  throw new Error(`All retry attempts and models failed. Last error: ${lastError?.message || lastError}`);
};

export { geminiKeys }; 