# Rossetta Client

Client library for Rossetta API - provides drop-in fetch replacement with end-to-end encryption.

## Features

- Drop-in replacement for native fetch API
- Automatic end-to-end encryption
- Works in all modern browsers
- TypeScript support
- Zero configuration required

## Installation

```bash
npm install rossetta-client
```

## Usage

### Basic Usage

Simply replace your fetch calls with Rossetta fetch:

```javascript
import { createRossettaFetch } from 'rossetta-client';

// Initialize with your API base URL
const fetch = await createRossettaFetch('https://api.example.com');

// Use exactly like regular fetch - no code changes needed!
const response = await fetch('/api/users');
const data = await response.json();

// POST requests work too
const newUser = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: 'John Doe' })
});
```

### Advanced Usage

```javascript
import { createRossettaFetch } from 'rossetta-client';

const fetch = await createRossettaFetch('https://api.example.com', {
  publicKeyUrl: '/.well-known/rossetta-public-key',
  autoRefreshKey: true,
  keyRefreshInterval: 3600000, // 1 hour
});
```

## How It Works

1. On initialization, fetches the server's public key
2. For each request:
   - Generates a unique AES key for the request
   - Encrypts request data with AES
   - Encrypts AES key with server's public key (RSA)
   - Adds unique nonce and timestamp
   - Sends encrypted request to server
3. Server decrypts, processes, and returns encrypted response
4. Client decrypts response using the same AES key

## Security Features

- **End-to-end encryption**: All request/response data is encrypted
- **Replay attack prevention**: Each request has a unique nonce
- **Timestamp validation**: Requests expire after a configurable time
- **Hybrid encryption**: RSA for key exchange, AES for data encryption
- **Perfect forward secrecy**: Each request uses a new AES key
