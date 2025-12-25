# Rossetta Example FastAPI Server

This is an example FastAPI application demonstrating how to add end-to-end encryption with Rossetta.

## Setup

```bash
pip install -e ../../rossetta-core
pip install -e ../../rossetta-fastapi
pip install -e .
```

## Run

```bash
python main.py
```

The server will start on http://localhost:8000

## Endpoints

- `GET /` - Root endpoint
- `GET /api/users` - Get all users
- `GET /api/users/{user_id}` - Get specific user
- `POST /api/users` - Create new user
- `PUT /api/users/{user_id}` - Update user
- `DELETE /api/users/{user_id}` - Delete user
- `GET /.well-known/rossetta-public-key` - Get public key (for clients)

## Key Feature

The **only** code change needed to enable E2E encryption was adding this single line:

```python
app.add_middleware(RossettaMiddleware)
```

All your existing routes and logic remain unchanged!
