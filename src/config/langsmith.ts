import { Client } from 'langsmith';
import { Settings } from '../configuration';

export class LangSmithConfig {
  private static client: Client | null = null;

  static initialize(): void {
    if (Settings.LANGSMITH_TRACING) {
      try {
        this.client = new Client({
          apiKey: process.env.LANGSMITH_API_KEY,
          project: process.env.LANGSMITH_PROJECT || 'wisnus-rag-api',
        });
        console.log('✅ LangSmith tracing initialized');
      } catch (error) {
        console.error('❌ Failed to initialize LangSmith:', error);
        this.client = null;
      }
    } else {
      console.log('ℹ️ LangSmith tracing disabled');
    }
  }

  static getClient(): Client | null {
    return this.client;
  }

  static isEnabled(): boolean {
    return Settings.LANGSMITH_TRACING && this.client !== null;
  }

  static async traceLLMCall(
    modelName: string,
    prompt: string,
    response: string,
    metadata?: any
  ): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      await this.client!.createRun({
        name: 'LLM Call',
        run_type: 'llm',
        inputs: { prompt },
        outputs: { response },
        extra: {
          model: modelName,
          ...metadata
        }
      });
    } catch (error) {
      console.error('❌ Failed to trace LLM call:', error);
    }
  }

  static async traceVectorSearch(
    query: string,
    results: any[],
    metadata?: any
  ): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      await this.client!.createRun({
        name: 'Vector Search',
        run_type: 'tool',
        inputs: { query },
        outputs: { results: results.length },
        extra: {
          search_type: 'similarity',
          ...metadata
        }
      });
    } catch (error) {
      console.error('❌ Failed to trace vector search:', error);
    }
  }

  static async traceRAGChain(
    question: string,
    context: any[],
    answer: string,
    metadata?: any
  ): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      await this.client!.createRun({
        name: 'RAG Chain',
        run_type: 'chain',
        inputs: { question },
        outputs: { 
          answer,
          context_count: context.length 
        },
        extra: {
          chain_type: 'rag',
          ...metadata
        }
      });
    } catch (error) {
      console.error('❌ Failed to trace RAG chain:', error);
    }
  }
} 