# Rosetta FastAPI

End-to-end encryption middleware for FastAPI applications.

## Installation

```bash
pip install rosetta-fastapi
```

## Usage

```python
from fastapi import FastAPI
from rosetta_fastapi import RosettaMiddleware

app = FastAPI()

# Add the middleware - that's it!
app.add_middleware(RosettaMiddleware, secret_key="your-secret-key-here")

# All your existing routes now support e2e encryption
@app.get("/api/data")
def get_data():
    return {"message": "This response is encrypted"}
```

## Features

- Single line integration
- Automatic request decryption
- Automatic response encryption
- Replay attack prevention
- Works with all existing FastAPI routes

## How it Works

The middleware intercepts all requests, decrypts them, processes them through your normal FastAPI routes, and encrypts the response. Your application code remains unchanged.

## License

MIT
