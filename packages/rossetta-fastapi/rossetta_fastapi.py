"""
@rossetta-api/fastapi
Zero-config network request obfuscation middleware for FastAPI

Usage:
    from rossetta_fastapi import RossettaMiddleware
    
    app = FastAPI()
    app.add_middleware(RossettaMiddleware)
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
import hashlib
import hmac
import json
import secrets
import time
from base64 import b64encode, b64decode
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from typing import Optional
import os

ALGORITHM = 'AES-CBC'
DEFAULT_SECRET = os.getenv('ROSSETTA_SECRET_KEY', secrets.token_hex(32))
TIMESTAMP_WINDOW = 5 * 60 * 1000  # 5 minutes in milliseconds


class RossettaMiddleware(BaseHTTPMiddleware):
    """
    Rossetta API middleware for FastAPI
    Provides automatic request/response obfuscation and encryption
    """
    
    def __init__(self, app, secret: str = DEFAULT_SECRET, timestamp_window: int = TIMESTAMP_WINDOW):
        super().__init__(app)
        self.secret = secret
        self.timestamp_window = timestamp_window
    
    def obfuscate_endpoint(self, endpoint: str, salt: str) -> str:
        """Generate obfuscated endpoint path"""
        hash_input = f"{endpoint}{salt}".encode()
        hash_digest = hashlib.sha256(hash_input).hexdigest()
        return f"/api/{hash_digest[:16]}"
    
    def encrypt(self, data: dict, session_key: str) -> str:
        """Encrypt data for transmission"""
        json_string = json.dumps(data)
        key = hashlib.sha256(session_key.encode()).digest()
        iv = secrets.token_bytes(16)
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        # Pad data to be multiple of 16 bytes
        padding_length = 16 - (len(json_string) % 16)
        padded_data = json_string + (chr(padding_length) * padding_length)
        
        encrypted = encryptor.update(padded_data.encode()) + encryptor.finalize()
        
        iv_b64 = b64encode(iv).decode()
        encrypted_b64 = b64encode(encrypted).decode()
        
        return f"{iv_b64}:{encrypted_b64}"
    
    def decrypt(self, encrypted_data: str, session_key: str) -> dict:
        """Decrypt received data"""
        iv_b64, encrypted_b64 = encrypted_data.split(':')
        iv = b64decode(iv_b64)
        encrypted = b64decode(encrypted_b64)
        
        key = hashlib.sha256(session_key.encode()).digest()
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        
        decrypted = decryptor.update(encrypted) + decryptor.finalize()
        
        # Remove padding
        padding_length = decrypted[-1]
        decrypted = decrypted[:-padding_length]
        
        json_string = decrypted.decode()
        return json.loads(json_string)
    
    def create_signature(self, data: dict, timestamp: int, session_key: str) -> str:
        """Create HMAC signature"""
        payload = json.dumps(data) + str(timestamp)
        signature = hmac.new(session_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
        return signature
    
    def verify_signature(self, data: dict, timestamp: int, signature: str, session_key: str) -> bool:
        """Verify HMAC signature"""
        expected = self.create_signature(data, timestamp, session_key)
        return hmac.compare_digest(signature, expected)
    
    def is_timestamp_valid(self, timestamp: int) -> bool:
        """Validate timestamp to prevent replay attacks"""
        now = int(time.time() * 1000)
        age = now - timestamp
        return 0 <= age <= self.timestamp_window
    
    async def dispatch(self, request: Request, call_next):
        """Main middleware dispatch"""
        
        # Initialize session if not exists
        if 'rossetta_key' not in request.session:
            request.session['rossetta_key'] = secrets.token_hex(32)
            request.session['endpoint_salt'] = secrets.token_hex(16)
        
        session_key = request.session['rossetta_key']
        endpoint_salt = request.session['endpoint_salt']
        
        # Add helper methods to request
        request.state.rossetta = {
            'session_key': session_key,
            'endpoint_salt': endpoint_salt,
            'obfuscate_endpoint': lambda name: self.obfuscate_endpoint(name, endpoint_salt),
            'encrypt': lambda data: self.encrypt(data, session_key),
            'decrypt': lambda data: self.decrypt(data, session_key)
        }
        
        # Decrypt incoming requests
        if request.method in ['POST', 'PUT', 'DELETE']:
            try:
                body = await request.body()
                if body:
                    encrypted_data = body.decode()
                    decrypted_payload = self.decrypt(encrypted_data, session_key)
                    
                    # Verify timestamp
                    if not self.is_timestamp_valid(decrypted_payload['timestamp']):
                        error_response = self.encrypt({'error': 'Request expired'}, session_key)
                        return Response(content=error_response, status_code=401, media_type='text/plain')
                    
                    # Verify signature
                    if not self.verify_signature(
                        decrypted_payload['data'],
                        decrypted_payload['timestamp'],
                        decrypted_payload['signature'],
                        session_key
                    ):
                        error_response = self.encrypt({'error': 'Invalid signature'}, session_key)
                        return Response(content=error_response, status_code=401, media_type='text/plain')
                    
                    # Store decrypted data in request state
                    request.state.decrypted_data = decrypted_payload['data']
            
            except Exception as e:
                print(f"Decryption error: {str(e)}")
                error_response = self.encrypt({'error': 'Invalid request format'}, session_key)
                return Response(content=error_response, status_code=400, media_type='text/plain')
        
        # Process request
        response = await call_next(request)
        
        return response


def encrypt_response(data: dict, session_key: str) -> str:
    """Helper function to encrypt responses"""
    middleware = RossettaMiddleware(None)
    timestamp = int(time.time() * 1000)
    response_payload = {'data': data, 'timestamp': timestamp}
    return middleware.encrypt(response_payload, session_key)
