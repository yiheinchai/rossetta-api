# 🔒 Rossetta API

**End-to-End Encryption for APIs Made Simple**

Rossetta API provides seamless end-to-end encryption for your API communications with minimal code changes. Add a single line of middleware to your backend and use a drop-in fetch replacement on the frontend - that's it!

## 🎯 Features

- **🔐 End-to-End Encryption**: All API requests and responses are encrypted using hybrid encryption (RSA + AES-256-GCM)
- **🛡️ Replay Attack Prevention**: Each request has a unique nonce, preventing replay attacks
- **⏱️ Timestamp Validation**: Requests expire after a configurable time window
- **🔄 Drop-in Replacement**: Minimal code changes required on both frontend and backend
- **🚀 Production Ready**: Comprehensive test coverage and battle-tested cryptography
- **📦 Zero Config**: Works out of the box with sensible defaults

## 🏗️ Architecture

Rossetta API consists of three packages:

1. **`rossetta-core`** (Python): Core cryptographic utilities
2. **`rossetta-fastapi`** (Python): FastAPI middleware for backend encryption
3. **`rossetta-client`** (JavaScript/TypeScript): Browser client for frontend encryption

## 🚀 Quick Start

### Backend (FastAPI)

```python
from fastapi import FastAPI
from rossetta_fastapi import RossettaMiddleware

app = FastAPI()

# Add this ONE line to enable E2E encryption for ALL endpoints!
app.add_middleware(RossettaMiddleware)

# Your existing routes work without any changes
@app.get("/api/users")
async def get_users():
    return {"users": ["Alice", "Bob", "Charlie"]}
```

### Frontend (Browser)

```javascript
import { createRossettaFetch } from 'rossetta-client';

// Initialize once
const fetch = await createRossettaFetch('https://api.example.com');

// Use exactly like regular fetch - no code changes needed!
const response = await fetch('/api/users');
const data = await response.json();
console.log(data); // {"users": ["Alice", "Bob", "Charlie"]}
```

That's it! All your API communication is now end-to-end encrypted! 🎉

## 📦 Installation

### Python Packages

```bash
# Core utilities
pip install rossetta-core

# FastAPI middleware
pip install rossetta-fastapi
```

### JavaScript Package

```bash
npm install rossetta-client
```

## 🔍 How It Works

### Encryption Flow

1. **Initialization**: Client fetches server's public RSA key
2. **Request Encryption**:
   - Client generates a unique AES-256 key for each request
   - Request data is encrypted with AES-256-GCM
   - AES key is encrypted with server's RSA public key
   - Unique nonce and timestamp are added
   - Request signature is generated
3. **Server Decryption**:
   - Validates timestamp (prevents old requests)
   - Checks nonce (prevents replay attacks)
   - Decrypts AES key using RSA private key
   - Decrypts request data using AES key
4. **Response Encryption**:
   - Server encrypts response with the same AES key
   - Client decrypts response

### Security Features

- **Hybrid Encryption**: RSA-2048 for key exchange, AES-256-GCM for data
- **Perfect Forward Secrecy**: Each request uses a new AES key
- **Authentication**: HMAC signatures prevent tampering
- **Replay Protection**: Nonces are tracked and rejected if reused
- **Timestamp Validation**: Old requests are automatically rejected
- **Non-repudiation**: Each request is signed and verifiable

## 📚 Examples

Check out the `examples/` directory for complete working examples:

- **`examples/fastapi-server/`**: Full-featured FastAPI server with encryption
- **`examples/client-app/`**: Browser-based client application

### Running the Examples

1. Start the server:
   ```bash
   cd examples/fastapi-server
   pip install -e ../../rossetta-core
   pip install -e ../../rossetta-fastapi
   pip install -e .
   python main.py
   ```

2. Start the client:
   ```bash
   cd examples/client-app
   python -m http.server 3000
   ```

3. Open http://localhost:3000 in your browser

### Testing Replay Protection

1. Open browser Developer Tools (F12) → Network tab
2. Make a request (e.g., "Get All Users")
3. Find the request in the Network tab
4. Right-click → Copy → Copy as fetch
5. Paste in Console and run it
6. **It will FAIL with "replay attack detected"!** 🛡️

This proves that even if someone intercepts and copies your request, they cannot replay it!

## 🧪 Testing

All packages include comprehensive test suites:

```bash
# Test rossetta-core
cd rossetta-core
pip install -e ".[dev]"
pytest

# Test rossetta-fastapi  
cd rossetta-fastapi
pip install -e ".[dev]"
pytest

# Test rossetta-client
cd rossetta-client
npm install
npm test
```

## 📖 API Documentation

### rossetta-fastapi

```python
from rossetta_fastapi import RossettaMiddleware

app.add_middleware(
    RossettaMiddleware,
    max_timestamp_diff=300,      # Max 5 minutes timestamp difference (default: 300)
    nonce_cache_size=10000,      # Max nonces to track (default: 10000)
    key_manager=None,            # Optional custom KeyManager instance
)
```

### rossetta-client

```javascript
import { createRossettaFetch } from 'rossetta-client';

const fetch = await createRossettaFetch(baseUrl, {
    publicKeyUrl: '/.well-known/rossetta-public-key',  // Public key endpoint
    autoRefreshKey: false,                              // Auto-refresh key periodically
    keyRefreshInterval: 3600000,                        // Refresh interval (1 hour)
});
```

## 🔐 Security Considerations

### What Rossetta Protects Against

- ✅ **Man-in-the-Middle Attacks**: All data is encrypted end-to-end
- ✅ **Replay Attacks**: Nonce-based protection prevents request reuse
- ✅ **Request Tampering**: Signatures detect any modifications
- ✅ **Eavesdropping**: Even with HTTPS, adds an extra encryption layer
- ✅ **API Reverse Engineering**: Request structure is encrypted

### What Rossetta Does NOT Protect Against

- ❌ **Compromised Client/Server**: If either endpoint is compromised, encryption won't help
- ❌ **XSS Attacks**: Client-side vulnerabilities can still expose data
- ❌ **DDoS Attacks**: Encryption doesn't prevent denial of service
- ❌ **Social Engineering**: Users can still be tricked into revealing data

### Best Practices

1. **Always use HTTPS**: Rossetta adds a layer on top, but HTTPS is still essential
2. **Rotate keys regularly**: Consider implementing key rotation for long-running systems
3. **Monitor nonce cache**: Adjust cache size based on your traffic patterns
4. **Validate inputs**: Always validate and sanitize user inputs on the server
5. **Use secure headers**: Implement CSP, HSTS, and other security headers

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [cryptography](https://cryptography.io/) for Python
- Uses [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) for JavaScript
- Inspired by the need for easy-to-use E2E encryption in APIs

## 📞 Support

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yiheinchai/rossetta-api/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yiheinchai/rossetta-api/discussions)

---

Made with ❤️ for secure API communications
