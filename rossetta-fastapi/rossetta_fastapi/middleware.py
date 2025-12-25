"""FastAPI middleware for Rossetta API encryption."""

import json
import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from rossetta_core.crypto import (
    KeyManager,
    decrypt_data,
    encrypt_response,
    generate_aes_key,
)
from .nonce_cache import NonceCache


class RossettaMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for end-to-end encryption.
    
    This middleware:
    - Serves the public key at /.well-known/rossetta-public-key
    - Decrypts incoming encrypted requests
    - Encrypts outgoing responses
    - Prevents replay attacks using nonce tracking
    - Validates request timestamps
    """
    
    def __init__(
        self,
        app,
        max_timestamp_diff: int = 300,
        nonce_cache_size: int = 10000,
        key_manager: KeyManager = None,
    ):
        """Initialize middleware.
        
        Args:
            app: FastAPI application instance.
            max_timestamp_diff: Maximum allowed timestamp difference in seconds (default: 5 minutes).
            nonce_cache_size: Maximum number of nonces to track (default: 10000).
            key_manager: Optional KeyManager instance. If None, generates new keys.
        """
        super().__init__(app)
        self.key_manager = key_manager or KeyManager()
        self.max_timestamp_diff = max_timestamp_diff
        self.nonce_cache = NonceCache(max_size=nonce_cache_size)
        # Store AES keys per request (for response encryption)
        self.request_keys = {}
    
    async def dispatch(self, request: Request, call_next: Callable):
        """Process request and response.
        
        Args:
            request: Incoming request.
            call_next: Next middleware/handler in chain.
            
        Returns:
            Response object.
        """
        # Serve public key endpoint
        if request.url.path == "/.well-known/rossetta-public-key":
            return JSONResponse({
                "public_key": self.key_manager.get_public_key_pem()
            })
        
        # Check if request is encrypted
        content_type = request.headers.get("content-type", "")
        
        if content_type == "application/vnd.rossetta.encrypted+json":
            # Handle encrypted request
            try:
                # Read request body using receive directly to avoid caching
                body_parts = []
                while True:
                    message = await request.receive()
                    if message['type'] == 'http.request':
                        body_parts.append(message.get('body', b''))
                        if not message.get('more_body', False):
                            break
                    elif message['type'] == 'http.disconnect':
                        break
                
                body = b''.join(body_parts)
                encrypted_payload = json.loads(body.decode('utf-8'))
                
                # Validate timestamp
                timestamp = encrypted_payload.get("timestamp", 0)
                current_time = int(time.time())
                
                if abs(current_time - timestamp) > self.max_timestamp_diff:
                    return JSONResponse(
                        {"error": "Request timestamp expired"},
                        status_code=400
                    )
                
                # Check nonce for replay attacks
                nonce = encrypted_payload.get("nonce", "")
                if not self.nonce_cache.add(nonce):
                    return JSONResponse(
                        {"error": "Request nonce already used (replay attack detected)"},
                        status_code=400
                    )
                
                # Decrypt request
                decrypted_data = decrypt_data(encrypted_payload, self.key_manager.private_key)
                
                # Extract AES key for response encryption
                import base64
                from cryptography.hazmat.primitives.asymmetric import padding
                from cryptography.hazmat.primitives import hashes
                
                encrypted_key = base64.b64decode(encrypted_payload["encrypted_key"])
                aes_key = self.key_manager.private_key.decrypt(
                    encrypted_key,
                    padding.OAEP(
                        mgf=padding.MGF1(algorithm=hashes.SHA256()),
                        algorithm=hashes.SHA256(),
                        label=None
                    )
                )
                
                # Store AES key for response encryption
                request_id = id(request)
                self.request_keys[request_id] = aes_key
                
                # Reconstruct request with decrypted data
                from starlette.datastructures import Headers, MutableHeaders
                from io import BytesIO
                
                # Update request method and path if provided
                if "method" in decrypted_data:
                    request.scope["method"] = decrypted_data["method"]
                
                # Update headers
                if "headers" in decrypted_data and decrypted_data["headers"]:
                    # Start with a fresh headers list
                    headers_dict = {}
                    # Copy existing headers
                    for name, value in request.scope["headers"]:
                        headers_dict[name.decode() if isinstance(name, bytes) else name] = value.decode() if isinstance(value, bytes) else value
                    # Add/update with decrypted headers
                    for key, value in decrypted_data["headers"].items():
                        headers_dict[key.lower()] = value
                    # Set content-type to application/json for the backend
                    headers_dict["content-type"] = "application/json"
                else:
                    # Just update content-type
                    headers_dict = {}
                    for name, value in request.scope["headers"]:
                        headers_dict[name.decode() if isinstance(name, bytes) else name] = value.decode() if isinstance(value, bytes) else value
                    headers_dict["content-type"] = "application/json"
                
                # Update body
                if "body" in decrypted_data and decrypted_data["body"] is not None:
                    body_data = json.dumps(decrypted_data["body"]).encode('utf-8')
                else:
                    body_data = b""
                
                # Update content-length
                headers_dict["content-length"] = str(len(body_data))
                
                # Convert headers back to list format
                request.scope["headers"] = [(k.encode(), v.encode()) for k, v in headers_dict.items()]
                
                # Create new receive function with decrypted body
                body_sent = False
                async def receive():
                    nonlocal body_sent
                    if not body_sent:
                        body_sent = True
                        return {"type": "http.request", "body": body_data, "more_body": False}
                    return {"type": "http.disconnect"}
                
                request._receive = receive
                
                # Process request
                response = await call_next(request)
                
                # Read response body
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk
                
                # Parse response data
                try:
                    response_data = json.loads(response_body.decode('utf-8'))
                except:
                    response_data = {"data": response_body.decode('utf-8')}
                
                # Encrypt response
                encrypted_response = encrypt_response(response_data, aes_key)
                
                # Clean up stored key
                del self.request_keys[request_id]
                
                # Return encrypted response
                return JSONResponse(
                    encrypted_response,
                    status_code=response.status_code,
                    headers={"content-type": "application/vnd.rossetta.encrypted+json"}
                )
                
            except Exception as e:
                # Clean up on error
                request_id = id(request)
                if request_id in self.request_keys:
                    del self.request_keys[request_id]
                
                return JSONResponse(
                    {"error": f"Failed to process encrypted request: {str(e)}"},
                    status_code=400
                )
        
        # Pass through non-encrypted requests
        return await call_next(request)
