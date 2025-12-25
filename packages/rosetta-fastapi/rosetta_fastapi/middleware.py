"""
Rosetta FastAPI Middleware
Provides end-to-end encryption for FastAPI applications
"""

import base64
import json
import time
from typing import Dict, Set, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from .crypto import CryptoManager


class RosettaMiddleware(BaseHTTPMiddleware):
    """
    Middleware for end-to-end encryption of API requests and responses.
    
    Usage:
        app.add_middleware(RosettaMiddleware, secret_key="your-secret-key")
    """
    
    def __init__(
        self,
        app,
        secret_key: str,
        replay_window: int = 300,  # 5 minutes
        enable_key_rotation: bool = False
    ):
        super().__init__(app)
        self.secret_key = secret_key
        self.replay_window = replay_window
        self.enable_key_rotation = enable_key_rotation
        
        # Server's ECDH key pair
        self.crypto_manager = CryptoManager()
        
        # Store client sessions and shared keys
        self.client_sessions: Dict[str, bytes] = {}
        
        # Track nonces to prevent replay attacks
        self.used_nonces: Set[str] = set()
        self.nonce_timestamps: Dict[str, float] = {}
    
    async def dispatch(self, request: Request, call_next):
        """Process requests and responses"""
        
        # Handle key exchange endpoint
        if request.url.path == "/__rosetta__/key-exchange":
            return await self._handle_key_exchange(request)
        
        # Handle encrypted requests
        if request.headers.get("X-Rosetta-Encrypted") == "true":
            return await self._handle_encrypted_request(request, call_next)
        
        # Pass through non-encrypted requests
        return await call_next(request)
    
    async def _handle_key_exchange(self, request: Request) -> JSONResponse:
        """Handle ECDH key exchange with client"""
        try:
            body = await request.json()
            client_public_key = body.get("clientPublicKey")
            
            if not client_public_key:
                return JSONResponse(
                    {"error": "Missing clientPublicKey"},
                    status_code=400
                )
            
            # Derive shared key
            shared_key = self.crypto_manager.derive_shared_key(client_public_key)
            
            # Store session (using client public key as session ID)
            self.client_sessions[client_public_key] = shared_key
            
            # Return server's public key
            return JSONResponse({
                "serverPublicKey": self.crypto_manager.get_public_key_base64()
            })
        
        except Exception as e:
            return JSONResponse(
                {"error": f"Key exchange failed: {str(e)}"},
                status_code=500
            )
    
    async def _handle_encrypted_request(self, request: Request, call_next):
        """Decrypt request, process it, and encrypt response"""
        try:
            # Parse encrypted request
            body = await request.json()
            encrypted_payload = body.get("encryptedPayload")
            iv = body.get("iv")
            
            if not encrypted_payload or not iv:
                return JSONResponse(
                    {"error": "Invalid encrypted request"},
                    status_code=400
                )
            
            # Decrypt request
            decrypted = await self._decrypt_request(encrypted_payload, iv)
            
            # Validate request (timestamp and nonce)
            if not self._validate_request(decrypted):
                return JSONResponse(
                    {"error": "Invalid or replayed request"},
                    status_code=401
                )
            
            # Create a new ASGI scope with decrypted data
            new_scope = await self._create_modified_scope(request, decrypted)
            
            # Create a response holder
            response_started = False
            response_status = 200
            response_headers = []
            response_body = []
            
            async def send(message):
                nonlocal response_started, response_status, response_headers, response_body
                if message["type"] == "http.response.start":
                    response_started = True
                    response_status = message["status"]
                    response_headers = message.get("headers", [])
                elif message["type"] == "http.response.body":
                    response_body.append(message.get("body", b""))
            
            # Create receive function for body
            body_sent = False
            async def receive():
                nonlocal body_sent
                if not body_sent:
                    body_sent = True
                    body_data = decrypted.get("body")
                    if body_data:
                        if isinstance(body_data, str):
                            return {"type": "http.request", "body": body_data.encode()}
                        else:
                            return {"type": "http.request", "body": json.dumps(body_data).encode()}
                return {"type": "http.request", "body": b""}
            
            # Call the app directly
            await self.app(new_scope, receive, send)
            
            # Combine response body
            full_response_body = b"".join(response_body)
            
            # Encrypt response
            encrypted_response = await self._encrypt_response(
                full_response_body.decode('utf-8') if full_response_body else "{}",
                response_status,
                {k.decode(): v.decode() for k, v in response_headers}
            )
            
            return JSONResponse(
                encrypted_response,
                headers={"X-Rosetta-Encrypted": "true"}
            )
        
        except Exception as e:
            return JSONResponse(
                {"error": f"Request processing failed: {str(e)}"},
                status_code=500
            )
    
    async def _decrypt_request(self, encrypted_payload: str, iv: str) -> dict:
        """Decrypt the request payload"""
        # Get the first available shared key (in production, use session tracking)
        if not self.client_sessions:
            raise ValueError("No active sessions. Perform key exchange first.")
        
        shared_key = list(self.client_sessions.values())[0]
        
        # Decode base64
        ciphertext = base64.b64decode(encrypted_payload)
        iv_bytes = base64.b64decode(iv)
        
        # Decrypt
        decrypted_json = CryptoManager.decrypt(ciphertext, shared_key, iv_bytes)
        return json.loads(decrypted_json)
    
    async def _encrypt_response(
        self,
        body: str,
        status: int,
        headers: dict
    ) -> dict:
        """Encrypt the response payload"""
        # Get the first available shared key
        shared_key = list(self.client_sessions.values())[0]
        
        # Prepare response payload
        response_data = {
            "body": json.loads(body) if body else None,
            "status": status,
            "statusText": "OK" if status == 200 else "Error",
            "headers": headers
        }
        
        # Generate IV
        iv = CryptoManager.generate_iv()
        
        # Encrypt
        ciphertext = CryptoManager.encrypt(
            json.dumps(response_data),
            shared_key,
            iv
        )
        
        return {
            "encryptedPayload": base64.b64encode(ciphertext).decode('utf-8'),
            "iv": base64.b64encode(iv).decode('utf-8')
        }
    
    def _validate_request(self, decrypted: dict) -> bool:
        """Validate timestamp and nonce to prevent replay attacks"""
        timestamp = decrypted.get("timestamp")
        nonce = decrypted.get("nonce")
        
        if not timestamp or not nonce:
            return False
        
        # Check timestamp (within replay window)
        current_time = time.time() * 1000  # Convert to milliseconds
        if abs(current_time - timestamp) > (self.replay_window * 1000):
            return False
        
        # Check nonce (not used before)
        if nonce in self.used_nonces:
            return False
        
        # Mark nonce as used
        self.used_nonces.add(nonce)
        self.nonce_timestamps[nonce] = timestamp
        
        # Clean up old nonces
        self._cleanup_old_nonces()
        
        return True
    
    def _cleanup_old_nonces(self):
        """Remove old nonces outside the replay window"""
        current_time = time.time() * 1000
        cutoff_time = current_time - (self.replay_window * 1000)
        
        # Find nonces to remove
        nonces_to_remove = [
            nonce for nonce, ts in self.nonce_timestamps.items()
            if ts < cutoff_time
        ]
        
        # Remove them
        for nonce in nonces_to_remove:
            self.used_nonces.discard(nonce)
            self.nonce_timestamps.pop(nonce, None)
    
    async def _create_modified_scope(
        self,
        original_request: Request,
        decrypted: dict
    ) -> dict:
        """Create a new ASGI scope with decrypted data"""
        # Extract request details
        method = decrypted.get("method", "GET")
        headers_dict = decrypted.get("headers", {})
        
        # Convert headers to proper format
        headers_list = []
        for key, value in headers_dict.items():
            if isinstance(value, list):
                for v in value:
                    headers_list.append((key.lower().encode(), str(v).encode()))
            else:
                headers_list.append((key.lower().encode(), str(value).encode()))
        
        # Add content-type if body exists
        body = decrypted.get("body")
        if body and not any(h[0] == b'content-type' for h in headers_list):
            headers_list.append((b'content-type', b'application/json'))
        
        # Create new scope
        scope = original_request.scope.copy()
        scope["method"] = method
        scope["headers"] = headers_list
        
        return scope
