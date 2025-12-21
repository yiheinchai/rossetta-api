# Rossetta Flask Example Application

This is a development example application demonstrating the rossetta-flask middleware.

## ⚠️ IMPORTANT SECURITY NOTE

**This example runs Flask in debug mode (`debug=True`) for development purposes only.**

**DO NOT use this configuration in production!**

## Running the Example

### Development Mode (This Example)

```bash
cd example
pip install -r requirements.txt
python app.py
```

The server will start at http://localhost:5000 with debug mode enabled for easy development.

### Production Deployment

For production, use a production WSGI server:

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn (recommended)
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# Or with uwsgi
uwsgi --http :5000 --wsgi-file app.py --callable app --processes 4
```

**Production Checklist:**
- [ ] Remove or disable debug mode
- [ ] Use a production WSGI server (gunicorn, uwsgi, etc.)
- [ ] Use HTTPS/TLS
- [ ] Set secure environment variables
- [ ] Enable rate limiting
- [ ] Add authentication/authorization
- [ ] Use production database (not in-memory)
- [ ] Configure proper logging
- [ ] Set up monitoring

## API Endpoints

### Session Initialization
```
POST /api/init-session
```
Returns session keys for the client.

### Todo Operations
- `GET /api/todos` - List all todos
- `POST /api/todos` - Create a new todo
- `PUT /api/todos/<id>` - Update a todo
- `DELETE /api/todos/<id>` - Delete a todo

All endpoints (except `/api/init-session`) use encrypted requests and responses.

## Testing with Client

Use the `@rossetta-api/client` package to test the encrypted endpoints:

```javascript
import RossettaClient from '@rossetta-api/client';

const api = new RossettaClient('http://localhost:5000');
const todos = await api.get('/api/todos');
console.log(todos);
```

## Security Features Demonstrated

- ✅ Session-based encryption
- ✅ Request/response obfuscation
- ✅ HMAC signatures
- ✅ Timestamp validation
- ✅ Automatic encryption/decryption
- ✅ Protected route decorator
- ✅ Manual encryption helpers
