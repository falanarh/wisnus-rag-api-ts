import dotenv from 'dotenv';

dotenv.config();

export class Settings {
  static MONGO_URI: string = process.env.MONGO_URI || 'mongodb://localhost:27017';
  static MONGO_DB_NAME: string = process.env.MONGO_DB_NAME || 'rag_db';
  static LANGSMITH_TRACING: boolean = process.env.LANGSMITH_TRACING === 'true';
}

export const settings = new Settings(); 