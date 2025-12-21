# Getting Started with Rossetta FastAPI

This guide will help you get started with the Rossetta FastAPI example.

## Prerequisites

- Python 3.8 or higher
- pip

## Installation

```bash
# Install dependencies
pip install fastapi uvicorn starlette cryptography itsdangerous requests
```

## Quick Start

### 1. Start the Example Server

```bash
python app.py
```

The server will start at `http://localhost:8000`

You should see:
```
============================================================
Rossetta FastAPI Example Server
============================================================
Server running at: http://localhost:8000
Session init endpoint: http://localhost:8000/api/init-session
API docs: http://localhost:8000/docs
============================================================
```

### 2. Run the Test Client

In a new terminal:

```bash
python test_client.py
```

You should see output like:
```
============================================================
Rossetta FastAPI Test Client
============================================================

1. Initializing session...
✓ Session initialized
  Session Key: ...
  Endpoint Salt: ...

2. Testing GET /api/todos (encrypted response)...
✓ Received 2 todos:
  - [1] Learn Rossetta API (completed: False)
  - [2] Build secure app (completed: False)

3. Testing POST /api/todos (encrypted request & response)...
✓ Created todo:
  - [3] Test from Python client (completed: False)

4. Verifying todo was added...
✓ Now have 3 todos

============================================================
✓ All tests passed!
============================================================
```

## What Just Happened?

1. **Server Started**: The FastAPI server started with Rossetta middleware enabled
2. **Auto-created Endpoint**: The `/api/init-session` endpoint was automatically created
3. **Session Initialized**: The test client requested session keys from the server
4. **Encrypted Communication**: All subsequent requests were encrypted using AES-256-CBC
5. **Request Validation**: Each request was signed with HMAC-SHA256 and validated

## Key Features Demonstrated

### Automatic Session Initialization

```python
# This endpoint is created automatically by setup_rossetta()
POST /api/init-session
```

Returns:
```json
{
  "sessionKey": "...",
  "endpointSalt": "..."
}
```

### Encrypted GET Requests

The `@protected_route` decorator automatically encrypts responses:

```python
@app.get("/api/todos")
@protected_route
async def list_todos(request: Request):
    return todos  # Automatically encrypted
```

### Encrypted POST Requests

Access decrypted data via `request.state.decrypted_data`:

```python
@app.post("/api/todos")
async def create_todo(request: Request):
    data = request.state.decrypted_data
    # Use data['text'] etc.
```

## Explore the API

Visit `http://localhost:8000/docs` to see the interactive API documentation.

## Next Steps

1. **Customize the Example**: Modify `app.py` to add your own endpoints
2. **Add Authentication**: Integrate JWT or OAuth for user authentication
3. **Connect a Database**: Replace in-memory storage with a real database
4. **Deploy to Production**: Follow the production deployment guide in the README

## Troubleshooting

### Port Already in Use

If port 8000 is already in use, modify the port in `app.py`:

```python
uvicorn.run(app, host="0.0.0.0", port=8001)  # Changed to 8001
```

### Import Errors

Make sure you're running from the example directory:

```bash
cd /path/to/rossetta-api/packages/rossetta-fastapi/example
python app.py
```

### Dependencies Missing

Install all required dependencies:

```bash
pip install fastapi uvicorn starlette cryptography itsdangerous requests
```

## Learn More

- [Main README](../README.md) - Full documentation
- [Example App Source](app.py) - Full example code
- [Test Client Source](test_client.py) - Example of how to use the client
