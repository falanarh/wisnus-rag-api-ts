# 🚀 Panduan Lengkap Deploy ke Vercel

## 📋 Daftar Isi
1. [Persiapan Sebelum Deploy](#persiapan-sebelum-deploy)
2. [Konfigurasi Environment Variables](#konfigurasi-environment-variables)
3. [Setup MongoDB Atlas](#setup-mongodb-atlas)
4. [Deploy ke Vercel](#deploy-ke-vercel)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🛠️ Persiapan Sebelum Deploy

### 1. **Persiapan Repository**
```bash
# Pastikan semua file sudah di-commit
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. **Verifikasi File Konfigurasi**
Pastikan file-file berikut sudah ada dan benar:

#### ✅ `vercel.json` (sudah ada)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/main.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/main.js"
    }
  ],
  "functions": {
    "dist/main.js": {
      "maxDuration": 30
    }
  }
}
```

#### ✅ `package.json` (sudah ada script vercel-build)
```json
{
  "scripts": {
    "build": "tsc",
    "vercel-build": "tsc",
    "start": "node dist/main.js"
  }
}
```

#### ✅ `.gitignore` (sudah ada)
- Memastikan `node_modules/`, `dist/`, `.env` tidak ter-commit

---

## 🔧 Konfigurasi Environment Variables

### 1. **Buat File `.env` untuk Production**
```bash
# Salin dari env.example
cp env.example .env.production
```

### 2. **Environment Variables yang Diperlukan**

#### **MongoDB Configuration**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rag_db?retryWrites=true&w=majority
MONGODB_DB_NAME=rag_db
MONGODB_COLLECTION_NAME=documents
```

#### **Server Configuration**
```env
PORT=3001
HOST=0.0.0.0
TIMEOUT=120000
```

#### **Gemini AI Configuration**
```env
GEMINI_API_KEY_1=your_first_api_key_here
GEMINI_API_KEY_2=your_second_api_key_here
GEMINI_API_KEY_3=your_third_api_key_here
# ... up to GEMINI_API_KEY_10
```

#### **CORS Configuration**
```env
CORS_ORIGINS=https://your-frontend-domain.com,https://another-domain.com
```

#### **Testing Configuration (Opsional)**
```env
TEST_CONCURRENT_REQUESTS=5
TEST_STRESS_BURST_REQUESTS=20
TEST_STRESS_BURST_INTERVAL=1000
TEST_STRESS_TOTAL_BURSTS=5
TEST_MONITORING_INTERVAL=5000
TEST_DURATION=300000
TEST_SAVE_RESULTS=true
TEST_RESULTS_DIR=./test-results
```

#### **Optional Configuration**
```env
# Add any additional configuration here
```

---

## 🗄️ Setup MongoDB Atlas

### 1. **Buat MongoDB Atlas Account**
1. Kunjungi [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Daftar account baru atau login
3. Buat project baru

### 2. **Buat Cluster**
1. Klik "Build a Database"
2. Pilih "FREE" tier (M0)
3. Pilih cloud provider (AWS/Google Cloud/Azure)
4. Pilih region terdekat
5. Klik "Create"

### 3. **Setup Database Access**
1. Menu → Database Access
2. Klik "Add New Database User"
3. Username: `rag_user`
4. Password: Generate secure password
5. Built-in Role: `Read and write to any database`
6. Klik "Add User"

### 4. **Setup Network Access**
1. Menu → Network Access
2. Klik "Add IP Address"
3. Klik "Allow Access from Anywhere" (0.0.0.0/0)
4. Klik "Confirm"

### 5. **Dapatkan Connection String**
1. Menu → Database
2. Klik "Connect"
3. Pilih "Connect your application"
4. Copy connection string
5. Replace `<password>` dengan password user
6. Replace `<dbname>` dengan `rag_db`

### 6. **Setup Vector Search Index**
1. Di MongoDB Atlas, pilih database `rag_db`
2. Pilih collection `documents`
3. Klik "Search" tab
4. Klik "Create Search Index"
5. Pilih "JSON Editor"
6. Paste konfigurasi berikut:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "dimensions": 768,
        "similarity": "cosine",
        "type": "knnVector"
      }
    }
  }
}
```

7. Klik "Create Index"

---

## 🚀 Deploy ke Vercel

### 1. **Install Vercel CLI**
```bash
npm install -g vercel
```

### 2. **Login ke Vercel**
```bash
vercel login
```

### 3. **Setup Project**
```bash
# Di root directory project
vercel
```

### 4. **Konfigurasi Environment Variables di Vercel**
```bash
# Set environment variables satu per satu
vercel env add MONGODB_URI
vercel env add MONGODB_DB_NAME
vercel env add MONGODB_COLLECTION_NAME
vercel env add GEMINI_API_KEY_1
vercel env add GEMINI_API_KEY_2
vercel env add GEMINI_API_KEY_3
vercel env add CORS_ORIGINS
```

### 5. **Deploy ke Production**
```bash
vercel --prod
```

### 6. **Verifikasi Deploy**
```bash
# Cek status deployment
vercel ls

# Cek logs
vercel logs
```

---

## ✅ Post-Deployment

### 1. **Test Health Check**
```bash
curl https://your-app.vercel.app/api/rag/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Wisnus RAG API is running",
  "rag_initialized": false,
  "vector_store_ready": false,
  "llm_ready": false
}
```

### 2. **Initialize RAG System**
```bash
curl -X POST https://your-app.vercel.app/api/rag/initialize
```

Expected response:
```json
{
  "message": "RAG system initialized"
}
```

### 3. **Test RAG Endpoint**
```bash
curl -X POST https://your-app.vercel.app/api/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "apa yang dimaksud dengan ekowisata?"}'
```

### 4. **Test Concurrent Endpoint**
```bash
curl -X POST https://your-app.vercel.app/api/rag/concurrent-test \
  -H "Content-Type: application/json" \
  -d '{"numRequests": 3}'
```

---

## 🔧 Troubleshooting

### **Error: Build Failed**
```bash
# Cek build logs
vercel logs

# Common issues:
# 1. TypeScript compilation errors
# 2. Missing dependencies
# 3. Environment variables not set
```

### **Error: MongoDB Connection Failed**
```bash
# 1. Verify MongoDB URI format
# 2. Check network access in MongoDB Atlas
# 3. Verify database user credentials
# 4. Check if cluster is active
```

### **Error: Gemini API Key Invalid**
```bash
# 1. Verify API keys are correct
# 2. Check API key quotas
# 3. Ensure API keys are enabled for Gemini
```

### **Error: Function Timeout**
```bash
# 1. Check vercel.json maxDuration setting
# 2. Consider upgrading to Vercel Pro for longer timeouts
# 3. Optimize RAG processing time
```

### **Error: CORS Issues**
```bash
# 1. Verify CORS_ORIGINS environment variable
# 2. Check frontend domain is included
# 3. Ensure HTTPS is used in production
```

---

## 📊 Monitoring & Maintenance

### 1. **Setup Monitoring**
```bash
# Monitor function invocations
vercel analytics

# Monitor function performance
vercel logs --follow
```

### 2. **Regular Maintenance**
- **Weekly**: Check MongoDB Atlas usage
- **Monthly**: Review API key usage
- **Quarterly**: Update dependencies

### 3. **Scaling Considerations**
- **Free Tier Limits**:
  - 100GB-hours execution time
  - 10-second function timeout
  - 100MB function size

- **Pro Tier Benefits**:
  - 1000GB-hours execution time
  - 60-second function timeout
  - 50MB function size
  - Custom domains

### 4. **Backup Strategy**
- MongoDB Atlas provides automatic backups
- Consider manual backup of important data
- Version control for code changes

---

## 🎯 Best Practices

### 1. **Security**
- ✅ Use environment variables for secrets
- ✅ Enable MongoDB Atlas security features
- ✅ Use HTTPS in production
- ✅ Implement rate limiting

### 2. **Performance**
- ✅ Optimize RAG processing time
- ✅ Use connection pooling for MongoDB
- ✅ Implement caching strategies
- ✅ Monitor function cold starts

### 3. **Reliability**
- ✅ Implement proper error handling
- ✅ Use retry mechanisms for API calls
- ✅ Monitor system health
- ✅ Set up alerts for failures

---

## 📞 Support

### **Vercel Support**
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Status](https://vercel-status.com/)

### **MongoDB Atlas Support**
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Community](https://community.mongodb.com/)

### **Project-Specific Issues**
- Check [SOLUTION_503_ERROR.md](./SOLUTION_503_ERROR.md)
- Review [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- Consult [PERFORMANCE_TESTING_GUIDE.md](./PERFORMANCE_TESTING_GUIDE.md)

---

## 🎉 Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Environment variables configured
- [ ] MongoDB Atlas cluster created
- [ ] Vector search index configured
- [ ] Vercel project created
- [ ] Environment variables set in Vercel
- [ ] Application deployed successfully
- [ ] Health check passes
- [ ] RAG system initialized
- [ ] Test endpoints working
- [ ] Monitoring configured
- [ ] Documentation updated

**🎊 Selamat! Aplikasi Anda telah berhasil di-deploy ke Vercel!** 