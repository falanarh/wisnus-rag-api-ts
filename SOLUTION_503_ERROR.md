# Solusi untuk Error 503 - Model Overloaded

## Masalah
Error yang terjadi:
```json
{
    "error": "Processing failed: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent: [503 Service Unavailable] The model is overloaded. Please try again later."
}
```

## Solusi yang Diimplementasikan

### 1. Multiple API Keys dengan Rotasi Otomatis
- Sistem sekarang mendukung multiple API keys Gemini
- Rotasi otomatis saat terjadi error 429 atau 503
- Konfigurasi di `.env`:
  ```
  GEMINI_API_KEY_1=your_first_api_key_here
  GEMINI_API_KEY_2=your_second_api_key_here
  GEMINI_API_KEY_3=your_third_api_key_here
  ```

### 2. Retry Mechanism dengan Exponential Backoff
- Retry otomatis dengan delay: 1s, 2s, 4s
- Maksimal 3 kali retry per model
- Logging detail untuk monitoring

### 3. Model Fallback
Jika `gemini-1.5-flash` overload, sistem akan mencoba:
1. `gemini-1.5-flash` (primary)
2. `gemini-1.5-pro` (fallback 1)
3. `gemini-pro` (fallback 2)

### 4. Request Timeout
- Timeout 30 detik per request
- Mencegah request yang hang terlalu lama

### 5. Error Handling yang Lebih Baik
- Response error yang informatif
- Status code yang sesuai (503, 429, 408)
- Saran retry time untuk client

## Cara Menggunakan

### 1. Setup Multiple API Keys
```bash
# Di file .env
GEMINI_API_KEY_1=your_first_key
GEMINI_API_KEY_2=your_second_key
GEMINI_API_KEY_3=your_third_key
```

### 2. Restart Server
```bash
npm run dev
```

### 3. Test dengan Script
```bash
node test-api.js
```

## Monitoring

Sistem akan menampilkan log seperti:
```
Attempt 1 failed with retryable error on model gemini-1.5-flash: 503 Service Unavailable
Waiting 1000ms before retry...
Successfully used model: gemini-1.5-pro
```

## Response Structure Baru

Endpoint `/api/rag/ask` sekarang mengembalikan:
```json
{
    "question": "apa yang dimaksud dengan ekowisata?",
    "context": [
        {
            "document": {
                "id": null,
                "metadata": {},
                "page_content": "...",
                "type": "Document"
            },
            "similarity_score": 0.9
        }
    ],
    "answer": "Ekowisata meliputi..."
}
```

## Best Practices

1. **Gunakan minimal 2-3 API keys** untuk redundancy
2. **Monitor logs** untuk melihat retry attempts
3. **Implement proper error handling** di client application
4. **Jangan kirim terlalu banyak request** secara bersamaan
5. **Wait dan retry** jika semua model overload

## Troubleshooting

### Jika masih error 503:
1. Pastikan ada multiple API keys di `.env`
2. Cek logs untuk melihat retry attempts
3. Tunggu beberapa menit dan coba lagi
4. Pastikan API keys valid dan aktif

### Jika request timeout:
1. Cek koneksi internet
2. Break down pertanyaan kompleks
3. Cek apakah server berjalan dengan baik 