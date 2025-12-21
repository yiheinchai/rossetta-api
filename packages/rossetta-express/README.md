# @rossetta-api/express

Zero-config network request obfuscation middleware for Express.js

## Features

- 🔒 **Automatic endpoint obfuscation** - API endpoints are hashed and unreadable
- 🔐 **Request/response encryption** - AES-256-CBC encryption for all data
- ✅ **Session-based key management** - No hardcoded secrets in frontend
- 🛡️ **Anti-replay protection** - Timestamp validation prevents replay attacks
- 📝 **Request signatures** - HMAC-SHA256 ensures request integrity

## Installation

```bash
npm install @rossetta-api/express
```

## Quick Start

```javascript
import express from 'express';
import { rossettaMiddleware } from '@rossetta-api/express';

const app = express();

// Add Rossetta middleware
app.use(rossettaMiddleware());

// Define your routes normally
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);
```

That's it! All API endpoints are now automatically obfuscated and encrypted.

## Usage

### Basic Setup

```javascript
import { rossettaMiddleware, createSessionInitHandler } from '@rossetta-api/express';

app.use(rossettaMiddleware({
  secret: process.env.SECRET_KEY, // Optional: auto-generated if not provided
  sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours (default)
  timestampWindow: 5 * 60 * 1000 // 5 minutes (default)
}));

// Add session initialization endpoint for frontend
app.post('/api/init-session', createSessionInitHandler());
```

### Encrypting Responses

```javascript
app.get('/api/data', (req, res) => {
  const data = { message: 'Hello, World!' };
  res.encryptResponse(data); // Automatically encrypted
});
```

### Accessing Request Data

```javascript
app.post('/api/create', (req, res) => {
  // req.body is automatically decrypted
  const { name } = req.body;
  
  const result = { id: 1, name };
  res.encryptResponse(result);
});
```

### Using Rossetta Helpers

```javascript
app.use((req, res, next) => {
  // Access Rossetta utilities
  const obfuscatedPath = req.rossetta.obfuscateEndpoint('my-endpoint');
  const encrypted = req.rossetta.encrypt({ data: 'test' });
  const decrypted = req.rossetta.decrypt(encrypted);
  
  next();
});
```

## How It Works

1. **Session Initialization**: Client requests session keys from `/api/init-session`
2. **Key Generation**: Server generates unique encryption keys per session
3. **Endpoint Obfuscation**: All endpoints are hashed using SHA-256
4. **Request Encryption**: Client encrypts requests with session key
5. **Server Decryption**: Middleware automatically decrypts and validates requests
6. **Response Encryption**: Responses are encrypted before sending to client

## Security Features

- **No Hardcoded Secrets**: Keys are generated per session
- **Perfect Forward Secrecy**: Each session has unique keys
- **Replay Attack Prevention**: Timestamp-based validation
- **Request Integrity**: HMAC signatures prevent tampering
- **Endpoint Obfuscation**: API structure hidden from inspection

## Environment Variables

```bash
ROSSETTA_SECRET_KEY=your-secret-key-here  # Optional: for key derivation
NODE_ENV=production  # Enables secure cookies
```

## API Reference

### `rossettaMiddleware(options)`

Main middleware function.

**Options:**
- `secret` (string): Secret key for encryption (auto-generated if not provided)
- `sessionMaxAge` (number): Session duration in milliseconds (default: 24 hours)
- `timestampWindow` (number): Request validity window in milliseconds (default: 5 minutes)

### `createSessionInitHandler()`

Creates a route handler for session initialization.

Returns session keys to the client.

### Request Extensions

- `req.rossetta.sessionKey`: Current session encryption key
- `req.rossetta.endpointSalt`: Salt for endpoint obfuscation
- `req.rossetta.obfuscateEndpoint(name)`: Obfuscate an endpoint name
- `req.rossetta.encrypt(data)`: Encrypt data
- `req.rossetta.decrypt(data)`: Decrypt data

### Response Extensions

- `res.encryptResponse(data)`: Encrypt and send response

## License

MIT
