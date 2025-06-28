# 🌐 Panduan Deploy via GUI Web Vercel

## 📋 Daftar Isi
1. [Persiapan Repository](#persiapan-repository)
2. [Setup Vercel Account](#setup-vercel-account)
3. [Import Project](#import-project)
4. [Konfigurasi Build](#konfigurasi-build)
5. [Environment Variables](#environment-variables)
6. [Deploy](#deploy)
7. [Post-Deployment Setup](#post-deployment-setup)
8. [Troubleshooting](#troubleshooting)

---

## 🛠️ Persiapan Repository

### 1. **Pastikan Repository Siap**
```bash
# Commit semua perubahan
git add .
git commit -m "Prepare for Vercel web deployment"
git push origin main
```

### 2. **Verifikasi File Konfigurasi**
Pastikan file-file berikut sudah ada di repository:

#### ✅ `vercel.json`
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

#### ✅ `package.json` (dengan script vercel-build)
```json
{
  "scripts": {
    "build": "tsc",
    "vercel-build": "tsc",
    "start": "node dist/main.js"
  }
}
```

#### ✅ `.gitignore`
- Memastikan `node_modules/`, `dist/`, `.env` tidak ter-commit

---

## 🔐 Setup Vercel Account

### 1. **Buat Account Vercel**
1. Kunjungi [vercel.com](https://vercel.com)
2. Klik "Sign Up"
3. Pilih salah satu opsi:
   - **GitHub**: Recommended untuk developer
   - **GitLab**: Jika menggunakan GitLab
   - **Bitbucket**: Jika menggunakan Bitbucket
   - **Email**: Sign up dengan email

### 2. **Verifikasi Email**
1. Cek email untuk verifikasi
2. Klik link verifikasi
3. Setup profile Vercel

### 3. **Connect Repository Provider**
1. Di dashboard Vercel, klik "Add New..."
2. Pilih "Project"
3. Authorize Vercel untuk mengakses repository

---

## 📥 Import Project

### 1. **Pilih Repository**
1. Login ke [vercel.com/dashboard](https://vercel.com/dashboard)
2. Klik "Add New..." → "Project"
3. Pilih repository `wisnus-rag-api-ts`
4. Klik "Import"

### 2. **Konfigurasi Project**
1. **Project Name**: `wisnus-rag-api-ts` (atau nama yang diinginkan)
2. **Framework Preset**: `Node.js`
3. **Root Directory**: `./` (biarkan kosong)
4. **Build Command**: `npm run vercel-build`
5. **Output Directory**: `dist`
6. **Install Command**: `npm install`

### 3. **Environment Variables Setup**
**JANGAN KLIK DEPLOY DULU!** Kita perlu setup environment variables terlebih dahulu.

---

## ⚙️ Konfigurasi Build

### 1. **Build Settings**
Di halaman konfigurasi project, pastikan:

#### **General Settings**
- **Framework Preset**: `Node.js`
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### **Advanced Settings**
- **Node.js Version**: `18.x` (atau sesuai package.json)
- **Include source files outside of the Root Directory**: `No`

### 2. **Function Configuration**
Di `vercel.json` sudah dikonfigurasi:
- **maxDuration**: 30 detik
- **Memory**: Default (1024 MB)

---

## 🔧 Environment Variables

### 1. **Setup Environment Variables**
1. Di halaman konfigurasi project, scroll ke "Environment Variables"
2. Klik "Add" untuk setiap variable

### 2. **Tambahkan Variables Berikut**

#### **MongoDB Configuration**
```
Name: MONGODB_URI
Value: mongodb+srv://username:password@cluster.mongodb.net/rag_db?retryWrites=true&w=majority
Environment: Production, Preview, Development

Name: MONGODB_DB_NAME
Value: rag_db
Environment: Production, Preview, Development

Name: MONGODB_COLLECTION_NAME
Value: documents
Environment: Production, Preview, Development
```

#### **Server Configuration**
```
Name: PORT
Value: 3001
Environment: Production, Preview, Development

Name: HOST
Value: 0.0.0.0
Environment: Production, Preview, Development

Name: TIMEOUT
Value: 120000
Environment: Production, Preview, Development
```

#### **Gemini AI Configuration**
```
Name: GEMINI_API_KEY_1
Value: your_first_api_key_here
Environment: Production, Preview, Development

Name: GEMINI_API_KEY_2
Value: your_second_api_key_here
Environment: Production, Preview, Development

Name: GEMINI_API_KEY_3
Value: your_third_api_key_here
Environment: Production, Preview, Development
```

#### **CORS Configuration**
```
Name: CORS_ORIGINS
Value: https://your-frontend-domain.com,https://another-domain.com
Environment: Production, Preview, Development
```

#### **Testing Configuration (Opsional)**
```
Name: TEST_CONCURRENT_REQUESTS
Value: 5
Environment: Production, Preview, Development

Name: TEST_STRESS_BURST_REQUESTS
Value: 20
Environment: Production, Preview, Development

Name: TEST_STRESS_BURST_INTERVAL
Value: 1000
Environment: Production, Preview, Development

Name: TEST_STRESS_TOTAL_BURSTS
Value: 5
Environment: Production, Preview, Development

Name: TEST_MONITORING_INTERVAL
Value: 5000
Environment: Production, Preview, Development

Name: TEST_DURATION
Value: 300000
Environment: Production, Preview, Development

Name: TEST_SAVE_RESULTS
Value: true
Environment: Production, Preview, Development

Name: TEST_RESULTS_DIR
Value: ./test-results
Environment: Production, Preview, Development
```

#### **Optional Configuration**
```
Name: LANGSMITH_TRACING
Value: false
Environment: Production, Preview, Development
```

### 3. **Verifikasi Environment Variables**
1. Pastikan semua variables sudah ditambahkan
2. Check bahwa environment "Production" dipilih untuk semua
3. Klik "Save" untuk menyimpan

---

## 🚀 Deploy

### 1. **Deploy Project**
1. Setelah semua environment variables diset, klik "Deploy"
2. Tunggu proses build selesai (biasanya 2-5 menit)
3. Monitor progress di halaman deployment

### 2. **Monitor Build Process**
1. **Installing dependencies**: npm install
2. **Building project**: npm run vercel-build
3. **Deploying**: Upload ke Vercel infrastructure

### 3. **Build Success Indicators**
- ✅ Build completed successfully
- ✅ Function deployed
- ✅ Domain assigned

### 4. **Domain Assignment**
Setelah deploy berhasil, Vercel akan memberikan:
- **Production URL**: `https://your-project-name.vercel.app`
- **Preview URL**: `https://your-project-name-git-main-your-username.vercel.app`

---

## ✅ Post-Deployment Setup

### 1. **Test Health Check**
```bash
# Buka browser atau gunakan curl
curl https://your-project-name.vercel.app/api/rag/health
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
curl -X POST https://your-project-name.vercel.app/api/rag/initialize
```

Expected response:
```json
{
  "message": "RAG system initialized"
}
```

### 3. **Test RAG Endpoint**
```bash
curl -X POST https://your-project-name.vercel.app/api/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "apa yang dimaksud dengan ekowisata?"}'
```

### 4. **Test Concurrent Endpoint**
```bash
curl -X POST https://your-project-name.vercel.app/api/rag/concurrent-test \
  -H "Content-Type: application/json" \
  -d '{"numRequests": 3}'
```

---

## 🔧 Troubleshooting

### **Build Failed**

#### **Error: TypeScript compilation failed**
1. Cek `tsconfig.json` configuration
2. Pastikan semua dependencies terinstall
3. Cek console logs di Vercel dashboard

#### **Error: Missing dependencies**
1. Pastikan `package.json` lengkap
2. Cek `package-lock.json` ter-commit
3. Verifikasi semua dependencies terinstall

#### **Error: Environment variables not found**
1. Cek environment variables di Vercel dashboard
2. Pastikan semua variables diset untuk "Production"
3. Redeploy setelah menambahkan variables

### **Runtime Errors**

#### **Error: MongoDB connection failed**
1. Verifikasi `MONGODB_URI` format
2. Cek MongoDB Atlas network access
3. Pastikan cluster aktif

#### **Error: Gemini API key invalid**
1. Verifikasi API keys benar
2. Cek API key quotas
3. Pastikan API keys enabled untuk Gemini

#### **Error: Function timeout**
1. Cek `vercel.json` maxDuration setting
2. Consider upgrade ke Vercel Pro
3. Optimize RAG processing time

### **CORS Issues**
1. Verifikasi `CORS_ORIGINS` environment variable
2. Pastikan frontend domain included
3. Gunakan HTTPS di production

---

## 📊 Monitoring & Management

### 1. **Vercel Dashboard Features**
- **Analytics**: Monitor function invocations
- **Logs**: View real-time logs
- **Functions**: Monitor serverless functions
- **Settings**: Manage project configuration

### 2. **Deployment Management**
- **Automatic Deployments**: Setiap push ke main branch
- **Preview Deployments**: Untuk pull requests
- **Rollback**: Kembali ke deployment sebelumnya

### 3. **Custom Domain (Optional)**
1. Di project settings, klik "Domains"
2. Tambahkan custom domain
3. Update DNS records
4. Verifikasi domain

---

## 🎯 Best Practices

### 1. **Security**
- ✅ Gunakan environment variables untuk secrets
- ✅ Jangan commit `.env` files
- ✅ Enable Vercel security features
- ✅ Use HTTPS di production

### 2. **Performance**
- ✅ Optimize build time
- ✅ Monitor function cold starts
- ✅ Use appropriate Node.js version
- ✅ Implement caching strategies

### 3. **Monitoring**
- ✅ Setup Vercel analytics
- ✅ Monitor function logs
- ✅ Set up alerts untuk failures
- ✅ Track performance metrics

---

## 📞 Support Resources

### **Vercel Documentation**
- [Vercel Docs](https://vercel.com/docs)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Vercel Examples](https://github.com/vercel/vercel/tree/main/examples)

### **Community Support**
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Discord](https://discord.gg/vercel)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/vercel)

### **Project-Specific**
- [SOLUTION_503_ERROR.md](./SOLUTION_503_ERROR.md)
- [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- [PERFORMANCE_TESTING_GUIDE.md](./PERFORMANCE_TESTING_GUIDE.md)

---

## 🎉 Deployment Checklist

- [ ] Repository pushed ke GitHub/GitLab/Bitbucket
- [ ] Vercel account created dan verified
- [ ] Repository imported ke Vercel
- [ ] Build settings configured
- [ ] Environment variables set
- [ ] Project deployed successfully
- [ ] Health check passes
- [ ] RAG system initialized
- [ ] Test endpoints working
- [ ] Custom domain configured (optional)
- [ ] Monitoring setup
- [ ] Documentation updated

---

## 🚀 Quick Start Commands

### **Test Deployment**
```bash
# Health check
curl https://your-project-name.vercel.app/api/rag/health

# Initialize RAG
curl -X POST https://your-project-name.vercel.app/api/rag/initialize

# Test RAG
curl -X POST https://your-project-name.vercel.app/api/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "test question"}'

# Test concurrent
curl -X POST https://your-project-name.vercel.app/api/rag/concurrent-test \
  -H "Content-Type: application/json" \
  -d '{"numRequests": 3}'
```

**🎊 Selamat! Aplikasi Anda telah berhasil di-deploy via Vercel Web GUI!** 