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

  processMarkdowns(directory?: string): Document[] {
    // Handle Vercel deployment path
    let mdDir: string | undefined;
    
    if (directory) {
      mdDir = path.resolve(directory);
    } else {
      // Try different possible paths for Vercel deployment
      const possiblePaths = [
        './docs',                    // Local development
        '/var/task/docs',           // Vercel deployment
        '/var/task/src/docs',       // Vercel with src structure
        path.join(process.cwd(), 'docs'),  // Current working directory
        path.join(process.cwd(), 'src', 'docs')  // Current working directory with src
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath) && fs.statSync(possiblePath).isDirectory()) {
          mdDir = possiblePath;
          console.log(`📁 Found docs directory at: ${mdDir}`);
          break;
        }
      }
      
      if (!mdDir) {
        throw new Error(`Docs directory not found. Tried paths: ${possiblePaths.join(', ')}`);
      }
    }
    
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
    
    console.log(`📂 Processing files in ${mdDir}:`, files);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const mdPath = path.join(mdDir, file);
        console.log(`📄 Processing markdown file: ${file}`);
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
    
    console.log(`✅ Processed ${allDocs.length} document chunks from ${mdDir}`);
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