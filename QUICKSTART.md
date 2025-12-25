# Rossetta API - Quick Start Guide

## Overview

Rossetta API provides seamless end-to-end encryption for API requests between JavaScript/TypeScript clients and FastAPI backends. The encryption is completely transparent - you use it just like regular fetch/FastAPI with zero code changes required.

## Quick Start

### 1. Backend Setup (FastAPI)

Install the package:
```bash
pip install rossetta-fastapi
```

Add the middleware to your FastAPI app:
```python
from fastapi import FastAPI
from rossetta_fastapi import RossettaMiddleware

app = FastAPI()

# Add this single line for e2e encryption!
app.add_middleware(RossettaMiddleware)

# All your routes are now automatically encrypted
@app.get("/api/data")
async def get_data():
    return {"message": "This is encrypted!"}
```

### 2. Client Setup (JavaScript/TypeScript)

Install the package:
```bash
npm install rossetta-client
```

Use it as a drop-in replacement for fetch:
```javascript
// Replace this:
// import fetch from 'node-fetch';

// With this:
import fetch from 'rossetta-client';

// Use exactly like normal fetch - encryption is automatic!
const response = await fetch('http://localhost:8000/api/data');
const data = await response.json();
console.log(data); // { message: "This is encrypted!" }
```

## Features

### ✅ Zero Configuration
- Client: Just replace `fetch` import
- Server: Just add one line of middleware
- No changes to your existing code required

### 🔒 Strong Security
- **AES-256-GCM** encryption for all data
- **ECDH P-256** key exchange
- **HKDF** key derivation
- **Nonce-based** replay attack prevention
- **Timestamp** validation

### 🛡️ Replay Attack Prevention

Even if someone captures an encrypted request from the browser's network tab and tries to send it again, it will fail:

```javascript
// Try copying a request from Chrome DevTools and replaying it
// Result: "Invalid or duplicate nonce" error
```

The system uses:
- Unique nonce for each request
- Timestamp validation (5-minute window by default)
- Both must be valid for request to succeed

### ⚡ Performance
- Minimal overhead
- Session reuse (default 1 hour)
- Automatic key rotation

## Advanced Configuration

### Backend Configuration

```python
app.add_middleware(
    RossettaMiddleware,
    session_duration=3600,        # Session duration in seconds (default: 1 hour)
    max_timestamp_drift=300,      # Max timestamp drift in seconds (default: 5 minutes)
)
```

### Client Configuration

The client automatically manages sessions and handles all encryption/decryption transparently. No configuration needed!

## Testing Locally

### 1. Run the Example Backend

```bash
cd examples/fastapi-backend
pip install -r requirements.txt
python main.py
```

Server will start at http://localhost:8000

### 2. Run Tests

```bash
# Run end-to-end integration tests
cd examples
node test_e2e.js

# Test replay attack prevention
node test_replay.js
```

### 3. Try the Browser Demo

```bash
# Serve the demo (requires a static file server)
cd examples/client-demo
python -m http.server 3000
```

Then open http://localhost:3000 in your browser and open DevTools to see encrypted network requests.

## How It Works

### Initial Handshake

1. Client generates ECDH key pair
2. Client sends public key to `/__rossetta_handshake__`
3. Server generates ECDH key pair
4. Server derives shared secret and sends public key back
5. Client derives same shared secret
6. Session established (valid for 1 hour by default)

### Encrypted Request Flow

1. **Client Side:**
   - Creates request payload (method, URL, headers, body)
   - Adds timestamp and unique nonce
   - Encrypts entire payload with AES-256-GCM using session key
   - Sends encrypted data as POST request

2. **Server Side:**
   - Receives encrypted request
   - Validates session exists
   - Decrypts payload
   - Validates timestamp (not too old/new)
   - Validates nonce (not seen before)
   - Reconstructs original request (GET, POST, etc.)
   - Processes through normal FastAPI handlers
   - Encrypts response
   - Returns encrypted data

3. **Client Side:**
   - Receives encrypted response
   - Decrypts with session key
   - Returns as normal Response object
   - Your code gets the data as if it was unencrypted!

## Security Guarantees

### What's Protected
- ✅ Request method, URL, headers, and body
- ✅ Response status, headers, and body
- ✅ All API payloads
- ✅ Protected from replay attacks
- ✅ Protected from tampering

### What's Not Protected
- ❌ URL path (visible in server logs)
- ❌ Request timing (traffic analysis possible)
- ❌ Request size (visible to network observers)

For maximum security, use Rossetta API over HTTPS to protect metadata.

## Troubleshooting

### "No valid session" error
The session expired or wasn't established. The client will automatically retry with a new handshake.

### "Invalid or duplicate nonce" error
This is expected for replay attacks. It means someone tried to replay a captured request.

### "Request timestamp out of allowed range" error
The client's clock is off by more than 5 minutes. Sync your system clock.

### Decryption errors
Usually indicates a version mismatch between client and server packages. Ensure both are on compatible versions.

## Production Checklist

- [ ] Use HTTPS in production
- [ ] Configure appropriate session duration
- [ ] Set up monitoring for encryption errors
- [ ] Keep packages updated
- [ ] Test thoroughly before deploying
- [ ] Consider rate limiting on handshake endpoint
- [ ] Monitor server CPU usage (encryption overhead)

## Support

- GitHub Issues: https://github.com/yiheinchai/rossetta-api/issues
- Documentation: See README files in each package
- Examples: See `examples/` directory

## License

MIT License - see LICENSE file for details
