# 🔐 Rossetta API

Production-ready network request obfuscation with zero-config setup. Protect your APIs from reverse engineering with session-based encryption and endpoint obfuscation.

**Now available as NPM and PyPI packages!**

## 📦 Quick Install

### For Express.js
```bash
npm install @rossetta-api/express
```

### For FastAPI
```bash
pip install rossetta-fastapi
```

### For Flask
```bash
pip install rossetta-flask
```

### For Frontend (Universal Client)
```bash
npm install @rossetta-api/client
```

## ⚡ Zero-Config Usage

### Express.js Backend
```javascript
import { rossettaMiddleware } from '@rossetta-api/express';

app.use(rossettaMiddleware());  // That's it!
```

### FastAPI Backend
```python
from rossetta_fastapi import RossettaMiddleware

app.add_middleware(RossettaMiddleware)  # Done!
```

### Flask Backend
```python
from rossetta_flask import RossettaFlask

rossetta = RossettaFlask(app)  # Done!
```

### Frontend (Browser or Node.js)
```javascript
import RossettaClient from '@rossetta-api/client';

const api = new RossettaClient('http://localhost:3000');
const data = await api.get('/todos');  // Automatically encrypted!
```

## ✨ Features

- **🔒 Session-Based Encryption**: No hardcoded secrets - keys generated per session
- **🛡️ Obfuscated Endpoints**: API endpoints are hashed and unreadable in network inspector
- **✅ Anti-Replay Protection**: Timestamp-based validation prevents replay attacks
- **🔐 Request Signatures**: HMAC-SHA256 verifies request integrity
- **🎯 Zero Reverse Engineering**: Impossible to determine API structure from browser DevTools
- **⚡ Zero-Config Setup**: Works out of the box with minimal code

## 🎨 Demo Application

This repository includes a beautiful todo list demo app with a ClickUp-inspired UI showcasing all security features.

![Rossetta Todo App](https://github.com/user-attachments/assets/f32d4551-4a62-4c20-ab7b-38672e3d190a)

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

- **Session-Based Keys**: Unique encryption keys per session, generated server-side
- **AES-256-CBC Encryption**: Industry-standard symmetric encryption
- **HMAC Signatures**: Prevent request tampering
- **Timestamp Validation**: Prevent replay attacks (5-minute window)
- **Random IVs**: Each encryption uses a unique initialization vector
- **No Hardcoded Secrets**: Frontend never contains encryption keys

## 📦 NPM & PyPI Packages

Ready-to-use packages for easy integration:

### 1. **@rossetta-api/express** (NPM)
   - Express.js middleware for automatic endpoint obfuscation
   - Zero-config setup: `app.use(rossettaMiddleware())`
   - [View Documentation](packages/rossetta-express/README.md)

### 2. **@rossetta-api/client** (NPM)
   - Universal client for browser and Node.js
   - Simple API: `const api = new RossettaClient(baseURL)`
   - [View Documentation](packages/rossetta-client/README.md)

### 3. **rossetta-fastapi** (PyPI)
   - FastAPI middleware for Python backends
   - Easy integration: `app.add_middleware(RossettaMiddleware)`
   - [View Documentation](packages/rossetta-fastapi/README.md)

### 4. **rossetta-flask** (PyPI)
   - Flask middleware for Python backends
   - Simple setup: `rossetta = RossettaFlask(app)`
   - [View Documentation](packages/rossetta-flask/README.md)

### Example Usage:

**Express Backend:**
```javascript
import express from 'express';
import { rossettaMiddleware, createSessionInitHandler } from '@rossetta-api/express';

const app = express();
app.use(rossettaMiddleware());

// Session init endpoint
app.post('/api/init-session', createSessionInitHandler());

// Your routes - automatically encrypted!
app.get('/todos', (req, res) => {
  res.encryptResponse([{ id: 1, text: 'Buy milk' }]);
});
```

**FastAPI Backend:**
```python
from fastapi import FastAPI
from rossetta_fastapi import RossettaMiddleware

app = FastAPI()
app.add_middleware(RossettaMiddleware)

@app.get("/todos")
async def get_todos():
    return [{"id": 1, "text": "Buy milk"}]
```

**Flask Backend:**
```python
from flask import Flask
from rossetta_flask import RossettaFlask, protected_route

app = Flask(__name__)
app.secret_key = 'your-secret-key'
rossetta = RossettaFlask(app)

@app.route('/todos')
@protected_route
def get_todos():
    return [{"id": 1, "text": "Buy milk"}]
```

**Frontend:**
```javascript
import RossettaClient from '@rossetta-api/client';

const api = new RossettaClient('http://localhost:3001');
const todos = await api.get('/todos');  // Automatically encrypted!
const newTodo = await api.post('/todos', { text: 'Buy milk' });
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
