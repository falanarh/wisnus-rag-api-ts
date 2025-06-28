# LangSmith Setup untuk RAG Pipeline

## Overview

LangSmith adalah platform monitoring dan debugging untuk aplikasi AI/LLM. Dengan LangSmith, Anda dapat melihat node-node utama dalam pipeline RAG dan melacak setiap langkah proses dengan detail.

## Setup LangSmith

### 1. Daftar LangSmith Account

1. Kunjungi [LangSmith](https://smith.langchain.com/)
2. Daftar account baru atau login
3. Buat project baru dengan nama "wisnus-rag-pipeline"

### 2. Dapatkan API Key

1. Di dashboard LangSmith, klik pada profile icon
2. Pilih "API Keys"
3. Buat API key baru
4. Copy API key tersebut

### 3. Setup Environment Variables

Tambahkan environment variables berikut ke file `.env`:

```env
# LangSmith Configuration
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_PROJECT=wisnus-rag-pipeline
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

### 4. Install Dependencies

```bash
npm install langsmith
```

## Node-Node yang Akan Muncul di LangSmith

### 1. Main Pipeline Node
- **Nama**: `rag_pipeline`
- **Type**: Chain
- **Input**: Question dari user
- **Output**: Final answer dengan sources

### 2. Generate Queries Node
- **Nama**: `generate_queries`
- **Type**: Chain
- **Input**: Question
- **Output**: Array of 4 queries
- **Parent**: rag_pipeline

### 3. Retrieve Documents Node
- **Nama**: `retrieve_documents`
- **Type**: Chain
- **Input**: Queries array
- **Output**: Retrieved documents
- **Parent**: rag_pipeline

### 4. Rerank Documents Node
- **Nama**: `rerank_documents`
- **Type**: Chain
- **Input**: Retrieved documents + question
- **Output**: Reranked documents dengan similarity scores
- **Parent**: rag_pipeline

### 5. Generate Answer Node
- **Nama**: `generate_answer`
- **Type**: Chain
- **Input**: Reranked documents + question
- **Output**: Final answer
- **Parent**: rag_pipeline

## Melihat Traces di LangSmith

### 1. Dashboard Overview
- Buka [LangSmith Dashboard](https://smith.langchain.com/)
- Pilih project "wisnus-rag-pipeline"
- Lihat daftar runs yang telah dieksekusi

### 2. Detailed Trace View
- Klik pada salah satu run
- Anda akan melihat tree view dari semua node
- Setiap node menampilkan:
  - Input dan output
  - Execution time
  - Error messages (jika ada)
  - Metadata

### 3. Node Details
- Klik pada node tertentu untuk melihat detail
- Input/Output dalam format JSON
- Logs dan error messages
- Performance metrics

## Contoh Trace Structure

```
rag_pipeline
├── generate_queries
│   ├── Input: {"question": "Apa definisi dari eko wisata?"}
│   └── Output: {"queries": ["Eko wisata?", "Apa itu eko wisata?", ...]}
├── retrieve_documents
│   ├── Input: {"queries": ["Eko wisata?", ...]}
│   └── Output: {"retrieved_documents": [...], "count": 12}
├── rerank_documents
│   ├── Input: {"document_count": 12, "question": "..."}
│   └── Output: {"reranked_documents": [...], "count": 8}
└── generate_answer
    ├── Input: {"document_count": 8, "question": "..."}
    └── Output: {"answer": "...", "sources": [...]}
```

## Monitoring dan Debugging

### 1. Performance Monitoring
- Track execution time setiap node
- Identifikasi bottleneck
- Monitor error rates

### 2. Debugging
- Lihat input/output setiap node
- Trace error propagation
- Analyze query generation quality

### 3. Optimization
- Compare different runs
- A/B test different prompts
- Optimize similarity thresholds

## Error Handling

### 1. LangSmith Connection Issues
Jika LangSmith tidak dapat diakses:
- Pipeline tetap berjalan normal
- Warning akan muncul di console
- Tidak ada impact pada functionality

### 2. API Key Issues
Jika API key tidak valid:
- Tracing akan di-skip
- Pipeline tetap berfungsi
- Error akan di-log

## Best Practices

### 1. Naming Convention
- Gunakan nama node yang deskriptif
- Konsisten dalam naming
- Include version dalam project name

### 2. Metadata
- Tambahkan metadata yang relevan
- Include environment info
- Track model versions

### 3. Error Tracking
- Capture semua error dengan detail
- Include stack traces
- Add context information

## Troubleshooting

### 1. Node Tidak Muncul
- Pastikan LangSmith API key valid
- Check network connectivity
- Verify project name

### 2. Traces Tidak Update
- Refresh browser
- Check API key permissions
- Verify endpoint URL

### 3. Performance Issues
- Monitor API rate limits
- Check network latency
- Optimize payload size

## Integration dengan Existing Monitoring

LangSmith dapat digunakan bersamaan dengan monitoring yang sudah ada:

1. **Pipeline Info Endpoint**: Tetap berfungsi untuk real-time status
2. **Console Logging**: Tetap aktif untuk debugging
3. **LangSmith**: Tambahan untuk detailed tracing

## Cost Considerations

- LangSmith memiliki free tier
- Pay-per-use untuk usage tinggi
- Monitor usage di dashboard

## Security

- API key disimpan di environment variables
- Tidak ada sensitive data yang dikirim ke LangSmith
- Semua communication menggunakan HTTPS 