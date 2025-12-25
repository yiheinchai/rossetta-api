# Rossetta API

End-to-end encryption for API requests with zero configuration changes.

## Overview

Rossetta API provides seamless end-to-end encryption for API requests, preventing interception, modification, and reverse engineering. Even if someone copies an exact API request from the network tab and tries to replay it, it will fail due to built-in replay attack prevention.

## Packages

### rossetta-client

JavaScript/TypeScript client package that provides a drop-in replacement for the native `fetch` API with automatic e2e encryption.

```javascript
import fetch from 'rossetta-client';

// Use exactly like native fetch - encryption is automatic
const response = await fetch('http://localhost:8000/api/data', {
  method: 'POST',
  body: JSON.stringify({ message: 'Hello' })
});
```

### rossetta-fastapi

Python FastAPI middleware that adds e2e encryption support with a single line of code.

```python
from fastapi import FastAPI
from rossetta_fastapi import RossettaMiddleware

app = FastAPI()
app.add_middleware(RossettaMiddleware)

# All routes are now automatically protected with e2e encryption
```

## Security Features

- **End-to-End Encryption**: All request/response payloads encrypted with AES-256-GCM
- **Key Exchange**: Secure ECDH key exchange for session keys
- **Replay Attack Prevention**: Timestamp and nonce validation
- **Request Integrity**: HMAC-based request signing

## Installation

### Client (npm)

```bash
npm install rossetta-client
```

### Backend (pip)

```bash
pip install rossetta-fastapi
```

## License

MIT
