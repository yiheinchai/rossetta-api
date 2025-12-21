"""
rossetta-django
Zero-config network request obfuscation middleware for Django

Usage:
    # settings.py
    MIDDLEWARE = [
        'rossetta_django.RossettaMiddleware',
        ...
    ]
    
    # Optional settings
    ROSSETTA_SECRET_KEY = 'your-secret-key-min-32-chars'
    ROSSETTA_TIMESTAMP_WINDOW = 300000  # 5 minutes in ms
"""

from django.http import HttpResponse, JsonResponse
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import hashlib
import hmac
import json
import secrets
import time
from base64 import b64encode, b64decode
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import os

try:
    from django.conf import settings
except ImportError:
    settings = None

ALGORITHM = 'AES-CBC'
DEFAULT_SECRET = os.getenv('ROSSETTA_SECRET_KEY', secrets.token_hex(32))
TIMESTAMP_WINDOW = int(os.getenv('ROSSETTA_TIMESTAMP_WINDOW', 5 * 60 * 1000))  # 5 minutes


class RossettaMiddleware:
    """
    Django middleware for Rossetta API obfuscation
    Provides automatic request/response encryption and endpoint obfuscation
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.secret = getattr(settings, 'ROSSETTA_SECRET_KEY', DEFAULT_SECRET) if settings else DEFAULT_SECRET
        self.timestamp_window = getattr(settings, 'ROSSETTA_TIMESTAMP_WINDOW', TIMESTAMP_WINDOW) if settings else TIMESTAMP_WINDOW
    
    def __call__(self, request):
        # Initialize or retrieve session
        session_key = self._get_or_create_session(request)
        endpoint_salt = request.session.get('rossetta_endpoint_salt')
        
        if not endpoint_salt:
            endpoint_salt = secrets.token_hex(16)
            request.session['rossetta_endpoint_salt'] = endpoint_salt
        
        # Store Rossetta utilities on request
        request.rossetta = RossettaHelper(session_key, endpoint_salt, self.timestamp_window)
        
        # Decrypt incoming request if needed
        if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            if request.content_type == 'text/plain':
                try:
                    body = request.body.decode('utf-8')
                    if body:
                        decrypted = self._decrypt(body, session_key)
                        
                        # Verify timestamp
                        if not self._is_timestamp_valid(decrypted.get('timestamp', 0)):
                            return self._error_response('Request expired', 401, session_key)
                        
                        # Verify signature
                        if not self._verify_signature(
                            decrypted.get('data', {}),
                            decrypted.get('timestamp', 0),
                            decrypted.get('signature', ''),
                            session_key
                        ):
                            return self._error_response('Invalid signature', 401, session_key)
                        
                        # Store decrypted data
                        request.rossetta_data = decrypted.get('data', {})
                except Exception as e:
                    print(f"Decryption error: {e}")
                    return self._error_response('Invalid request format', 400, session_key)
        
        response = self.get_response(request)
        
        # Encrypt response if it's JSON
        if hasattr(response, 'rossetta_encrypt') and response.rossetta_encrypt:
            try:
                # Get the data to encrypt
                if hasattr(response, 'data'):
                    data = response.data
                else:
                    data = json.loads(response.content.decode('utf-8'))
                
                encrypted = self._encrypt_response(data, session_key)
                return HttpResponse(encrypted, content_type='text/plain')
            except Exception as e:
                print(f"Encryption error: {e}")
        
        return response
    
    def _get_or_create_session(self, request):
        """Get or create session key"""
        if not request.session.session_key:
            request.session.create()
        
        session_key = request.session.get('rossetta_session_key')
        if not session_key:
            session_key = secrets.token_hex(32)
            request.session['rossetta_session_key'] = session_key
        
        return session_key
    
    def _encrypt(self, data: dict, session_key: str) -> str:
        """Encrypt data"""
        json_string = json.dumps(data)
        key = hashlib.sha256(session_key.encode()).digest()
        iv = secrets.token_bytes(16)
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        # Pad data
        padding_length = 16 - (len(json_string) % 16)
        padded_data = json_string + (chr(padding_length) * padding_length)
        
        encrypted = encryptor.update(padded_data.encode()) + encryptor.finalize()
        
        iv_b64 = b64encode(iv).decode()
        encrypted_b64 = b64encode(encrypted).decode()
        
        return f"{iv_b64}:{encrypted_b64}"
    
    def _decrypt(self, encrypted_data: str, session_key: str) -> dict:
        """Decrypt data"""
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
    
    def _encrypt_response(self, data, session_key):
        """Encrypt response with timestamp"""
        timestamp = int(time.time() * 1000)
        payload = {'data': data, 'timestamp': timestamp}
        return self._encrypt(payload, session_key)
    
    def _verify_signature(self, data: dict, timestamp: int, signature: str, session_key: str) -> bool:
        """Verify HMAC signature"""
        expected = self._create_signature(data, timestamp, session_key)
        return hmac.compare_digest(signature, expected)
    
    def _create_signature(self, data: dict, timestamp: int, session_key: str) -> str:
        """Create HMAC signature"""
        payload = json.dumps(data) + str(timestamp)
        return hmac.new(session_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
    
    def _is_timestamp_valid(self, timestamp: int) -> bool:
        """Validate timestamp"""
        now = int(time.time() * 1000)
        age = now - timestamp
        return 0 <= age <= self.timestamp_window
    
    def _error_response(self, message: str, status: int, session_key: str):
        """Create encrypted error response"""
        encrypted = self._encrypt({'error': message}, session_key)
        return HttpResponse(encrypted, status=status, content_type='text/plain')


class RossettaHelper:
    """Helper class attached to request object"""
    
    def __init__(self, session_key, endpoint_salt, timestamp_window):
        self.session_key = session_key
        self.endpoint_salt = endpoint_salt
        self.timestamp_window = timestamp_window
    
    def obfuscate_endpoint(self, endpoint: str) -> str:
        """Obfuscate endpoint name"""
        hash_input = f"{endpoint}{self.endpoint_salt}".encode()
        hash_digest = hashlib.sha256(hash_input).hexdigest()
        return f"/api/{hash_digest[:16]}"
    
    def encrypt(self, data: dict) -> str:
        """Encrypt data"""
        json_string = json.dumps(data)
        key = hashlib.sha256(self.session_key.encode()).digest()
        iv = secrets.token_bytes(16)
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        padding_length = 16 - (len(json_string) % 16)
        padded_data = json_string + (chr(padding_length) * padding_length)
        
        encrypted = encryptor.update(padded_data.encode()) + encryptor.finalize()
        
        iv_b64 = b64encode(iv).decode()
        encrypted_b64 = b64encode(encrypted).decode()
        
        return f"{iv_b64}:{encrypted_b64}"
    
    def decrypt(self, encrypted_data: str) -> dict:
        """Decrypt data"""
        iv_b64, encrypted_b64 = encrypted_data.split(':')
        iv = b64decode(iv_b64)
        encrypted = b64decode(encrypted_b64)
        
        key = hashlib.sha256(self.session_key.encode()).digest()
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        
        decrypted = decryptor.update(encrypted) + decryptor.finalize()
        
        padding_length = decrypted[-1]
        decrypted = decrypted[:-padding_length]
        
        json_string = decrypted.decode()
        return json.loads(json_string)


class RossettaResponse(HttpResponse):
    """Custom response class for encrypted responses"""
    
    def __init__(self, data, session_key, *args, **kwargs):
        timestamp = int(time.time() * 1000)
        payload = {'data': data, 'timestamp': timestamp}
        
        # Encrypt
        json_string = json.dumps(payload)
        key = hashlib.sha256(session_key.encode()).digest()
        iv = secrets.token_bytes(16)
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        padding_length = 16 - (len(json_string) % 16)
        padded_data = json_string + (chr(padding_length) * padding_length)
        
        encrypted = encryptor.update(padded_data.encode()) + encryptor.finalize()
        
        iv_b64 = b64encode(iv).decode()
        encrypted_b64 = b64encode(encrypted).decode()
        encrypted_str = f"{iv_b64}:{encrypted_b64}"
        
        super().__init__(encrypted_str, content_type='text/plain', *args, **kwargs)


def rossetta_view(view_func):
    """
    Decorator for Django views to enable Rossetta encryption
    
    Usage:
        @rossetta_view
        def my_view(request):
            return {'data': 'value'}
    """
    @csrf_exempt
    def wrapper(request, *args, **kwargs):
        # Get decrypted data if available
        if hasattr(request, 'rossetta_data'):
            request.data = request.rossetta_data
        
        # Call view
        result = view_func(request, *args, **kwargs)
        
        # If result is dict, encrypt it
        if isinstance(result, dict):
            session_key = request.session.get('rossetta_session_key')
            if session_key:
                return RossettaResponse(result, session_key)
            else:
                return JsonResponse(result)
        
        return result
    
    return wrapper


def init_session_view(request):
    """
    View for initializing Rossetta session
    
    Add to urls.py:
        from rossetta_django import init_session_view
        path('api/init-session/', init_session_view),
    """
    if request.method == 'POST':
        if not request.session.session_key:
            request.session.create()
        
        session_key = request.session.get('rossetta_session_key')
        endpoint_salt = request.session.get('rossetta_endpoint_salt')
        
        if not session_key:
            session_key = secrets.token_hex(32)
            request.session['rossetta_session_key'] = session_key
        
        if not endpoint_salt:
            endpoint_salt = secrets.token_hex(16)
            request.session['rossetta_endpoint_salt'] = endpoint_salt
        
        return JsonResponse({
            'sessionKey': session_key,
            'endpointSalt': endpoint_salt
        })
    
    return HttpResponse('Method not allowed', status=405)
