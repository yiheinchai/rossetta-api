# Rossetta Client Example

This is a browser-based example demonstrating the Rossetta client in action.

## Setup

1. Make sure you've built the rossetta-client package:
   ```bash
   cd ../../rossetta-client
   npm install
   npm run build
   cd ../examples/client-app
   ```

2. Start the FastAPI server (in another terminal):
   ```bash
   cd ../fastapi-server
   pip install -e ../../rossetta-core
   pip install -e ../../rossetta-fastapi
   pip install -e .
   python main.py
   ```

3. Serve this HTML file using any HTTP server. For example:
   ```bash
   # Using Python
   python -m http.server 3000
   
   # Or using Node.js
   npx serve
   ```

4. Open http://localhost:3000 in your browser

## What to Try

1. **Initialize Client**: Click "Connect & Initialize" to fetch the public key
2. **Make Requests**: Try the various API endpoints
3. **Test Replay Protection**: 
   - Click "Get All Users"
   - Open Developer Tools (F12) → Network tab
   - Find the request to `/api/users`
   - Right-click → Copy → Copy as fetch
   - Paste in the Console and run it
   - You'll see it FAILS with "replay attack detected"! 🛡️

## Key Features Demonstrated

- ✅ Drop-in fetch replacement (no code changes needed)
- ✅ Automatic encryption of all requests
- ✅ Automatic decryption of all responses
- ✅ Replay attack prevention
- ✅ Works with all HTTP methods (GET, POST, PUT, DELETE)
- ✅ Inspecting network requests shows encrypted data
- ✅ Copying and replaying requests fails

## Security

Open the Network tab and inspect the requests. You'll see:
- All request bodies are encrypted (base64 encoded data)
- Each request has a unique nonce
- Timestamps are included for expiration
- Signatures prevent tampering
- Replaying the exact same request fails
