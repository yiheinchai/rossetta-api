# Rossetta FastAPI

FastAPI middleware for Rossetta API - provides seamless end-to-end encryption for FastAPI applications.

## Features

- Drop-in middleware for FastAPI applications
- Automatic request decryption and response encryption
- Replay attack prevention with nonce tracking
- Timestamp validation
- Public key endpoint for clients

## Installation

```bash
pip install rossetta-fastapi
```

## Usage

```python
from fastapi import FastAPI
from rossetta_fastapi import RossettaMiddleware

app = FastAPI()

# Add Rossetta middleware - single line integration!
app.add_middleware(RossettaMiddleware)

# Your existing routes work without changes
@app.get("/api/users")
async def get_users():
    return {"users": ["Alice", "Bob"]}

@app.post("/api/users")
async def create_user(user: dict):
    return {"id": 1, **user}
```

The middleware will:
1. Serve the public key at `/.well-known/rossetta-public-key`
2. Decrypt all incoming encrypted requests
3. Encrypt all outgoing responses
4. Prevent replay attacks
5. Validate request timestamps

## Configuration

```python
from rossetta_fastapi import RossettaMiddleware

app.add_middleware(
    RossettaMiddleware,
    max_timestamp_diff=300,  # Max 5 minutes timestamp difference
    nonce_cache_size=10000,  # Max nonces to track
)
```
