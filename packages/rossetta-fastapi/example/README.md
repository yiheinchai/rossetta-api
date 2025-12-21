# Rossetta FastAPI Example

A complete working example demonstrating the Rossetta FastAPI middleware in action.

## Features

This example demonstrates:
- ✅ Automatic session initialization via `/api/init-session` endpoint
- ✅ Automatic encrypted request/response handling for all `/api/*` endpoints
- ✅ Zero manual encryption code - just return your data normally!
- ✅ Accessing decrypted request data via `request.state.decrypted_data`
- ✅ Complete CRUD API (Create, Read, Update, Delete)

## Installation

```bash
# Install dependencies
pip install fastapi uvicorn starlette cryptography itsdangerous

# Or install from the package
cd ..
pip install -e .
```

## Running the Example

```bash
# Run the development server
python app.py

# Or using uvicorn directly
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The server will start at http://localhost:8000

## API Endpoints

### Session Initialization (automatically created)
```bash
POST /api/init-session
```

This endpoint is automatically created by the middleware. You don't need to define it!

### Todo Endpoints

All endpoints below use encryption:

- `GET /api/todos` - List all todos (uses `@protected_route`)
- `POST /api/todos` - Create a todo (manual encryption)
- `PUT /api/todos/{id}` - Update a todo (uses `@protected_route`)
- `DELETE /api/todos/{id}` - Delete a todo (uses `@protected_route`)

### Utility Endpoints

- `GET /` - API information (unencrypted)
- `GET /health` - Health check (unencrypted)

## Testing with curl

### 1. Initialize Session
```bash
curl -c cookies.txt -X POST http://localhost:8000/api/init-session
```

### 2. Make Requests

The easiest way to test encrypted endpoints is with the `@rossetta-api/client` package or by building a frontend client.

For manual testing, you'll need to:
1. Get the session keys from `/api/init-session`
2. Encrypt your request payload
3. Send the encrypted data
4. Decrypt the response

See the main README for client integration examples.

## Usage Patterns

### Pattern 1: Simple GET Endpoint (Recommended)

Just return your data - encryption happens automatically:

```python
@app.get("/api/todos")
async def list_todos(request: Request):
    return todos  # Automatically encrypted
```

### Pattern 2: POST Endpoint with Request Data

Access decrypted data and return your response:

```python
@app.post("/api/todos")
async def create_todo(request: Request):
    data = request.state.decrypted_data
    result = {"id": 1, "text": data['text']}
    return result  # Automatically encrypted
```

No manual encryption needed!

## Environment Variables

```bash
# Session middleware secret (required in production)
SESSION_SECRET_KEY=your-secure-session-key

# Rossetta encryption secret (optional, auto-generated if not set)
ROSSETTA_SECRET_KEY=your-rossetta-secret
```

## Production Deployment

**IMPORTANT**: This example is for development only!

For production:

1. **Use HTTPS**: Always deploy behind HTTPS/TLS
2. **Set secure secrets**: Use strong, randomly generated secrets
3. **Use a production server**: 
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
   ```
4. **Add authentication**: Implement proper auth (JWT, OAuth, etc.)
5. **Add rate limiting**: Protect against abuse
6. **Use a real database**: Don't use in-memory storage
7. **Add input validation**: Use Pydantic models
8. **Configure CORS**: Restrict allowed origins

## Integration with Frontend

Use the `@rossetta-api/client` package for easy frontend integration:

```javascript
import RossettaClient from '@rossetta-api/client';

const client = new RossettaClient('http://localhost:8000');

// The client automatically initializes the session
const todos = await client.get('/api/todos');
await client.post('/api/todos', { text: 'New todo' });
```

## Troubleshooting

### "Session not found" errors
- Make sure `SessionMiddleware` is added before `RossettaMiddleware`
- Ensure cookies are being sent with requests

### "Invalid signature" errors  
- Check that client and server are using the same session
- Verify timestamp is within the valid window (default: 5 minutes)

### Import errors
- Ensure `rossetta_fastapi` is in your Python path
- Install all required dependencies

## Learn More

- [Rossetta API Documentation](https://github.com/yiheinchai/rossetta-api)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Starlette Middleware](https://www.starlette.io/middleware/)
