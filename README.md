# 🔐 Rossetta API

An overpowered todo list app demonstrating completely obfuscated network requests that prevent reverse engineering through browser DevTools.

This project is a proof-of-concept for creating NPM packages that provide network request obfuscation with minimal setup, democratizing advanced security features for all applications.

## ✨ Features

- **🔒 Encrypted Communication**: All request and response payloads are encrypted using AES-256-CBC
- **🛡️ Obfuscated Endpoints**: API endpoints are hashed and unreadable in network inspector
- **✅ Anti-Replay Protection**: Timestamp-based nonce system prevents replay attacks
- **🔐 Request Signatures**: HMAC signatures verify request integrity
- **🎯 Zero Reverse Engineering**: Impossible to reverse-engineer API structure from browser DevTools

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for ES modules support)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rossetta-api
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Start the backend server:
```bash
npm start
```

The server will start on `http://localhost:3001`

4. Open the frontend:
   - Open `frontend/index.html` in your browser
   - Or serve it with the backend (it serves static files automatically)

## 🔍 Try It Out

1. Open your browser's Developer Tools (F12)
2. Navigate to the Network tab
3. Add, edit, or toggle a todo item
4. Inspect the network requests - you'll notice:
   - ✨ Endpoint URLs are hashed (e.g., `/api/a3f2e8b1c9d4e5f6`)
   - ✨ Request bodies are encrypted strings
   - ✨ Response bodies are encrypted strings
   - ✨ No readable JSON in the network tab
   - ✨ No way to determine the API structure

## 📁 Project Structure

```
rossetta-api/
├── shared/               # Shared cryptographic utilities
│   ├── crypto.js        # Server-side encryption/decryption
│   └── package.json
├── backend/             # Express.js backend server
│   ├── server.js        # Main server with obfuscated endpoints
│   └── package.json
├── frontend/            # Vanilla JS frontend
│   ├── index.html       # Main HTML file
│   ├── styles.css       # Styling
│   ├── crypto-client.js # Browser crypto utilities
│   ├── api-client.js    # Obfuscated API client
│   └── app.js           # Todo app logic
└── README.md
```

## 🔐 How It Works

### 1. Endpoint Obfuscation

Endpoints are obfuscated using SHA-256 hashing:
```javascript
// Original endpoint: "create-todo"
// Obfuscated: "/api/a3f2e8b1c9d4e5f6"
```

Both client and server use the same hashing algorithm with a shared secret, so they can communicate without exposing the actual endpoint names.

### 2. Request Encryption

All requests are encrypted before sending:
```javascript
{
  data: { text: "Buy milk" },
  timestamp: 1703174400000,
  signature: "hmac-sha256-signature"
}
// Encrypted to: "base64-iv:base64-encrypted-payload"
```

### 3. Response Encryption

All responses are encrypted before sending back to client:
```javascript
{
  data: { id: "1", text: "Buy milk", completed: false },
  timestamp: 1703174400001
}
// Encrypted to: "base64-iv:base64-encrypted-payload"
```

### 4. Security Layers

- **AES-256-CBC Encryption**: Industry-standard symmetric encryption
- **HMAC Signatures**: Prevent request tampering
- **Timestamp Validation**: Prevent replay attacks (5-minute window)
- **Random IVs**: Each encryption uses a unique initialization vector

## 🎯 Future: NPM Package

This project serves as a foundation for creating NPM packages:

### Planned Packages:

1. **@rossetta-api/server**
   - Express middleware for automatic endpoint obfuscation
   - Easy integration: `app.use(rossettaMiddleware())`

2. **@rossetta-api/client**
   - Browser and Node.js client for obfuscated requests
   - Simple API: `const api = new RossettaClient(baseURL)`

3. **@rossetta-api/shared**
   - Shared cryptographic utilities
   - Configurable security settings

### Example Usage (Future):

```javascript
// Backend
import express from 'express';
import { rossettaMiddleware } from '@rossetta-api/server';

const app = express();
app.use(rossettaMiddleware({ secret: process.env.SECRET_KEY }));

app.post('/todos', (req, res) => {
  // Request automatically decrypted
  const { text } = req.body;
  // Response automatically encrypted
  res.json({ id: '1', text });
});

// Frontend
import { RossettaClient } from '@rossetta-api/client';

const api = new RossettaClient('http://localhost:3001', {
  secret: 'your-secret-key'
});

const todo = await api.post('/todos', { text: 'Buy milk' });
```

## 🔧 Configuration

### Environment Variables

```bash
# Backend
ROSSETTA_SECRET_KEY=your-secret-key-min-32-chars
PORT=3001
```

### Security Notes

⚠️ **Important**: This is a demonstration. In production:

- Use environment variables for secrets
- Implement proper key rotation
- Use HTTPS/TLS for transport security
- Add rate limiting
- Implement proper authentication
- Use a database instead of in-memory storage

## 🛠️ Development

### Running in Development Mode

Backend with auto-reload:
```bash
cd backend
npm run dev
```

### Testing

Open the frontend and:
1. Add todos
2. Toggle completion
3. Edit todos
4. Delete todos
5. Check Network tab - everything is obfuscated!

## 📝 API Endpoints

All endpoints are obfuscated. The logical endpoints are:

- `LIST_TODOS` (GET) - Get all todos
- `CREATE_TODO` (POST) - Create a new todo
- `UPDATE_TODO` (PUT) - Update a todo
- `TOGGLE_TODO` (POST) - Toggle todo completion
- `DELETE_TODO` (DELETE) - Delete a todo

Actual endpoints are hashed and change based on the secret key.

## 🤝 Contributing

This is a proof-of-concept project. Contributions welcome!

## 📄 License

MIT

## 🌟 Vision

**Democratizing Overpowered Security Features**

Most apps don't have advanced security features because they're complex to implement. Rossetta API aims to make military-grade obfuscation accessible to everyone with minimal setup.

Security shouldn't be a luxury - it should be the default.
