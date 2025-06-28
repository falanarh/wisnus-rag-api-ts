import * as fs from 'fs';
import * as path from 'path';

export interface Document {
  pageContent: string;
  metadata: {
    source: string;
    chunkId: string;
  };
}

export class MarkdownProcessor {
  constructor() {}

  processMarkdowns(directory: string = './docs'): Document[] {
    const mdDir = path.resolve(directory);
    this.validateDirectory(mdDir);
    return this.loadAndSplitMarkdowns(mdDir);
  }

  private validateDirectory(mdDir: string): void {
    if (!fs.existsSync(mdDir) || !fs.statSync(mdDir).isDirectory()) {
      throw new Error(`Invalid directory: ${mdDir}`);
    }
  }

  private loadAndSplitMarkdowns(mdDir: string): Document[] {
    const allDocs: Document[] = [];
    const files = fs.readdirSync(mdDir);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const mdPath = path.join(mdDir, file);
        const text = this.readMarkdown(mdPath);
        const paragraphs = this.splitText(text);
        
        // Buat Document untuk setiap paragraf
        for (let i = 0; i < paragraphs.length; i++) {
          const para = paragraphs[i];
          const doc: Document = {
            pageContent: para.trim(),
            metadata: {
              source: mdPath,
              chunkId: `${path.parse(file).name}_chunk_${i + 1}`
            }
          };
          allDocs.push(doc);
        }
      }
    }
    return allDocs;
  }

  private readMarkdown(mdPath: string): string {
    return fs.readFileSync(mdPath, 'utf-8');
  }

  private splitText(text: string): string[] {
    // Regex untuk memisahkan berdasarkan baris kosong
    const paragraphs = text.split(/\n\s*\n/);
    // Hapus entri kosong
    return paragraphs.filter(para => para.trim());
  }
} 