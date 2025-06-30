import dotenv from 'dotenv';

dotenv.config();

export class Settings {
  // MongoDB Configuration
  static MONGO_URI: string = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
  static MONGO_DB_NAME: string = process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || 'rag_db';
  static MONGO_COLLECTION_NAME: string = process.env.MONGODB_COLLECTION_NAME || 'documents';
  
  // Server Configuration
  static PORT: number = parseInt(process.env.PORT || '3001');
  static HOST: string = process.env.HOST || 'localhost';
  static TIMEOUT: number = parseInt(process.env.TIMEOUT || '120000');
  
  // CORS Configuration
  static CORS_ORIGINS: string = process.env.CORS_ORIGINS || 'http://localhost:3000';
  
  // Gemini API Keys (support multiple keys)
  static getGeminiApiKeys(): string[] {
    // Ambil semua env var yang namanya diawali GEMINI_API_KEY_
    const keys = Object.entries(process.env)
      .filter(([k, v]) => k.startsWith('GEMINI_API_KEY_') && v)
      // Urutkan berdasarkan angka di belakangnya
      .sort((a, b) => {
        const numA = parseInt(a[0].replace('GEMINI_API_KEY_', ''), 10);
        const numB = parseInt(b[0].replace('GEMINI_API_KEY_', ''), 10);
        return numA - numB;
      })
      .map(([_, v]) => v as string);
    return keys;
  }
  
  // LangSmith Configuration (Optional)
  static LANGSMITH_API_KEY: string = process.env.LANGSMITH_API_KEY || '';
  static LANGSMITH_PROJECT: string = process.env.LANGSMITH_PROJECT || 'wisnus-rag-pipeline';
  static LANGSMITH_ENDPOINT: string = process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com';
}

export const settings = new Settings(); 