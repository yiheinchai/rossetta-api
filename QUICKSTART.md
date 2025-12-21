# Quick Start Guide

## What is Rossetta API?

Rossetta API is a proof-of-concept demonstrating **completely obfuscated network requests** that prevent reverse engineering through browser DevTools. It's a step toward democratizing advanced security features for all applications.

## What You'll See

When you run this demo and inspect network requests in your browser, you'll notice:

- 🔒 **Obfuscated URLs**: Instead of `/api/todos`, you'll see `/api/f462a112bf09b660`
- 🔐 **Encrypted Payloads**: All data appears as random strings like `mOVn2Q4FbG6IbkHgLcr6vQ==:tv/cQH...`
- 🛡️ **No Readable Data**: JSON is completely hidden from network inspector
- ✨ **Impossible to Reverse Engineer**: Can't figure out API structure from browser

## Installation & Setup

### Prerequisites
- Node.js 18 or higher (for ES modules support)

### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd rossetta-api
```

2. **Install dependencies**
```bash
cd backend
npm install
```

3. **Start the server**
```bash
npm start
```

You should see:
```
🔐 Rossetta API Server running on port 3001
📡 All API endpoints are obfuscated and encrypted
🔒 Network requests cannot be reverse-engineered from browser DevTools
```

4. **Open the app**
- Navigate to `http://localhost:3001/` in your browser
- You'll see the Rossetta Todo application

## Try It Out!

### Step 1: Open Developer Tools
- Press `F12` or right-click → "Inspect"
- Go to the **Network** tab

### Step 2: Interact with the App
- Add a new todo
- Toggle a todo's completion status
- Edit a todo
- Delete a todo

### Step 3: Inspect Network Requests
Look at the Network tab and notice:

**Request URL**: Obfuscated
```
POST http://localhost:3001/api/c933be3f1e567acf
```

**Request Payload**: Encrypted
```
y8mzdtGaO3L/UQVshQvnfg==:zZzXwE57rStzibKa4Mcnxl/SVGzBgEX...
```

**Response**: Encrypted
```
0e6VwxcN01+d0gPSdGuhaQ==:M0pRUEwzwWtyOS+pwsMnh0sSGF9dPz...
```

### Step 4: Try to Reverse Engineer (You Can't!)
- Try to figure out what the endpoint does → Impossible
- Try to read the request data → All encrypted
- Try to understand the API structure → No clues!

## How It Works

### 1. Endpoint Obfuscation
```javascript
// Original: "create-todo"
// Becomes: "/api/c933be3f1e567acf"
```
Both client and server hash endpoint names with a shared secret.

### 2. Payload Encryption
```javascript
// Original: { text: "Buy milk" }
// Becomes: "y8mzdtGaO3L/UQVshQvnfg==:zZzXwE57..."
```
AES-256-CBC encryption makes all data unreadable.

### 3. Request Signing
```javascript
// HMAC-SHA256 signature prevents tampering
signature = HMAC(data + timestamp, secret)
```

### 4. Timestamp Validation
```javascript
// 5-minute window prevents replay attacks
if (now - timestamp > 5 minutes) reject()
```

## Project Structure

```
rossetta-api/
├── backend/           # Express.js server
│   ├── server.js     # Main server with obfuscated endpoints
│   ├── test.js       # API tests
│   └── package.json
├── frontend/          # Vanilla JS frontend
│   ├── index.html    # Main page
│   ├── styles.css    # Styling
│   ├── crypto-client.js  # Browser crypto
│   ├── api-client.js     # API wrapper
│   └── app.js        # Todo app logic
├── shared/           # Shared utilities
│   └── crypto.js     # Encryption/obfuscation
└── README.md
```

## Testing the API

Run the included test script:
```bash
cd backend
node test.js
```

You'll see:
```
🧪 Testing Rossetta API...

Test 1: List Todos (GET request)
  Obfuscated endpoint: /api/f462a112bf09b660
  Encrypted response: 0e6VwxcN01+d0gPSdGuhaQ==:M0pRUE...
  Decrypted data: [...]
  ✅ GET request successful

Test 2: Create Todo (POST request)
  Obfuscated endpoint: /api/c933be3f1e567acf
  Encrypted request: y8mzdtGaO3L/UQVshQvnfg==:zZzXwE...
  Created todo: {...}
  ✅ POST request successful

🎉 All tests passed!
```

## Next Steps

### Experiment
- Try adding different types of todos
- Open multiple browser tabs and see them sync
- Try to decode the network requests (spoiler: you can't!)

### Learn More
- Read `README.md` for detailed documentation
- Check `SECURITY.md` for security considerations
- Explore the code to understand the implementation

### Future Vision
This demo is a step toward creating NPM packages like:
- `@rossetta-api/server` - Express middleware
- `@rossetta-api/client` - Browser/Node.js client

With minimal setup:
```javascript
app.use(rossettaMiddleware({ secret: process.env.SECRET }));
```

## Troubleshooting

### Port 3001 already in use
```bash
# Change port in backend/server.js
const PORT = process.env.PORT || 3002;  # Change to 3002
```

### Can't connect to server
- Make sure the server is running (`npm start` in backend/)
- Check if you're on `http://localhost:3001` not `https`

### Todos not loading
- Check browser console for errors
- Make sure server is running on port 3001
- Try refreshing the page

## Important Notes

⚠️ **This is a demonstration**
- Secret key is hardcoded for demo purposes
- No authentication system
- No database (uses in-memory storage)
- Not production-ready

For production use:
- Set environment variables for secrets
- Add authentication
- Implement rate limiting
- Use HTTPS
- Add a real database

## Questions?

This is a proof-of-concept for democratizing advanced security features. The goal is to make this type of obfuscation available to everyone with minimal setup.

**Vision**: Security shouldn't be a luxury - it should be the default.

---

Enjoy exploring Rossetta API! 🔐✨
