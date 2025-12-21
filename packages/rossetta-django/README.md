# rossetta-django

Zero-config network request obfuscation middleware for Django. Protect your APIs from reverse engineering with session-based encryption and endpoint obfuscation.

## Features

- 🔒 **Session-Based Encryption**: Unique keys generated per session
- 🛡️ **Obfuscated Endpoints**: API endpoints are hashed and unreadable
- ✅ **Anti-Replay Protection**: Timestamp validation prevents replay attacks
- 🔐 **Request Signatures**: HMAC-SHA256 verifies request integrity
- ⚡ **Zero-Config Setup**: Works as Django middleware
- 🎯 **Django Native**: Built specifically for Django 3.2+

## Installation

```bash
pip install rossetta-django
```

## Quick Start

### 1. Add middleware to settings.py

```python
# settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'rossetta_django.RossettaMiddleware',  # Add this
    'django.middleware.common.CommonMiddleware',
    # ... other middleware
]

# Optional: Configure Rossetta
ROSSETTA_SECRET_KEY = 'your-secret-key-min-32-chars'
ROSSETTA_TIMESTAMP_WINDOW = 300000  # 5 minutes in milliseconds
```

### 2. Add session initialization endpoint

```python
# urls.py
from django.urls import path
from rossetta_django import init_session_view

urlpatterns = [
    path('api/init-session/', init_session_view, name='init-session'),
    # ... your other URLs
]
```

### 3. Use in your views

#### Class-Based Views

```python
from django.views import View
from django.http import JsonResponse
from rossetta_django import RossettaResponse

class TodoListView(View):
    def get(self, request):
        todos = [
            {'id': 1, 'text': 'Buy milk', 'completed': False}
        ]
        session_key = request.session.get('rossetta_session_key')
        return RossettaResponse(todos, session_key)
    
    def post(self, request):
        # Data is automatically decrypted and available in request.rossetta_data
        data = request.rossetta_data
        new_todo = {'id': 2, 'text': data['text'], 'completed': False}
        session_key = request.session.get('rossetta_session_key')
        return RossettaResponse(new_todo, session_key)
```

#### Function-Based Views with Decorator

```python
from rossetta_django import rossetta_view

@rossetta_view
def todo_list(request):
    if request.method == 'GET':
        return [
            {'id': 1, 'text': 'Buy milk', 'completed': False}
        ]
    
    if request.method == 'POST':
        # Access decrypted data via request.data
        data = request.data
        return {'id': 2, 'text': data['text'], 'completed': False}
```

### 4. Frontend Integration

Use with the Rossetta client:

```javascript
import RossettaClient from '@rossetta-api/client';

const api = new RossettaClient('http://localhost:8000');

// All requests are automatically encrypted
const todos = await api.get('/todos');
const newTodo = await api.post('/todos', { text: 'New task' });
```

## API Reference

### Middleware

#### `RossettaMiddleware`

Main middleware class that handles encryption/decryption.

**Settings:**
- `ROSSETTA_SECRET_KEY`: Secret key for encryption (optional, auto-generated if not provided)
- `ROSSETTA_TIMESTAMP_WINDOW`: Timestamp validation window in ms (default: 300000 / 5 minutes)

**Request Attributes:**

The middleware adds a `rossetta` helper object to each request:

```python
def my_view(request):
    # Access session key
    session_key = request.rossetta.session_key
    
    # Obfuscate an endpoint
    obfuscated = request.rossetta.obfuscate_endpoint('my-endpoint')
    
    # Encrypt data manually
    encrypted = request.rossetta.encrypt({'key': 'value'})
    
    # Decrypt data manually
    decrypted = request.rossetta.decrypt(encrypted_string)
```

For POST/PUT/DELETE/PATCH requests with encrypted bodies, the middleware automatically decrypts the data and stores it in `request.rossetta_data`.

### Response Classes

#### `RossettaResponse(data, session_key)`

Custom response class for encrypted responses.

**Parameters:**
- `data`: Dictionary or list to encrypt and return
- `session_key`: Session key from request.session

**Example:**
```python
from rossetta_django import RossettaResponse

def my_view(request):
    data = {'message': 'Hello'}
    session_key = request.session.get('rossetta_session_key')
    return RossettaResponse(data, session_key)
```

### Decorators

#### `@rossetta_view`

Decorator for function-based views that automatically handles encryption.

**Features:**
- Auto-decrypts request body to `request.data`
- Auto-encrypts dict responses
- Disables CSRF (since requests are signed)

**Example:**
```python
from rossetta_django import rossetta_view

@rossetta_view
def todos(request):
    if request.method == 'GET':
        return [{'id': 1, 'text': 'Todo'}]
    
    if request.method == 'POST':
        new_todo = {'id': 2, 'text': request.data['text']}
        return new_todo
```

### Views

#### `init_session_view(request)`

Built-in view for session initialization. Returns session keys to the client.

**URL Configuration:**
```python
from rossetta_django import init_session_view

urlpatterns = [
    path('api/init-session/', init_session_view),
]
```

**Response:**
```json
{
  "sessionKey": "...",
  "endpointSalt": "..."
}
```

## Examples

### REST API with Class-Based Views

```python
# views.py
from django.views import View
from rossetta_django import RossettaResponse

class TodoView(View):
    def get(self, request):
        todos = Todo.objects.all().values()
        session_key = request.session.get('rossetta_session_key')
        return RossettaResponse(list(todos), session_key)
    
    def post(self, request):
        data = request.rossetta_data
        todo = Todo.objects.create(text=data['text'])
        session_key = request.session.get('rossetta_session_key')
        return RossettaResponse({
            'id': todo.id,
            'text': todo.text,
            'completed': todo.completed
        }, session_key)
    
    def put(self, request):
        data = request.rossetta_data
        todo = Todo.objects.get(id=data['id'])
        todo.text = data.get('text', todo.text)
        todo.completed = data.get('completed', todo.completed)
        todo.save()
        session_key = request.session.get('rossetta_session_key')
        return RossettaResponse({'id': todo.id, 'text': todo.text}, session_key)
    
    def delete(self, request):
        data = request.rossetta_data
        Todo.objects.filter(id=data['id']).delete()
        session_key = request.session.get('rossetta_session_key')
        return RossettaResponse({'success': True}, session_key)
```

### Function-Based Views

```python
# views.py
from rossetta_django import rossetta_view
from .models import Todo

@rossetta_view
def todo_list(request):
    if request.method == 'GET':
        return list(Todo.objects.all().values())
    
    if request.method == 'POST':
        todo = Todo.objects.create(text=request.data['text'])
        return {'id': todo.id, 'text': todo.text}

@rossetta_view
def todo_detail(request, todo_id):
    todo = Todo.objects.get(id=todo_id)
    
    if request.method == 'GET':
        return {'id': todo.id, 'text': todo.text, 'completed': todo.completed}
    
    if request.method == 'PUT':
        todo.text = request.data.get('text', todo.text)
        todo.completed = request.data.get('completed', todo.completed)
        todo.save()
        return {'id': todo.id, 'text': todo.text}
    
    if request.method == 'DELETE':
        todo.delete()
        return {'success': True}
```

### Django REST Framework Integration

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rossetta_django import RossettaResponse

class TodoAPIView(APIView):
    def get(self, request):
        todos = Todo.objects.all().values()
        session_key = request.session.get('rossetta_session_key')
        return RossettaResponse(list(todos), session_key)
    
    def post(self, request):
        data = request.rossetta_data
        serializer = TodoSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            session_key = request.session.get('rossetta_session_key')
            return RossettaResponse(serializer.data, session_key)
        return Response(serializer.errors, status=400)
```

### Manual Encryption/Decryption

```python
def advanced_view(request):
    # Access Rossetta helper
    rossetta = request.rossetta
    
    # Obfuscate endpoint
    obfuscated = rossetta.obfuscate_endpoint('secret-endpoint')
    
    # Encrypt data manually
    sensitive_data = {'secret': 'value'}
    encrypted = rossetta.encrypt(sensitive_data)
    
    # Decrypt data manually
    if request.method == 'POST':
        encrypted_body = request.body.decode('utf-8')
        decrypted = rossetta.decrypt(encrypted_body)
    
    # Return encrypted response
    session_key = request.session.get('rossetta_session_key')
    return RossettaResponse({'status': 'ok'}, session_key)
```

## Configuration

### Environment Variables

```bash
# .env
ROSSETTA_SECRET_KEY=your-secret-key-minimum-32-characters-long
ROSSETTA_TIMESTAMP_WINDOW=300000
```

### Django Settings

```python
# settings.py

# Required: Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.db'  # or 'cache', 'file', etc.
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True  # In production with HTTPS

# Optional: Rossetta configuration
ROSSETTA_SECRET_KEY = os.getenv('ROSSETTA_SECRET_KEY', 'default-secret-key')
ROSSETTA_TIMESTAMP_WINDOW = 300000  # 5 minutes
```

## Security Features

### Session-Based Encryption
Each client session gets unique encryption keys, preventing key reuse.

### Endpoint Obfuscation
Endpoint names are hashed:
```
/api/todos → /api/a3f2e8b1c9d4e5f6
```

### Request Signing
All requests include HMAC-SHA256 signatures to prevent tampering.

### Replay Protection
Timestamps on requests prevent replay attacks (5-minute window).

## Best Practices

1. **Use HTTPS in production** - Always use TLS/SSL in production
2. **Set a strong SECRET_KEY** - Use environment variables for secrets
3. **Enable secure cookies** - Set `SESSION_COOKIE_SECURE = True` in production
4. **Implement rate limiting** - Use Django rate limiting middleware
5. **Add authentication** - Combine with Django's authentication system
6. **Use database sessions** - For production, use DB or cache-backed sessions

## Troubleshooting

### "Request expired" errors
- Check server clock synchronization
- Adjust `ROSSETTA_TIMESTAMP_WINDOW` if needed

### "Invalid signature" errors
- Ensure session is persistent across requests
- Check that middleware is properly configured

### Session not persisting
- Verify `SessionMiddleware` is before `RossettaMiddleware`
- Check session backend configuration
- Ensure cookies are enabled in client

## Compatibility

- Django 3.2 or higher
- Python 3.8 or higher
- Works with Django REST Framework
- Compatible with all Django session backends

## Testing

```python
# tests.py
from django.test import TestCase, Client

class RossettaTestCase(TestCase):
    def setUp(self):
        self.client = Client()
    
    def test_session_init(self):
        response = self.client.post('/api/init-session/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('sessionKey', data)
        self.assertIn('endpointSalt', data)
```

## License

MIT

## Links

- [GitHub Repository](https://github.com/yiheinchai/rossetta-api)
- [Issue Tracker](https://github.com/yiheinchai/rossetta-api/issues)
- [Main Documentation](https://github.com/yiheinchai/rossetta-api#readme)

## Related Packages

- [@rossetta-api/client](https://www.npmjs.com/package/@rossetta-api/client) - Universal client
- [@rossetta-api/nextjs](https://www.npmjs.com/package/@rossetta-api/nextjs) - Next.js middleware
- [@rossetta-api/express](https://www.npmjs.com/package/@rossetta-api/express) - Express middleware
- [rossetta-fastapi](https://pypi.org/project/rossetta-fastapi/) - FastAPI middleware
