# Security Considerations

## Current Implementation

### Session Management
The current implementation uses client IP addresses as session identifiers. This is a **simplified approach** suitable for development and testing.

**Limitations:**
- Multiple clients behind NAT will share sessions
- Load balancers may change client IPs
- IPv6 privacy extensions can cause issues

### Production Recommendations

For production use, consider implementing one of these approaches:

#### 1. Token-Based Sessions
```python
# Generate a session token during handshake
import secrets

session_token = secrets.token_urlsafe(32)
# Return token to client
# Client includes token in subsequent requests
```

#### 2. Cookie-Based Sessions
```python
# Use secure HTTP-only cookies
response.set_cookie(
    "rossetta_session",
    session_token,
    httponly=True,
    secure=True,
    samesite="strict"
)
```

#### 3. Header-Based Sessions
```python
# Client sends session ID in custom header
session_id = request.headers.get("X-Rossetta-Session")
```

### Body Type Limitations

The client currently supports:
- ✅ String bodies
- ✅ JSON-serializable objects
- ❌ FormData (not yet supported)
- ❌ Blob (not yet supported)
- ❌ ArrayBuffer (not yet supported)

For file uploads and binary data, you'll need to:
1. Convert to Base64 strings before encryption, or
2. Implement a separate upload endpoint without encryption

### Error Logging

The middleware uses Python's logging module. Configure it in your application:

```python
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rossetta_fastapi")

# In production, send to proper log aggregation
handler = logging.FileHandler('/var/log/rossetta.log')
handler.setLevel(logging.ERROR)
logger.addHandler(handler)
```

### HTTPS Requirement

**Always use HTTPS in production.** While Rossetta API encrypts the payload, metadata like:
- URL paths
- Request timing
- Request sizes

...are still visible to network observers without HTTPS.

### Rate Limiting

Consider adding rate limiting to the handshake endpoint to prevent DoS attacks:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/__rossetta_handshake__")
@limiter.limit("10/minute")
async def handshake():
    ...
```

### Session Storage

For horizontal scaling, consider using distributed session storage:

```python
# Use Redis for session storage
import redis

redis_client = redis.Redis(host='localhost', port=6379)

class RedisSessionManager(SessionManager):
    def create_session(self, session_id: str, shared_key: bytes):
        redis_client.setex(
            f"session:{session_id}",
            self.session_duration,
            shared_key
        )
```

## Security Checklist for Production

- [ ] Replace IP-based sessions with tokens
- [ ] Enable HTTPS/TLS
- [ ] Configure proper logging
- [ ] Add rate limiting
- [ ] Use distributed session storage for scaling
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Monitor for encryption errors
- [ ] Implement session cleanup
- [ ] Add metrics and monitoring
