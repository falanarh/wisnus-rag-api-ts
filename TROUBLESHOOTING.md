# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### 1. Error: "Cannot read properties of undefined (reading 'startsWith')"

**Cause**: File system operations failing or undefined file names.

**Solution**:
```bash
# Validate environment variables first
npm run validate

# Check if docs directory exists
ls -la docs/

# If docs directory doesn't exist, the system will create sample documents automatically
```

### 2. Error: "No Gemini API keys found"

**Cause**: Missing or incorrect environment variables.

**Solution**:
```bash
# 1. Copy environment template
cp env.example .env

# 2. Add your Gemini API key
echo "GEMINI_API_KEY_1=your_actual_api_key_here" >> .env

# 3. Validate environment
npm run validate
```

### 3. Error: "MongoDB connection failed"

**Cause**: MongoDB not running or incorrect connection string.

**Solution**:
```bash
# 1. Check MongoDB connection
# For local MongoDB:
mongod --version

# 2. Update .env with correct MongoDB URI
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=rag_db

# 3. For MongoDB Atlas, use connection string from dashboard
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
```

### 4. Error: "RAG system initialization failed"

**Cause**: Multiple possible issues during startup.

**Solution**:
```bash
# 1. Check environment variables
npm run validate

# 2. Test basic functionality
npm run quick-test

# 3. Check server logs for specific error messages
npm run dev
```

### 5. Error: "API Key Manager failed"

**Cause**: Database connection issues or missing API keys.

**Solution**:
```bash
# The system will automatically fallback to direct API key usage
# Check if you have at least one API key set:
echo $GEMINI_API_KEY_1

# If not set, add it to .env file
```

## Quick Fix Commands

### For First Time Setup:
```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp env.example .env
# Edit .env with your actual values

# 3. Validate setup
npm run validate

# 4. Start development server
npm run dev

# 5. Test in another terminal
npm run quick-test
```

### For Existing Setup Issues:
```bash
# 1. Check environment
npm run validate

# 2. Rebuild project
npm run build

# 3. Restart server
npm run dev

# 4. Test functionality
npm run quick-test
```

## Environment Variables Checklist

Make sure these are set in your `.env` file:

```env
# Required
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=rag_db
GEMINI_API_KEY_1=your_api_key_here

# Optional but recommended
MONGODB_COLLECTION_NAME=documents
PORT=3001
CORS_ORIGINS=http://localhost:3000
```

## Debug Mode

To get more detailed error information:

```bash
# Enable debug logging
DEBUG=* npm run dev

# Or check specific components
DEBUG=rag:* npm run dev
DEBUG=api-keys:* npm run dev
```

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Server not running | `npm run dev` |
| `MongoServerSelectionError` | MongoDB not accessible | Check MongoDB connection |
| `No API keys found` | Missing GEMINI_API_KEY_1 | Add to .env file |
| `Docs directory not found` | Missing docs folder | System will create samples |
| `Rate limit exceeded` | API quota reached | Add more API keys |

## Getting Help

1. **Check logs**: Look at console output for specific error messages
2. **Validate environment**: Run `npm run validate`
3. **Test basic functionality**: Run `npm run quick-test`
4. **Check documentation**: See README.md and API_KEY_MANAGEMENT.md

## Emergency Fallback

If the system completely fails to start:

```bash
# 1. Reset to basic configuration
cp env.example .env
# Add only GEMINI_API_KEY_1

# 2. Start with minimal setup
npm run dev

# 3. Test basic RAG functionality
curl -X POST http://localhost:3001/api/rag/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "test"}'
``` 