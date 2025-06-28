# LangGraph Implementation untuk Pipeline RAG

## Overview

Implementasi LangGraph telah ditambahkan ke dalam sistem RAG untuk membuat pipeline yang lebih terstruktur dan mudah di-debug. LangGraph memungkinkan kita untuk mengorganisir setiap langkah dalam pipeline RAG dengan lebih baik dan memberikan visibilitas yang lebih baik terhadap proses yang sedang berjalan.

## Struktur Pipeline

Pipeline RAG menggunakan LangGraph terdiri dari 4 node utama:

### 1. Generate Queries (`generate_queries`)
- **Fungsi**: Menghasilkan 4 query berbeda dari pertanyaan pengguna
- **Input**: Pertanyaan pengguna
- **Output**: Array of 4 queries
- **Log**: `🔍 Generating queries for: [question]`

### 2. Retrieve Documents (`retrieve_documents`)
- **Fungsi**: Mencari dokumen relevan menggunakan vector search
- **Input**: Array of queries
- **Output**: Array of retrieved documents
- **Log**: `📚 Retrieving documents...`

### 3. Rerank Documents (`rerank_documents`)
- **Fungsi**: Mererank dokumen berdasarkan relevansi terhadap pertanyaan
- **Input**: Retrieved documents
- **Output**: Reranked documents dengan similarity score
- **Log**: `🔄 Reranking documents...`

### 4. Generate Answer (`generate_answer`)
- **Fungsi**: Menghasilkan jawaban final berdasarkan dokumen yang telah direrank
- **Input**: Reranked documents
- **Output**: Final answer dengan sources
- **Log**: `💡 Generating answer...`

## State Management

Setiap node menggunakan state yang terstruktur:

```typescript
interface RAGState {
  question: string;
  context: RetrievedDocument[];
  answer: string;
  sources?: string[];
  queries?: string[];
  retrieved_documents?: RetrievedDocument[];
  reranked_documents?: RetrievedDocument[];
  error?: string;
  step?: string;
}
```

## Error Handling

Pipeline memiliki error handling yang robust:
- Setiap node dapat mengembalikan error state
- Conditional edges memastikan pipeline berhenti jika terjadi error
- Error messages disimpan dalam state untuk debugging

## File Structure

```
src/services/
├── ragGraph.ts          # LangGraph implementation
├── ragService.ts        # Updated service with LangGraph
└── ...

src/controllers/
└── ragController.ts     # Updated controller with pipeline info endpoint

src/routes/
└── ragRoutes.ts         # Updated routes with pipeline info endpoint
```

## API Endpoints

### 1. Ask Question (Existing)
```http
POST /api/rag/ask
Content-Type: application/json

{
  "question": "Apa definisi dari eko wisata?"
}
```

### 2. Pipeline Info (New)
```http
GET /api/rag/pipeline-info?question=Apa definisi dari eko wisata?
```

Response:
```json
{
  "success": true,
  "question": "Apa definisi dari eko wisata?",
  "pipelineInfo": {
    "step": "answer_generated",
    "queries": ["Eko wisata?", "Apa itu eko wisata?", "Jelaskan tentang eko wisata?", "Definisi dari eko wisata"],
    "retrievedCount": 12,
    "rerankedCount": 8,
    "error": null
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Benefits of LangGraph Implementation

### 1. **Structured Pipeline**
- Setiap langkah terdefinisi dengan jelas
- Flow yang mudah dipahami dan di-maintain

### 2. **Better Debugging**
- State tracking di setiap langkah
- Logging yang terstruktur
- Error handling yang lebih baik

### 3. **Modularity**
- Setiap node dapat di-test secara independen
- Mudah untuk menambah/mengurangi langkah

### 4. **Observability**
- Pipeline info endpoint untuk monitoring
- Step tracking untuk debugging
- Performance metrics per step

### 5. **Extensibility**
- Mudah menambah node baru
- Conditional routing berdasarkan state
- Parallel processing capabilities

## Usage Examples

### Basic Usage
```typescript
import { createRAGGraph } from './services/ragGraph';

const graph = createRAGGraph(vectorStore);
const result = await graph.invoke({
  question: "Apa definisi dari eko wisata?",
  context: [],
  answer: "",
  step: "initialized"
});
```

### Pipeline Info
```typescript
import { getRAGPipelineInfo } from './services/ragService';

const info = await getRAGPipelineInfo(vectorStore, "Apa definisi dari eko wisata?");
console.log(`Pipeline step: ${info.step}`);
console.log(`Generated queries: ${info.queries?.join(', ')}`);
```

## Migration from Legacy

Legacy functions masih tersedia untuk backward compatibility:
- `multiQueryRetrievalChain()` - deprecated, gunakan LangGraph
- `retrieve()` - deprecated, gunakan LangGraph  
- `rerankNode()` - deprecated, gunakan LangGraph
- `generate()` - deprecated, gunakan LangGraph

Semua legacy functions akan menampilkan warning dan menggunakan LangGraph di background.

## Performance Considerations

1. **State Persistence**: State disimpan di memory, tidak ada persistence
2. **Error Recovery**: Pipeline berhenti pada error pertama
3. **Memory Usage**: Setiap state update membuat copy baru
4. **Concurrency**: LangGraph mendukung concurrent execution

## Future Enhancements

1. **Parallel Processing**: Menjalankan beberapa node secara parallel
2. **State Persistence**: Menyimpan state ke database
3. **Custom Nodes**: Menambah node custom untuk preprocessing
4. **Conditional Routing**: Routing berdasarkan content analysis
5. **Metrics Collection**: Detailed performance metrics 