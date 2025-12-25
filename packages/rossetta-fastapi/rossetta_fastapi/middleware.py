"""
RossettaMiddleware for FastAPI
Provides end-to-end encryption for all API requests
"""

import json
import time
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from .crypto import (
    generate_keypair,
    export_public_key,
    import_public_key,
    derive_shared_key,
    encrypt,
    decrypt,
)
from .session import SessionManager


class RossettaMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware for end-to-end encryption
    
    Add this middleware to your FastAPI app with a single line:
    app.add_middleware(RossettaMiddleware)
    """
    
    def __init__(
        self,
        app: ASGIApp,
        session_duration: int = 3600,
        max_timestamp_drift: int = 300,
    ):
        """
        Initialize middleware
        
        Args:
            app: FastAPI application
            session_duration: Session duration in seconds (default: 1 hour)
            max_timestamp_drift: Max allowed timestamp drift in seconds (default: 5 minutes)
        """
        super().__init__(app)
        self.server_private_key, self.server_public_key = generate_keypair()
        self.session_manager = SessionManager(session_duration)
        self.max_timestamp_drift = max_timestamp_drift
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with encryption/decryption"""
        
        # Handle key exchange handshake
        if request.url.path == "/__rossetta_handshake__":
            return await self._handle_handshake(request)
            
        # Check if request is encrypted
        if request.headers.get("X-Rossetta-Encrypted") != "true":
            # Pass through non-encrypted requests
            return await call_next(request)
            
        try:
            # Decrypt request
            body = await request.body()
            encrypted_data = json.loads(body.decode('utf-8'))
            
            # Get session key (use client's public key hash as session ID)
            ciphertext = encrypted_data['ciphertext']
            iv = encrypted_data['iv']
            
            # We need to decrypt to get the session info
            # For now, use a simple session based on client IP or create session during handshake
            # This is a simplified approach - in production, use proper session tokens
            session_id = request.client.host if request.client else "default"
            session = self.session_manager.get_session(session_id)
            
            if not session:
                return JSONResponse(
                    content={"error": "No valid session. Please establish handshake first."},
                    status_code=401
                )
                
            # Decrypt request payload
            decrypted = decrypt(session.shared_key, ciphertext, iv)
            payload = json.loads(decrypted)
            
            # Validate timestamp to prevent replay attacks
            timestamp = payload.get('timestamp', 0)
            current_time = time.time() * 1000  # Convert to milliseconds
            if abs(current_time - timestamp) > (self.max_timestamp_drift * 1000):
                return JSONResponse(
                    content={"error": "Request timestamp out of allowed range"},
                    status_code=400
                )
                
            # Validate nonce
            nonce = payload.get('nonce')
            if not nonce or not self.session_manager.validate_nonce(nonce):
                return JSONResponse(
                    content={"error": "Invalid or duplicate nonce"},
                    status_code=400
                )
            
            # Reconstruct the original request
            original_method = payload.get('method', 'GET')
            original_headers = payload.get('headers', {})
            original_body = payload.get('body')
            
            # Create new request scope with decrypted data
            scope = request.scope.copy()
            scope['method'] = original_method
            
            # Update headers
            if original_headers:
                for key, value in original_headers.items():
                    if key.lower() not in ['x-rossetta-encrypted', 'content-length']:
                        scope['headers'] = [
                            (k, v) for k, v in scope['headers']
                            if k.decode('utf-8').lower() != key.lower()
                        ]
                        scope['headers'].append((key.encode(), str(value).encode()))
            
            # Create modified request
            from starlette.requests import Request as StarletteRequest
            modified_request = StarletteRequest(scope, request.receive)
            
            # If there's a body, we need to handle it
            if original_body:
                # Store the body for later retrieval
                modified_request._body = original_body.encode('utf-8') if isinstance(original_body, str) else original_body
                
            # Process request through the app
            response = await call_next(modified_request)
            
            # Read response body
            response_body = b""
            async for chunk in response.body_iterator:
                response_body += chunk
                
            # Try to parse as JSON, otherwise use as string
            try:
                response_data = json.loads(response_body.decode('utf-8'))
            except:
                response_data = response_body.decode('utf-8')
            
            # Encrypt response
            response_payload = {
                'status': response.status_code,
                'statusText': 'OK' if response.status_code == 200 else 'Error',
                'headers': dict(response.headers),
                'body': response_data,
            }
            
            encrypted_response = encrypt(
                session.shared_key,
                json.dumps(response_payload)
            )
            
            return JSONResponse(
                content={
                    'ciphertext': encrypted_response[0],
                    'iv': encrypted_response[1],
                },
                status_code=200
            )
            
        except Exception as e:
            return JSONResponse(
                content={"error": f"Decryption error: {str(e)}"},
                status_code=400
            )
            
    async def _handle_handshake(self, request: Request) -> Response:
        """Handle ECDH key exchange handshake"""
        try:
            body = await request.json()
            client_public_key_b64 = body.get('client_public_key')
            
            if not client_public_key_b64:
                return JSONResponse(
                    content={"error": "Missing client_public_key"},
                    status_code=400
                )
                
            # Import client's public key
            client_public_key = import_public_key(client_public_key_b64)
            
            # Derive shared secret
            shared_key = derive_shared_key(self.server_private_key, client_public_key)
            
            # Create session (use client IP as session ID for simplicity)
            session_id = request.client.host if request.client else "default"
            self.session_manager.create_session(session_id, shared_key)
            
            # Return server's public key
            server_public_key_b64 = export_public_key(self.server_public_key)
            
            return JSONResponse(
                content={
                    'server_public_key': server_public_key_b64,
                },
                status_code=200
            )
            
        except Exception as e:
            return JSONResponse(
                content={"error": f"Handshake error: {str(e)}"},
                status_code=400
            )
