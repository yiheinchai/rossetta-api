# rossetta-fastapi

Zero-config network request obfuscation middleware for FastAPI

## Features

- 🔒 **Automatic endpoint obfuscation** - API endpoints are hashed and unreadable
- 🔐 **Request/response encryption** - AES-256-CBC encryption for all data
- ✅ **Session-based key management** - No hardcoded secrets in frontend
- 🛡️ **Anti-replay protection** - Timestamp validation prevents replay attacks
- 📝 **Request signatures** - HMAC-SHA256 ensures request integrity

## Installation

```bash
pip install rossetta-fastapi
```

## Quick Start

```python
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from rossetta_fastapi import setup_rossetta

app = FastAPI()

# Setup Rossetta - this adds middleware AND creates /api/init-session endpoint
setup_rossetta(app)

# Add session middleware (required)
app.add_middleware(SessionMiddleware, secret_key="your-secret-key-here")

# Define your routes normally
@app.get("/api/users")
async def get_users():
    return {"users": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

That's it! The `/api/init-session` endpoint is automatically created, and all API endpoints are now ready for obfuscation and encryption.

## Usage

### Basic Setup

```python
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from rossetta_fastapi import setup_rossetta

app = FastAPI()

# Setup Rossetta - automatically creates /api/init-session and adds middleware
setup_rossetta(
    app,
    secret="your-rossetta-secret",  # Optional
    timestamp_window=300000  # 5 minutes (default)
)

# Add session middleware (required)
app.add_middleware(
    SessionMiddleware,
    secret_key="your-secret-key-here"
)
```

### Encrypting Responses

Use the `@protected_route` decorator for automatic response encryption:

```python
from fastapi import Request
from rossetta_fastapi import protected_route

@app.get("/api/data")
@protected_route
async def get_data(request: Request):
    return {"message": "Hello, World!"}  # Automatically encrypted
```

Or manually encrypt responses:

```python
from fastapi import Request, Response
from rossetta_fastapi import encrypt_response

@app.get("/api/data")
async def get_data(request: Request):
    data = {"message": "Hello, World!"}
    session_key = request.state.rossetta['session_key']
    encrypted = encrypt_response(data, session_key)
    return Response(content=encrypted, media_type='text/plain')
```

### Accessing Request Data

```python
@app.post("/api/create")
async def create_item(request: Request):
    # Decrypted data is in request.state
    data = request.state.decrypted_data
    name = data.get('name')
    
    result = {"id": 1, "name": name}
    session_key = request.state.rossetta['session_key']
    encrypted = encrypt_response(result, session_key)
    return Response(content=encrypted, media_type='text/plain')
```

**Note**: The `/api/init-session` endpoint is now automatically created by `setup_rossetta()`. You don't need to define it yourself!

## How It Works

1. **Session Initialization**: Client requests session keys
2. **Key Generation**: Server generates unique encryption keys per session
3. **Endpoint Obfuscation**: All endpoints are hashed using SHA-256
4. **Request Encryption**: Client encrypts requests with session key
5. **Server Decryption**: Middleware automatically decrypts and validates
6. **Response Encryption**: Responses are encrypted before sending

## Security Features

- **No Hardcoded Secrets**: Keys are generated per session
- **Perfect Forward Secrecy**: Each session has unique keys
- **Replay Attack Prevention**: Timestamp-based validation
- **Request Integrity**: HMAC signatures prevent tampering
- **Endpoint Obfuscation**: API structure hidden from inspection

## ⚠️ Production Deployment

**IMPORTANT**: This package provides obfuscation and encryption at the application layer. For production use, you **MUST** also implement:

### Required for Production:
1. **HTTPS/TLS**: Always use HTTPS in production
   - Obfuscation is NOT a replacement for TLS
   - Use valid SSL/TLS certificates
   - Configure HSTS headers

2. **Environment Variables**: Never hardcode secrets
   ```bash
   ROSSETTA_SECRET_KEY=your-secure-random-key-here
   ```

3. **Rate Limiting**: Add rate limiting middleware
   ```python
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)
   ```

4. **Authentication & Authorization**: Add proper auth layer
   - This package only handles obfuscation
   - Implement JWT, OAuth, or session-based auth

5. **Database Security**: Use parameterized queries/ORMs
6. **Input Validation**: Validate all user inputs with Pydantic
7. **CORS Configuration**: Restrict allowed origins

### Recommended Security Stack:
```
[Client] → HTTPS/TLS → [Rate Limiter] → [Auth Middleware] → [Rossetta Middleware] → [Your API]
```

## Environment Variables

```bash
ROSSETTA_SECRET_KEY=your-secret-key-here  # Optional
```

## API Reference

### `setup_rossetta(app, secret=None, timestamp_window=300000)`

Main setup function that configures Rossetta for your FastAPI app.

**Parameters:**
- `app` (FastAPI): Your FastAPI application instance
- `secret` (str): Secret key for encryption (auto-generated if not provided)
- `timestamp_window` (int): Request validity window in milliseconds (default: 300000)

**What it does:**
- Creates the `/api/init-session` endpoint automatically
- Adds the `RossettaMiddleware` to your app

### `RossettaMiddleware`

The underlying middleware class (automatically added by `setup_rossetta`).

**Parameters:**
- `secret` (str): Secret key for encryption (auto-generated if not provided)
- `timestamp_window` (int): Request validity window in milliseconds (default: 300000)

### Request State

After middleware processing:
- `request.state.rossetta['session_key']`: Current session encryption key
- `request.state.rossetta['endpoint_salt']`: Salt for endpoint obfuscation
- `request.state.rossetta['obfuscate_endpoint']`: Function to obfuscate endpoints
- `request.state.rossetta['encrypt']`: Function to encrypt data
- `request.state.rossetta['decrypt']`: Function to decrypt data
- `request.state.decrypted_data`: Decrypted request payload

### Helper Functions

#### `setup_rossetta(app, secret, timestamp_window)`

Sets up Rossetta middleware and creates `/api/init-session` endpoint.

**Parameters:**
- `app` (FastAPI): FastAPI application instance
- `secret` (str): Secret key for encryption
- `timestamp_window` (int): Request validity window in milliseconds

#### `encrypt_response(data, session_key)`

Encrypts response data.

**Parameters:**
- `data` (dict): Data to encrypt
- `session_key` (str): Session encryption key

**Returns:** Encrypted string

#### `@protected_route`

Decorator that automatically encrypts route responses.

**Usage:**
```python
@app.get('/api/data')
@protected_route
async def get_data(request: Request):
    return {'message': 'Hello, World!'}
```

## Complete Example

```python
from fastapi import FastAPI, Request, Response
from starlette.middleware.sessions import SessionMiddleware
from rossetta_fastapi import setup_rossetta, encrypt_response, protected_route

app = FastAPI()

# Setup Rossetta - this creates /api/init-session automatically
setup_rossetta(app)

# Add session middleware
app.add_middleware(SessionMiddleware, secret_key="super-secret")

# Using @protected_route decorator (recommended)
@app.get("/api/todos")
@protected_route
async def list_todos(request: Request):
    todos = [
        {"id": 1, "text": "Learn Rossetta API", "completed": False}
    ]
    return todos  # Automatically encrypted

# Manual encryption
@app.post("/api/todos")
async def create_todo(request: Request):
    data = request.state.decrypted_data
    todo = {
        "id": 2,
        "text": data['text'],
        "completed": False
    }
    session_key = request.state.rossetta['session_key']
    encrypted = encrypt_response(todo, session_key)
    return Response(content=encrypted, media_type='text/plain')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## License

MIT
