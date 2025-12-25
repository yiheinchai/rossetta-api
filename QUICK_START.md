# 🚀 Quick Start Guide

Get started with Rossetta API in under 5 minutes!

## Installation

### Backend (Python/FastAPI)

```bash
pip install rossetta-core rossetta-fastapi
```

### Frontend (JavaScript/TypeScript)

```bash
npm install rossetta-client
```

## Usage

### Backend Setup (FastAPI)

Add **ONE LINE** to your existing FastAPI application:

```python
from fastapi import FastAPI
from rossetta_fastapi import RossettaMiddleware

app = FastAPI()

# Add this single line - that's it!
app.add_middleware(RossettaMiddleware)

# All your existing routes work without changes
@app.get("/api/users")
async def get_users():
    return {"users": ["Alice", "Bob"]}
```

### Frontend Setup (JavaScript)

Replace `fetch` with encrypted version:

```javascript
import { createRossettaFetch } from 'rossetta-client';

// Initialize once
const fetch = await createRossettaFetch('https://api.example.com');

// Use exactly like regular fetch!
const response = await fetch('/api/users');
const data = await response.json();
```

## Try the Example

1. Clone the repository:
   ```bash
   git clone https://github.com/yiheinchai/rossetta-api.git
   cd rossetta-api
   ```

2. Start the example server:
   ```bash
   cd examples/fastapi-server
   pip install -e ../../rossetta-core -e ../../rossetta-fastapi -e .
   python main.py
   ```

3. Open the example client:
   ```bash
   cd ../client-app
   python -m http.server 3000
   ```

4. Visit http://localhost:3000 in your browser

5. **Test Replay Protection:**
   - Click "Get All Users"
   - Open DevTools (F12) → Network tab
   - Right-click the request → Copy as fetch
   - Paste in Console and run
   - Watch it FAIL with "replay attack detected"! 🛡️

## What You Get

- ✅ **Zero Code Changes**: Drop-in replacement for both client and server
- ✅ **Full E2E Encryption**: All requests and responses encrypted
- ✅ **Replay Protection**: Each request can only be used once
- ✅ **Production Ready**: Comprehensive test coverage
- ✅ **TypeScript Support**: Full type definitions included

## Security Features

- **RSA-2048** key exchange
- **AES-256-GCM** data encryption
- **Unique nonce** per request
- **Timestamp validation**
- **Request signatures**

## Next Steps

- Read the [full documentation](README.md)
- Check out the [examples](examples/)
- See [API reference](docs/API.md)

## Need Help?

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yiheinchai/rossetta-api/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yiheinchai/rossetta-api/discussions)

---

Made with ❤️ for secure APIs
