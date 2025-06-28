import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

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

// LangChain ChatGoogleGenerativeAI wrapper
export const getCurrentLlm = async (model: string = 'gemini-2.0-flash-lite') => {
  return new ChatGoogleGenerativeAI({
    apiKey: geminiKeys[currentApiKeyIndex],
    model,
    maxOutputTokens: 2048,
    temperature: 0.2,
    streaming: false,
  });
};

export const getNextLlm = async (model: string = 'gemini-2.0-flash-lite') => {
  currentApiKeyIndex = (currentApiKeyIndex + 1) % geminiKeys.length;
  return getCurrentLlm(model);
};

// Enhanced LLM invocation with retry mechanism (LangChain chat)
export async function invokeWithRetry(llm: ChatGoogleGenerativeAI, messages: any[]): Promise<string> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 LLM attempt ${attempt}/${maxRetries}`);
      
      const result = await llm.invoke(messages);
      
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
      
      console.error(`❌ LLM attempt ${attempt} failed:`, errorMessage);
      
      if (errorMessage.includes('429')) {
        console.log('🔄 Rate limit detected, rotating API key...');
        llm = await getNextLlm();
        continue;
      }
      
      if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
        console.log('🔄 Model overloaded, trying different model...');
        llm = await getNextLlm();
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

export { geminiKeys }; 