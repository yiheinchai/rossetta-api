# @rossetta-api/nextjs

Zero-config network request obfuscation middleware for Next.js. Protect your APIs from reverse engineering with session-based encryption and endpoint obfuscation.

## Features

- 🔒 **Session-Based Encryption**: Unique keys generated per session
- 🛡️ **Obfuscated Endpoints**: API endpoints are hashed and unreadable
- ✅ **Anti-Replay Protection**: Timestamp validation prevents replay attacks
- 🔐 **Request Signatures**: HMAC-SHA256 verifies request integrity
- ⚡ **Zero-Config Setup**: Works with both App Router and Pages Router
- 🎯 **Next.js Optimized**: Built specifically for Next.js 13+ and App Router

## Installation

```bash
npm install @rossetta-api/nextjs
```

## Quick Start

### App Router (Recommended)

#### 1. Create a session initialization route

```typescript
// app/api/init-session/route.ts
import { createSessionInitHandler } from '@rossetta-api/nextjs';

export const POST = createSessionInitHandler();
```

#### 2. Protect your API routes

```typescript
// app/api/todos/route.ts
import { createRossettaHandler } from '@rossetta-api/nextjs';

export const GET = createRossettaHandler(async (data, context) => {
  // Your logic here - data is automatically decrypted
  return [
    { id: 1, text: 'Buy milk', completed: false },
    { id: 2, text: 'Walk dog', completed: true }
  ];
});

export const POST = createRossettaHandler(async (data, context) => {
  // data contains the decrypted request body
  const newTodo = { id: Date.now(), ...data };
  return newTodo;
});
```

### Pages Router

#### 1. Create session initialization endpoint

```javascript
// pages/api/init-session.js
export default function handler(req, res) {
  if (req.method === 'POST') {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const sessionKey = crypto.randomBytes(32).toString('hex');
    const endpointSalt = crypto.randomBytes(16).toString('hex');
    
    // Store session (use your session store)
    res.setHeader('Set-Cookie', `rossetta_session=${sessionId}; HttpOnly; Path=/`);
    res.json({ sessionKey, endpointSalt });
  }
}
```

#### 2. Wrap your API routes

```javascript
// pages/api/todos.js
import { rossettaMiddleware } from '@rossetta-api/nextjs';

async function handler(req, res) {
  if (req.method === 'GET') {
    const todos = [
      { id: 1, text: 'Buy milk', completed: false }
    ];
    return res.encryptResponse(todos);
  }
  
  if (req.method === 'POST') {
    // req.body is automatically decrypted
    const newTodo = { id: Date.now(), ...req.body };
    return res.encryptResponse(newTodo);
  }
}

export default rossettaMiddleware(handler);
```

### Frontend Integration

Use with the Rossetta client:

```typescript
import RossettaClient from '@rossetta-api/client';

const api = new RossettaClient('http://localhost:3000');

// All requests are automatically encrypted
const todos = await api.get('/todos');
const newTodo = await api.post('/todos', { text: 'New task' });
```

## API Reference

### App Router

#### `createSessionInitHandler()`

Creates a session initialization handler for the App Router.

```typescript
export const POST = createSessionInitHandler();
```

#### `createRossettaHandler(handler, options?)`

Creates a protected route handler for the App Router.

**Parameters:**
- `handler`: Async function that receives `(data, context)` where:
  - `data`: Decrypted request body (for POST/PUT/DELETE)
  - `context`: Extended Next.js context with Rossetta utilities
- `options`: Optional configuration object

**Returns:** Next.js route handler

**Example:**
```typescript
export const POST = createRossettaHandler(async (data, context) => {
  // Access session key
  console.log(context.sessionKey);
  
  // Obfuscate an endpoint
  const obfuscated = context.obfuscateEndpoint('my-endpoint');
  
  return { success: true, data };
});
```

### Pages Router

#### `rossettaMiddleware(handler, options?)`

Wraps a Pages Router API handler with encryption middleware.

**Parameters:**
- `handler`: Standard Next.js API route handler
- `options`: Optional configuration object

**Returns:** Wrapped API handler

**Request Extensions:**
```javascript
req.rossetta = {
  sessionKey: string,
  endpointSalt: string,
  obfuscateEndpoint: (name) => string,
  encrypt: (data) => string,
  decrypt: (data) => any
}
```

**Response Extensions:**
```javascript
res.encryptResponse(data) // Encrypts and sends response
```

## Security Features

### Session-Based Encryption
Each client session gets unique encryption keys, preventing key reuse across sessions.

### Endpoint Obfuscation
Endpoint names are hashed, making them unreadable in network traffic:
```
/api/todos → /api/a3f2e8b1c9d4e5f6
```

### Request Signing
All requests include HMAC-SHA256 signatures to prevent tampering.

### Replay Protection
Timestamps on requests prevent replay attacks (5-minute window).

## Configuration

### Environment Variables

```bash
# Optional: Set a custom secret key
ROSSETTA_SECRET_KEY=your-secret-key-min-32-chars

# Production mode (enables secure cookies)
NODE_ENV=production
```

### Options

Both `createRossettaHandler` and `rossettaMiddleware` accept options:

```typescript
{
  timestampWindow?: number; // Timestamp validation window (default: 5 minutes)
}
```

## TypeScript Support

The package is written in JavaScript but includes JSDoc comments for TypeScript IntelliSense.

## Examples

### Protected Todo API (App Router)

```typescript
// app/api/todos/route.ts
import { createRossettaHandler } from '@rossetta-api/nextjs';

const todos = []; // In production, use a database

export const GET = createRossettaHandler(async () => {
  return todos;
});

export const POST = createRossettaHandler(async (data) => {
  const newTodo = {
    id: Date.now(),
    text: data.text,
    completed: false
  };
  todos.push(newTodo);
  return newTodo;
});
```

### Protected User API (Pages Router)

```javascript
// pages/api/users.js
import { rossettaMiddleware } from '@rossetta-api/nextjs';

async function handler(req, res) {
  if (req.method === 'GET') {
    const users = await getUsers(); // Your database call
    return res.encryptResponse(users);
  }
}

export default rossettaMiddleware(handler);
```

## Best Practices

1. **Use HTTPS in production** - Encryption protects payload, but TLS protects transport
2. **Implement rate limiting** - Prevent brute force attacks
3. **Add authentication** - Rossetta handles obfuscation, you handle auth
4. **Rotate secrets** - Change ROSSETTA_SECRET_KEY periodically
5. **Use environment variables** - Never hardcode secrets

## Compatibility

- Next.js 13.0.0 or higher
- Node.js 18.17.0 or higher
- Works with both App Router and Pages Router
- Compatible with Edge Runtime (with limitations)

## Troubleshooting

### "Request expired" errors
- Check system clock synchronization
- Adjust `timestampWindow` if needed

### "Invalid signature" errors
- Ensure sessionKey is consistent across requests
- Verify client and server are using same encryption logic

### Session not persisting
- Check cookie settings
- Ensure `credentials: 'include'` in fetch requests

## License

MIT

## Links

- [GitHub Repository](https://github.com/yiheinchai/rossetta-api)
- [Issue Tracker](https://github.com/yiheinchai/rossetta-api/issues)
- [Main Documentation](https://github.com/yiheinchai/rossetta-api#readme)

## Related Packages

- [@rossetta-api/client](https://www.npmjs.com/package/@rossetta-api/client) - Universal client
- [@rossetta-api/express](https://www.npmjs.com/package/@rossetta-api/express) - Express middleware
- [rossetta-fastapi](https://pypi.org/project/rossetta-fastapi/) - FastAPI middleware
