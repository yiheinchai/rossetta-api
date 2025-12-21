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
from rossetta_fastapi import RossettaMiddleware

app = FastAPI()

# Add Rossetta middleware
app.add_middleware(RossettaMiddleware)

# Define your routes normally
@app.get("/api/users")
async def get_users():
    return {"users": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

That's it! All API endpoints are now automatically obfuscated and encrypted.

## Usage

### Basic Setup

```python
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from rossetta_fastapi import RossettaMiddleware

app = FastAPI()

# Add session middleware (required)
app.add_middleware(
    SessionMiddleware,
    secret_key="your-secret-key-here"
)

# Add Rossetta middleware
app.add_middleware(
    RossettaMiddleware,
    secret="your-rossetta-secret",  # Optional
    timestamp_window=300000  # 5 minutes (default)
)
```

### Encrypting Responses

```python
from fastapi import Request
from rossetta_fastapi import encrypt_response

@app.get("/api/data")
async def get_data(request: Request):
    data = {"message": "Hello, World!"}
    session_key = request.state.rossetta['session_key']
    return encrypt_response(data, session_key)
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
    return encrypt_response(result, session_key)
```

### Session Initialization Endpoint

```python
@app.post("/api/init-session")
async def init_session(request: Request):
    return {
        "sessionKey": request.session['rossetta_key'],
        "endpointSalt": request.session['endpoint_salt']
    }
```

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

## Environment Variables

```bash
ROSSETTA_SECRET_KEY=your-secret-key-here  # Optional
```

## API Reference

### `RossettaMiddleware`

Main middleware class.

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

#### `encrypt_response(data, session_key)`

Encrypts response data.

**Parameters:**
- `data` (dict): Data to encrypt
- `session_key` (str): Session encryption key

**Returns:** Encrypted string

## Complete Example

```python
from fastapi import FastAPI, Request
from starlette.middleware.sessions import SessionMiddleware
from rossetta_fastapi import RossettaMiddleware, encrypt_response

app = FastAPI()

# Add middlewares
app.add_middleware(SessionMiddleware, secret_key="super-secret")
app.add_middleware(RossettaMiddleware)

# Session init
@app.post("/api/init-session")
async def init_session(request: Request):
    return {
        "sessionKey": request.session['rossetta_key'],
        "endpointSalt": request.session['endpoint_salt']
    }

# Protected endpoints
@app.get("/api/todos")
async def list_todos(request: Request):
    todos = [
        {"id": 1, "text": "Learn Rossetta API", "completed": False}
    ]
    return encrypt_response(todos, request.state.rossetta['session_key'])

@app.post("/api/todos")
async def create_todo(request: Request):
    data = request.state.decrypted_data
    todo = {
        "id": 2,
        "text": data['text'],
        "completed": False
    }
    return encrypt_response(todo, request.state.rossetta['session_key'])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## License

MIT
