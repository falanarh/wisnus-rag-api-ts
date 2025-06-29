import * as fs from 'fs';
import * as path from 'path';

export interface Document {
  pageContent: string;
  metadata: {
    source: string;
    chunkId: string;
  };
  _id?: any; // Optional MongoDB _id for existing documents
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
        console.warn(`⚠️ Docs directory not found. Creating sample documents for testing.`);
        console.warn(`   Tried paths: ${possiblePaths.join(', ')}`);
        return this.createSampleDocuments();
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
    
    try {
      const files = fs.readdirSync(mdDir);
      console.log(`📂 Processing files in ${mdDir}:`, files);
      
      for (const file of files) {
        // Validate file is a string and has .md extension
        if (typeof file === 'string' && file && file.endsWith('.md')) {
          const mdPath = path.join(mdDir, file);
          console.log(`📄 Processing markdown file: ${file}`);
          
          try {
            const text = this.readMarkdown(mdPath);
            const paragraphs = this.splitText(text);
            
            // Buat Document untuk setiap paragraf
            for (let i = 0; i < paragraphs.length; i++) {
              const para = paragraphs[i];
              if (para && para.trim()) {
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
          } catch (fileError) {
            console.error(`❌ Error processing file ${file}:`, fileError);
            // Continue with other files
          }
        }
      }
      
      console.log(`✅ Processed ${allDocs.length} document chunks from ${mdDir}`);
      return allDocs;
      
    } catch (error) {
      console.error(`❌ Error reading directory ${mdDir}:`, error);
      return [];
    }
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

  private createSampleDocuments(): Document[] {
    console.log('📝 Creating sample documents for testing...');
    
    const sampleDocs: Document[] = [
      {
        pageContent: `Survei Wisatawan Nusantara adalah program survei yang dilakukan oleh Badan Pusat Statistik (BPS) untuk mengumpulkan data tentang karakteristik wisatawan domestik yang melakukan perjalanan wisata di Indonesia. Survei ini penting untuk memahami pola perjalanan wisatawan domestik dan membantu dalam pengembangan sektor pariwisata Indonesia.`,
        metadata: {
          source: 'sample_document_1.md',
          chunkId: 'sample_1_chunk_1'
        }
      },
      {
        pageContent: `Ekowisata adalah bentuk wisata yang bertanggung jawab terhadap lingkungan alam dengan melibatkan masyarakat setempat. Ekowisata bertujuan untuk melestarikan lingkungan dan meningkatkan kesejahteraan masyarakat lokal. Contoh ekowisata di Indonesia meliputi wisata hutan, wisata pantai, dan wisata gunung yang dikelola secara berkelanjutan.`,
        metadata: {
          source: 'sample_document_2.md',
          chunkId: 'sample_2_chunk_1'
        }
      },
      {
        pageContent: `Pariwisata berkelanjutan adalah konsep pengembangan pariwisata yang mempertimbangkan aspek ekonomi, sosial, dan lingkungan. Tujuannya adalah untuk memenuhi kebutuhan wisatawan saat ini tanpa mengorbankan kemampuan generasi mendatang untuk memenuhi kebutuhan mereka sendiri. Pariwisata berkelanjutan mencakup pengelolaan sumber daya yang efisien dan pelestarian budaya lokal.`,
        metadata: {
          source: 'sample_document_3.md',
          chunkId: 'sample_3_chunk_1'
        }
      }
    ];
    
    console.log(`✅ Created ${sampleDocs.length} sample documents`);
    return sampleDocs;
  }
} 