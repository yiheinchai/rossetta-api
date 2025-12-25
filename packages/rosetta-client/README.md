# Rosetta Client

Drop-in replacement for the Fetch API with automatic end-to-end encryption.

## Installation

```bash
npm install rosetta-client
```

## Usage

Simply replace your fetch imports with rosetta-client:

```javascript
// Before
// import fetch from 'node-fetch';

// After
import { fetch } from 'rosetta-client';

// Use exactly like regular fetch - encryption is automatic!
const response = await fetch('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ key: 'value' })
});

const data = await response.json();
console.log(data);
```

## Features

- **Zero code changes**: Drop-in replacement for fetch
- **Automatic encryption**: All requests are encrypted end-to-end
- **Replay attack prevention**: Built-in timestamp and nonce validation
- **Browser and Node.js**: Works in both environments
- **Type-safe**: Full TypeScript support

## How it Works

1. **Automatic key exchange**: On first request to a server, performs ECDH key exchange
2. **Request encryption**: Encrypts all request data including URL, method, headers, and body
3. **Response decryption**: Automatically decrypts server responses
4. **Replay prevention**: Each request includes unique nonce and timestamp

## Server Setup

Your server needs to use the rosetta-fastapi middleware:

```python
from fastapi import FastAPI
from rosetta_fastapi import RosettaMiddleware

app = FastAPI()
app.add_middleware(RosettaMiddleware, secret_key="your-secret-key")
```

## API

### `fetch(input, init?)`

Parameters:
- `input`: URL or Request object
- `init`: Optional RequestInit object (same as standard fetch)

Returns: Promise<Response>

### `resetKeyManagers()`

Reset all stored encryption keys (useful for testing).

## Security

- Uses ECDH P-256 for key exchange
- Uses AES-256-GCM for encryption
- Includes timestamp validation (5-minute window by default)
- Includes nonce tracking to prevent replay attacks
- Each request has unique encryption

## License

MIT
