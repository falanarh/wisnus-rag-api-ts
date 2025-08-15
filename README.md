# 🚀 Wisnus RAG API - Versi TypeScript

API RAG (Retrieval-Augmented Generation) berkinerja tinggi yang dibangun dengan Express.js dan TypeScript, dirancang khusus untuk sistem survei Wisnus (Wisatawan Nusantara). Sistem ini mampu menjawab pertanyaan berbasis pengetahuan dari dokumen "Buku Pedoman Survei Digital Wisatawan Nusantara" secara akurat dan efisien.

## ✨ Fitur Utama

- **Tanya Jawab Berbasis RAG**: Menggunakan model AI Gemini dari Google dan pencarian vektor di MongoDB Atlas untuk memberikan jawaban yang relevan dari dokumen sumber.
- **Pipeline Terstruktur dengan LangGraph**: Proses RAG diatur dalam alur kerja yang jelas dan dapat diamati, memastikan setiap langkah (pembuatan *query*, pengambilan dokumen, pemeringkatan ulang, dan pembuatan jawaban) berjalan secara sistematis.
- **Integrasi LangSmith**: Pemantauan dan *tracing* mendetail untuk setiap permintaan, memudahkan *debugging* dan analisis performa.
- **Manajemen Kunci API Cerdas**: Sistem manajemen kunci API yang canggih dengan penyimpanan di *database*, pemilihan kunci API terbaik secara otomatis berdasarkan batas penggunaan (RPM, RPD, TPM), dan *fallback* jika terjadi *rate limiting*.
- **Optimasi *Embedding***: Waktu *startup* 85-90% lebih cepat dengan menonaktifkan pembuatan *embedding* saat produksi, dengan asumsi *embedding* sudah ada di *database*.
- **Penanganan *Error* Komprehensif**: Mekanisme *retry* dengan *exponential backoff* dan rotasi kunci API otomatis untuk menangani kegagalan atau saat model kelebihan beban.

## 🏗️ Arsitektur Sistem

Versi TypeScript ini mempertahankan arsitektur yang solid dengan penambahan LangGraph dan LangSmith untuk meningkatkan observabilitas dan struktur.

```
src/
├── config/                 # Konfigurasi aplikasi
├── controllers/            # Handler untuk permintaan HTTP
├── models/                 # Model data untuk request/response
├── routes/                 # Definisi rute API
├── services/               # Logika bisnis inti
├── types/                  # Definisi tipe TypeScript
├── utils/                  # Fungsi utilitas
└── main.ts                 # Titik masuk aplikasi (entry point)
```

## ⚙️ Teknologi yang Digunakan

- **Framework**: Express.js
- **Bahasa**: TypeScript
- **Database**: MongoDB dengan Atlas Vector Search
- **Model AI**: Google Gemini Pro & Gemini 1.5 Flash
- **Orkestrasi AI**: LangChain.js & LangGraph
- **Observabilitas**: LangSmith

## 🔌 Endpoint API

Berikut adalah beberapa endpoint utama yang tersedia:

### RAG
- `POST /api/rag/ask`: Mengirimkan pertanyaan untuk dijawab oleh sistem RAG.
- `GET /api/rag/health`: Memeriksa status kesehatan layanan.
- `GET /api/rag/status`: Memeriksa status inisialisasi RAG dan koneksi database.
- `POST /api/rag/pipeline-info`: Mendapatkan informasi *real-time* tentang status *pipeline* untuk sebuah pertanyaan.

### Manajemen Kunci API
- `GET /api/keys/status`: Melihat status semua kunci API yang tersimpan.
- `GET /api/keys/best`: Mendapatkan informasi kunci API terbaik yang tersedia.
- `POST /api/keys/reactivate/:apiKey`: Mengaktifkan kembali kunci API yang dinonaktifkan.

## 📦 Instalasi & Penggunaan

1.  **Clone Repositori**
    ```bash
    git clone https://github.com/Falan-h/wisnus-rag-api-ts.git
    cd wisnus-rag-api-ts
    ```

2.  **Install Dependensi**
    ```bash
    npm install
    ```

3.  **Konfigurasi Variabel Lingkungan**
    Salin file `.env.example` menjadi `.env` dan isi variabel yang diperlukan:
    ```env
    # Konfigurasi MongoDB
    MONGODB_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/"
    MONGODB_DB_NAME="nama_database"
    MONGODB_COLLECTION_NAME="nama_koleksi"

    # Kunci API Gemini (minimal satu)
    GEMINI_API_KEY_1="kunci_api_gemini_anda"

    # Konfigurasi LangSmith (Opsional)
    LANGSMITH_API_KEY="kunci_api_langsmith_anda"
    LANGSMITH_PROJECT="nama_proyek_langsmith"
    ```

4.  **Build Proyek**
    ```bash
    npm run build
    ```

5.  **Jalankan Server**
    - Untuk mode produksi:
      ```bash
      npm start
      ```
    - Untuk mode pengembangan dengan *hot-reloading*:
      ```bash
      npm run dev
      ```

Server akan berjalan di `http://localhost:3001` (atau port yang ditentukan di `.env`).

## 🧪 Pengujian

Proyek ini dilengkapi dengan berbagai skrip pengujian untuk memastikan fungsionalitas berjalan dengan baik:

- **Menjalankan semua tes**: `npm run test:all`
- **Tes manajemen kunci API**: `npm run test:api-keys`
- **Tes permintaan konkuren**: `npm run test:concurrent`

## 📄 Lisensi

Proyek ini dilisensikan di bawah [Lisensi MIT](LICENSE).
