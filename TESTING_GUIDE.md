# Panduan Uji Coba Versi TypeScript

## 📋 Prasyarat

### 1. Install Node.js dan npm
```bash
# Pastikan Node.js versi 18+ terinstall
node --version
npm --version
```

### 2. Install MongoDB
```bash
# Install MongoDB Community Edition
# Atau gunakan MongoDB Atlas (cloud)
```

### 3. Dapatkan API Keys
- **Gemini API Key**: Dapatkan dari [Google AI Studio](https://makersuite.google.com/app/apikey)
- **MongoDB**: Pastikan MongoDB berjalan atau gunakan MongoDB Atlas

## 🚀 Langkah-langkah Uji Coba

### Step 1: Setup Environment
```bash
# Masuk ke direktori typescript
cd typescript

# Install dependencies
npm install

# Copy file environment
cp env.example .env

# Edit file .env dengan API keys Anda
nano .env
```

### Step 2: Konfigurasi Environment Variables
Edit file `.env` dengan nilai yang sesuai:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=rag_db
MONGODB_COLLECTION_NAME=documents

# Gemini AI Configuration (minimal 1 key)
GEMINI_API_KEY_1=your_api_key_here

# CORS
CORS_ORIGINS=http://localhost:3000
PORT=3001
```

### Step 3: Build Project
```bash
# Build TypeScript ke JavaScript
npm run build
```

### Step 4: Jalankan Server
```bash
# Development mode (dengan auto-reload)
npm run dev

# Production mode
npm start
```

### Step 5: Test API Endpoints

#### A. Manual Testing dengan curl

```bash
# 1. Health Check
curl http://localhost:3001/api/rag/health

# 2. Initialize RAG System
curl -X POST http://localhost:3001/api/rag/initialize

# 3. Ask Question
curl -X POST http://localhost:3001/api/rag/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Apa itu survei wisatawan nusantara?"
  }'

# 4. Evaluate System
curl -X POST http://localhost:3001/api/rag/evaluate
```

#### B. Automated Testing
```bash
# Jalankan script test otomatis
npm run test:api
```

#### C. Testing dengan Postman/Insomnia

**1. Health Check**
- Method: `GET`
- URL: `http://localhost:3001/api/rag/health`

**2. Initialize RAG**
- Method: `POST`
- URL: `http://localhost:3001/api/rag/initialize`

**3. Ask Question**
- Method: `POST`
- URL: `http://localhost:3001/api/rag/ask`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "question": "Apa definisi wisatawan nusantara menurut pedoman survei ini?"
}
```

**4. Evaluate System**
- Method: `POST`
- URL: `http://localhost:3001/api/rag/evaluate`

## 🔍 Expected Responses

### 1. Health Check Response
```json
{
  "status": "healthy",
  "message": "Wisnus RAG API is running",
  "rag_initialized": true,
  "vector_store_ready": true,
  "llm_ready": true
}
```

### 2. Initialize Response
```json
{
  "message": "RAG system initialized"
}
```

### 3. Ask Question Response
```json
{
  "answer": "Survei wisatawan nusantara adalah..."
}
```

## 🐛 Troubleshooting

### Error: "MongoDB connection failed"
```bash
# Pastikan MongoDB berjalan
mongod

# Atau gunakan MongoDB Atlas
# Update MONGODB_URI di .env
```

### Error: "Missing required environment variables"
```bash
# Pastikan semua environment variables terisi di .env
# Minimal: GEMINI_API_KEY_1, MONGODB_URI, MONGODB_DB_NAME
```

### Error: "429 Rate limit exceeded"
```bash
# Tambahkan lebih banyak API keys di .env
GEMINI_API_KEY_1=key1
GEMINI_API_KEY_2=key2
GEMINI_API_KEY_3=key3
```

### Error: "TypeScript compilation failed"
```bash
# Install dependencies
npm install

# Check TypeScript version
npx tsc --version

# Clean and rebuild
rm -rf dist/
npm run build
```

## 📊 Performance Testing

### Load Testing dengan Artillery
```bash
# Install Artillery
npm install -g artillery

# Test load
artillery quick --count 10 --num 5 http://localhost:3001/api/rag/health
```

### Memory Usage Monitoring
```bash
# Monitor memory usage
node --inspect dist/main.js

# Atau gunakan PM2
npm install -g pm2
pm2 start dist/main.js --name wisnus-rag-api
pm2 monit
```

## 🔄 Comparison Testing

### Bandingkan dengan Python Version
```bash
# Jalankan Python version di port 8000
cd ../
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Jalankan TypeScript version di port 3001
cd typescript
npm run dev

# Test kedua versi dengan pertanyaan yang sama
curl -X POST http://localhost:8000/api/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Apa definisi wisatawan nusantara?"}'

curl -X POST http://localhost:3001/api/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Apa definisi wisatawan nusantara?"}'
```

## ✅ Checklist Testing

- [ ] Environment variables terkonfigurasi
- [ ] MongoDB berjalan
- [ ] API keys valid
- [ ] Build berhasil
- [ ] Server berjalan di port 3001
- [ ] Health check berhasil
- [ ] RAG initialization berhasil
- [ ] Question answering berhasil
- [ ] Evaluation berhasil
- [ ] Streaming response berfungsi
- [ ] Error handling berfungsi
- [ ] API key rotation berfungsi
- [ ] Response format sesuai dengan schema
- [ ] Answer field berisi jawaban yang relevan
- [ ] Context field berisi dokumen yang relevan

## 🎯 Success Criteria

Uji coba dianggap berhasil jika:
1. Semua endpoint merespons dengan benar
2. RAG system menghasilkan jawaban yang akurat
3. Streaming response berfungsi
4. Error handling bekerja dengan baik
5. Performance acceptable (< 5 detik per request)
6. Memory usage stabil 