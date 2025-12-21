# Simple Chat Demo - Test Rossetta Packages

This is a simple, unencrypted chat application built with FastAPI and vanilla JavaScript. It's designed as a test bed for the Rossetta API packages.

## Purpose

Use this app to test how easy it is to add Rossetta encryption to an existing app. The chat app has NO encryption by default - it's intentionally simple so you can see the before/after when adding Rossetta packages.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the Server

```bash
python main.py
```

The server will start on `http://localhost:8000`

### 3. Open the App

Navigate to `http://localhost:8000` in your browser.

## Testing Rossetta Packages

### Before (Current State)
- Open DevTools → Network tab
- Send a chat message
- See plaintext JSON in network inspector: `{"username": "John", "text": "Hello"}`

### After (With Rossetta-FastAPI)

1. Install the package:
```bash
pip install rossetta-fastapi
```

2. Add ONE line to `main.py`:
```python
from rossetta_fastapi import RossettaMiddleware

# Add this after creating the app
app.add_middleware(RossettaMiddleware)
```

3. Install the client package in frontend:
```bash
npm install @rossetta-api/client
```

4. Update `frontend/app.js` to use Rossetta client:
```javascript
import RossettaClient from '@rossetta-api/client';

const client = new RossettaClient('http://localhost:8000');
const data = await client.get('/api/messages');
```

5. Check the network tab again:
- Endpoints are obfuscated: `/api/a7f3e9b2c1d4f5e6`
- Payloads are encrypted: `y8mzdtGaO3L/UQVshQvnfg==:zZzXwE...`
- Complete protection with minimal code changes!

## API Endpoints

- `GET /api/messages` - Get all messages
- `POST /api/messages` - Send a message
- `DELETE /api/messages` - Clear all messages

## Files

- `backend/main.py` - FastAPI server
- `frontend/index.html` - HTML structure
- `frontend/styles.css` - Styling
- `frontend/app.js` - Chat logic (plain fetch, no encryption)
