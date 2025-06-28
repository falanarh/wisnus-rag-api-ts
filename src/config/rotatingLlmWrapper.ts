import { LLMHolder } from '../services/ragService';
import { getNextLlm, geminiKeys } from './llm';

export class RotatingLlmWrapper {
  private llmHolder: LLMHolder;

  constructor(llmHolder: LLMHolder) {
    this.llmHolder = llmHolder;
  }

  async acall(messages: any): Promise<any> {
    let attempts = 0;
    const maxAttempts = geminiKeys.length;
    
    while (attempts < maxAttempts) {
      try {
        // Panggil LLM menggunakan instance yang ada di llm_holder
        const model = this.llmHolder.llm.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        const result = await model.generateContent(messages);
        return result;
      } catch (error: any) {
        if (error.toString().includes('429')) {
          attempts++;
          // Jika error 429, rotasi API key dengan mendapatkan instance LLM baru
          this.llmHolder.llm = await getNextLlm();
          console.log(`Rotasi API key: percobaan ${attempts}/${maxAttempts}`);
        } else {
          throw error;
        }
      }
    }
    throw new Error('Semua API key telah digunakan karena batas rate limit.');
  }
} 