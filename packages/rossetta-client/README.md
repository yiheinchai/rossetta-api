# @rossetta-api/client

Zero-config obfuscated API client for browser and Node.js

## Features

- 🔒 **Automatic endpoint obfuscation** - Endpoints are hashed before requests
- 🔐 **Request/response encryption** - AES-256-CBC encryption
- ✅ **Session-based keys** - Secure key management
- 🛡️ **Request signatures** - HMAC-SHA256 for integrity
- 🌐 **Universal** - Works in browser and Node.js

## Installation

```bash
npm install @rossetta-api/client
```

## Quick Start

```javascript
import RossettaClient from '@rossetta-api/client';

const client = new RossettaClient('http://localhost:3000');

// Make obfuscated API calls
const todos = await client.get('/todos');
const newTodo = await client.post('/todos', { text: 'Buy milk' });
```

All requests are automatically encrypted and obfuscated!

## Usage

### Creating a Client

```javascript
import RossettaClient from '@rossetta-api/client';

const api = new RossettaClient('http://localhost:3000', {
  // Options (all optional)
});
```

### Making Requests

```javascript
// GET request
const data = await api.get('/endpoint');

// POST request
const result = await api.post('/endpoint', { key: 'value' });

// PUT request
const updated = await api.put('/endpoint', { id: 1, key: 'new value' });

// DELETE request
const deleted = await api.delete('/endpoint', { id: 1 });
```

### Using the Generic Request Method

```javascript
const data = await api.request('/endpoint', 'GET');
const result = await api.request('/endpoint', 'POST', { data: 'test' });
```

### Session Management

The client automatically initializes a session on first request:

```javascript
const api = new RossettaClient('http://localhost:3000');

// Session is automatically initialized on first API call
const data = await api.get('/data'); // Session initialized here

// Subsequent calls reuse the same session
const more = await api.get('/more'); // Uses existing session
```

### Manual Session Initialization

```javascript
const api = new RossettaClient('http://localhost:3000');

// Initialize session manually
await api.initialize();

// Now make requests
const data = await api.get('/data');
```

## How It Works

1. **Session Initialization**: On first request, obtains session keys from server
2. **Endpoint Obfuscation**: Hashes endpoint names using session salt
3. **Request Encryption**: Encrypts request payload with session key
4. **Request Signing**: Adds HMAC signature for integrity
5. **Response Decryption**: Automatically decrypts server responses

## Network Request Example

Traditional API:
```
GET /api/todos
Response: {"todos": [{"id": 1, "text": "Buy milk"}]}
```

With Rossetta:
```
GET /api/a7f3e9b2c1d4f5e6
Response: y8mzdtGaO3L/UQVshQvnfg==:zZzXwE57rStz...
```

Completely obfuscated and encrypted!

## Browser Usage

```html
<script type="module">
  import RossettaClient from '@rossetta-api/client';
  
  const api = new RossettaClient('http://localhost:3000');
  
  async function loadData() {
    const data = await api.get('/data');
    console.log(data);
  }
  
  loadData();
</script>
```

## Node.js Usage

```javascript
import RossettaClient from '@rossetta-api/client';

const api = new RossettaClient('http://localhost:3000');

async function main() {
  const users = await api.get('/users');
  console.log(users);
}

main();
```

## Error Handling

```javascript
try {
  const data = await api.get('/endpoint');
} catch (error) {
  console.error('Request failed:', error);
}
```

## Security Features

- **No Hardcoded Secrets**: Keys obtained from server per session
- **Session-Based Encryption**: Each session has unique keys
- **Automatic Key Rotation**: New session = new keys
- **Request Integrity**: HMAC signatures prevent tampering
- **Replay Protection**: Timestamp validation on server

## ⚠️ Security Considerations

This client provides obfuscation and encryption, but you should also:

1. **Always use HTTPS/TLS** in production
2. **Implement proper authentication** (JWT, OAuth, etc.)
3. **Validate server certificates**
4. **Handle credentials securely**
5. **Use environment variables** for API URLs

This package is designed to work **alongside** standard security practices, not replace them.

## API Reference

### `new RossettaClient(baseURL, options)`

Creates a new Rossetta API client.

**Parameters:**
- `baseURL` (string): Base URL of the API server
- `options` (object): Configuration options (currently unused, reserved for future)

### Methods

#### `async initialize()`
Manually initialize session with server.

#### `async get(endpoint)`
Make a GET request.

#### `async post(endpoint, data)`
Make a POST request with data.

#### `async put(endpoint, data)`
Make a PUT request with data.

#### `async delete(endpoint, data)`
Make a DELETE request with data.

#### `async request(endpoint, method, data)`
Generic request method.

## License

MIT
