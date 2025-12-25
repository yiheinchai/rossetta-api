"""Core cryptographic functions for Rossetta API."""

import base64
import json
import secrets
import time
from typing import Any, Dict, Tuple

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend


class KeyManager:
    """Manages RSA key pairs for encryption."""
    
    def __init__(self, private_key: rsa.RSAPrivateKey = None):
        """Initialize key manager.
        
        Args:
            private_key: Optional existing private key. If None, generates new key pair.
        """
        if private_key is None:
            self.private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
                backend=default_backend()
            )
        else:
            self.private_key = private_key
        
        self.public_key = self.private_key.public_key()
    
    def get_public_key_pem(self) -> str:
        """Get public key in PEM format as string."""
        pem = self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return pem.decode('utf-8')
    
    def get_private_key_pem(self) -> str:
        """Get private key in PEM format as string."""
        pem = self.private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        return pem.decode('utf-8')
    
    @staticmethod
    def load_public_key(pem_data: str) -> rsa.RSAPublicKey:
        """Load public key from PEM string."""
        return serialization.load_pem_public_key(
            pem_data.encode('utf-8'),
            backend=default_backend()
        )
    
    @staticmethod
    def load_private_key(pem_data: str) -> rsa.RSAPrivateKey:
        """Load private key from PEM string."""
        return serialization.load_pem_private_key(
            pem_data.encode('utf-8'),
            password=None,
            backend=default_backend()
        )


def generate_nonce(length: int = 32) -> str:
    """Generate a cryptographically secure random nonce.
    
    Args:
        length: Length of the nonce in bytes.
        
    Returns:
        Base64 encoded nonce string.
    """
    return base64.b64encode(secrets.token_bytes(length)).decode('utf-8')


def generate_aes_key() -> bytes:
    """Generate a random AES-256 key.
    
    Returns:
        32 bytes of random data for AES-256.
    """
    return secrets.token_bytes(32)


def encrypt_with_aes(data: bytes, key: bytes) -> Tuple[bytes, bytes, bytes]:
    """Encrypt data using AES-256-GCM.
    
    Args:
        data: Data to encrypt.
        key: 32-byte AES key.
        
    Returns:
        Tuple of (encrypted_data, nonce, tag).
    """
    nonce = secrets.token_bytes(12)  # GCM standard nonce size
    cipher = Cipher(
        algorithms.AES(key),
        modes.GCM(nonce),
        backend=default_backend()
    )
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(data) + encryptor.finalize()
    return ciphertext, nonce, encryptor.tag


def decrypt_with_aes(encrypted_data: bytes, key: bytes, nonce: bytes, tag: bytes) -> bytes:
    """Decrypt data using AES-256-GCM.
    
    Args:
        encrypted_data: Encrypted data.
        key: 32-byte AES key.
        nonce: Nonce used for encryption.
        tag: Authentication tag.
        
    Returns:
        Decrypted data.
    """
    cipher = Cipher(
        algorithms.AES(key),
        modes.GCM(nonce, tag),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    return decryptor.update(encrypted_data) + decryptor.finalize()


def encrypt_data(data: Dict[str, Any], public_key_pem: str) -> Dict[str, Any]:
    """Encrypt request data using hybrid encryption.
    
    Args:
        data: Dictionary containing request data (method, url, headers, body).
        public_key_pem: Server's public key in PEM format.
        
    Returns:
        Dictionary with encrypted data, encrypted key, nonce, timestamp, and signature.
    """
    # Generate AES key for this request
    aes_key = generate_aes_key()
    
    # Serialize data to JSON
    json_data = json.dumps(data).encode('utf-8')
    
    # Encrypt data with AES
    encrypted_data, aes_nonce, aes_tag = encrypt_with_aes(json_data, aes_key)
    
    # Combine encrypted data with nonce and tag
    combined = aes_nonce + aes_tag + encrypted_data
    
    # Encrypt AES key with RSA public key
    public_key = KeyManager.load_public_key(public_key_pem)
    encrypted_key = public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    # Generate nonce and timestamp
    nonce = generate_nonce()
    timestamp = int(time.time())
    
    # Create signature (hash of encrypted data + nonce + timestamp)
    signature_data = f"{base64.b64encode(combined).decode('utf-8')}{nonce}{timestamp}".encode('utf-8')
    digest = hashes.Hash(hashes.SHA256(), backend=default_backend())
    digest.update(signature_data)
    signature = base64.b64encode(digest.finalize()).decode('utf-8')
    
    return {
        "encrypted_data": base64.b64encode(combined).decode('utf-8'),
        "encrypted_key": base64.b64encode(encrypted_key).decode('utf-8'),
        "nonce": nonce,
        "timestamp": timestamp,
        "signature": signature,
    }


def decrypt_data(encrypted_payload: Dict[str, Any], private_key: rsa.RSAPrivateKey) -> Dict[str, Any]:
    """Decrypt request data.
    
    Args:
        encrypted_payload: Dictionary with encrypted data, encrypted key, nonce, timestamp, signature.
        private_key: Server's private key.
        
    Returns:
        Decrypted data dictionary.
    """
    # Verify signature
    combined = base64.b64decode(encrypted_payload["encrypted_data"])
    signature_data = f"{encrypted_payload['encrypted_data']}{encrypted_payload['nonce']}{encrypted_payload['timestamp']}".encode('utf-8')
    digest = hashes.Hash(hashes.SHA256(), backend=default_backend())
    digest.update(signature_data)
    expected_signature = base64.b64encode(digest.finalize()).decode('utf-8')
    
    if expected_signature != encrypted_payload["signature"]:
        raise ValueError("Invalid signature")
    
    # Decrypt AES key with RSA private key
    encrypted_key = base64.b64decode(encrypted_payload["encrypted_key"])
    aes_key = private_key.decrypt(
        encrypted_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    # Extract nonce, tag, and encrypted data
    aes_nonce = combined[:12]
    aes_tag = combined[12:28]
    encrypted_data = combined[28:]
    
    # Decrypt data with AES
    decrypted_json = decrypt_with_aes(encrypted_data, aes_key, aes_nonce, aes_tag)
    
    # Parse JSON
    return json.loads(decrypted_json.decode('utf-8'))


def encrypt_response(data: Any, aes_key: bytes) -> Dict[str, Any]:
    """Encrypt response data using AES.
    
    Args:
        data: Response data to encrypt.
        aes_key: AES key to use (same key from request).
        
    Returns:
        Dictionary with encrypted data and nonce.
    """
    # Serialize data to JSON
    json_data = json.dumps(data).encode('utf-8')
    
    # Encrypt with AES
    encrypted_data, aes_nonce, aes_tag = encrypt_with_aes(json_data, aes_key)
    
    # Combine nonce, tag, and encrypted data
    combined = aes_nonce + aes_tag + encrypted_data
    
    # Generate response nonce for additional security
    response_nonce = generate_nonce()
    
    return {
        "encrypted_data": base64.b64encode(combined).decode('utf-8'),
        "nonce": response_nonce,
    }


def decrypt_response(encrypted_payload: Dict[str, Any], aes_key: bytes) -> Any:
    """Decrypt response data.
    
    Args:
        encrypted_payload: Dictionary with encrypted data and nonce.
        aes_key: AES key used for encryption.
        
    Returns:
        Decrypted response data.
    """
    # Decode the combined data
    combined = base64.b64decode(encrypted_payload["encrypted_data"])
    
    # Extract nonce, tag, and encrypted data
    aes_nonce = combined[:12]
    aes_tag = combined[12:28]
    encrypted_data = combined[28:]
    
    # Decrypt with AES
    decrypted_json = decrypt_with_aes(encrypted_data, aes_key, aes_nonce, aes_tag)
    
    # Parse JSON
    return json.loads(decrypted_json.decode('utf-8'))
