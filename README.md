# Rosetta API

End-to-end encryption for API requests - preventing interception, modification, and replay attacks.

## Overview

Rosetta API provides seamless e2e encryption for API communication between clients and servers. It prevents:
- Request interception and inspection
- API reverse engineering
- Request replay attacks
- Man-in-the-middle attacks

## Packages

### rosetta-client
Drop-in replacement for the Fetch API with automatic e2e encryption.

```javascript
import { fetch } from 'rosetta-client';

// Use exactly like regular fetch - encryption is automatic
const response = await fetch('https://api.example.com/data', {
  method: 'POST',
  body: JSON.stringify({ key: 'value' })
});
```

### rosetta-fastapi
FastAPI middleware for handling encrypted requests with a single line of code.

```python
from fastapi import FastAPI
from rosetta_fastapi import RosettaMiddleware

app = FastAPI()
app.add_middleware(RosettaMiddleware, secret_key="your-secret-key")

# All your existing routes now support e2e encryption
@app.get("/api/data")
def get_data():
    return {"message": "This response is encrypted"}
```

## Features

- **Zero-code integration**: Drop-in replacement for client, single middleware for server
- **Replay attack prevention**: Each request includes timestamp and nonce validation
- **Strong encryption**: ECDH key exchange + AES-256-GCM encryption
- **Transparent**: Works with existing APIs without code changes
- **Production ready**: Full test coverage and documentation

## Installation

### Client (NPM)
```bash
npm install rosetta-client
```

### Server (PyPI)
```bash
pip install rosetta-fastapi
```

## How it Works

1. **Key Exchange**: Client and server perform ECDH key exchange
2. **Request Encryption**: Client encrypts request with shared secret + nonce
3. **Server Decryption**: Middleware decrypts and validates request
4. **Response Encryption**: Server encrypts response
5. **Client Decryption**: Client decrypts response

Each request includes a timestamp and nonce to prevent replay attacks.

## License

MIT
