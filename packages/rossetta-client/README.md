# rossetta-client

End-to-end encryption client for API requests - drop-in replacement for the native `fetch` API.

## Installation

```bash
npm install rossetta-client
```

## Usage

Simply replace your native `fetch` import with `rossetta-client`:

```javascript
// Before
// import fetch from 'node-fetch'; // or just use global fetch

// After
import fetch from 'rossetta-client';

// Use exactly like native fetch - encryption happens automatically!
const response = await fetch('http://localhost:8000/api/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: 'Hello, encrypted world!' })
});

const data = await response.json();
console.log(data);
```

## Features

- **Zero Configuration**: Drop-in replacement for native fetch
- **Automatic Encryption**: All requests/responses encrypted with AES-256-GCM
- **Key Exchange**: Secure ECDH key exchange handled automatically
- **Replay Protection**: Built-in timestamp and nonce validation
- **Session Management**: Automatic session lifecycle management

## How It Works

1. **First Request**: Performs ECDH key exchange with the server
2. **Encryption**: Encrypts request payload with shared session key
3. **Transmission**: Sends encrypted data to server
4. **Decryption**: Decrypts server response automatically
5. **Session Reuse**: Subsequent requests reuse the established session

## Requirements

- Works in both browser and Node.js environments
- Requires backend with `rossetta-fastapi` middleware (or compatible implementation)

## License

MIT
