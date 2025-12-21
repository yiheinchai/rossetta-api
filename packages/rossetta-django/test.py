"""
Tests for rossetta-django package
"""

import unittest
import json
import hashlib
import hmac
import secrets
from base64 import b64encode, b64decode
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend


def encrypt(data, session_key):
    """Test encryption function"""
    json_string = json.dumps(data)
    key = hashlib.sha256(session_key.encode()).digest()
    iv = secrets.token_bytes(16)
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    
    padding_length = 16 - (len(json_string) % 16)
    padded_data = json_string + (chr(padding_length) * padding_length)
    
    encrypted = encryptor.update(padded_data.encode()) + encryptor.finalize()
    
    iv_b64 = b64encode(iv).decode()
    encrypted_b64 = b64encode(encrypted).decode()
    
    return f"{iv_b64}:{encrypted_b64}"


def decrypt(encrypted_data, session_key):
    """Test decryption function"""
    iv_b64, encrypted_b64 = encrypted_data.split(':')
    iv = b64decode(iv_b64)
    encrypted = b64decode(encrypted_b64)
    
    key = hashlib.sha256(session_key.encode()).digest()
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    
    decrypted = decryptor.update(encrypted) + decryptor.finalize()
    
    # Remove padding - the last byte indicates padding length
    padding_length = decrypted[-1] if len(decrypted) > 0 else 0
    # Validate padding length
    if padding_length > 0 and padding_length <= 16:
        decrypted = decrypted[:-padding_length]
    
    json_string = decrypted.decode()
    return json.loads(json_string)


def create_signature(data, timestamp, session_key):
    """Test signature creation"""
    payload = json.dumps(data) + str(timestamp)
    return hmac.new(session_key.encode(), payload.encode(), hashlib.sha256).hexdigest()


def verify_signature(data, timestamp, signature, session_key):
    """Test signature verification"""
    expected = create_signature(data, timestamp, session_key)
    return hmac.compare_digest(signature, expected)


def obfuscate_endpoint(endpoint, salt):
    """Test endpoint obfuscation"""
    hash_input = f"{endpoint}{salt}".encode()
    hash_digest = hashlib.sha256(hash_input).hexdigest()
    return f"/api/{hash_digest[:16]}"


class TestRossettaDjango(unittest.TestCase):
    """Test suite for rossetta-django package"""
    
    def setUp(self):
        self.session_key = 'test-session-key-12345678901234567890'
        self.salt = 'test-salt'
    
    def test_obfuscate_endpoint(self):
        """Test endpoint obfuscation"""
        endpoint = 'test-endpoint'
        obfuscated = obfuscate_endpoint(endpoint, self.salt)
        
        self.assertTrue(obfuscated.startswith('/api/'))
        self.assertEqual(len(obfuscated), 21)  # '/api/' + 16 chars
    
    def test_encrypt_decrypt(self):
        """Test encryption and decryption"""
        test_data = {'message': 'Hello World', 'number': 42}
        
        encrypted = encrypt(test_data, self.session_key)
        self.assertIn(':', encrypted)
        
        decrypted = decrypt(encrypted, self.session_key)
        self.assertEqual(decrypted, test_data)
    
    def test_signature_creation_verification(self):
        """Test signature creation and verification"""
        test_data = {'test': 'data'}
        timestamp = 1234567890000
        
        signature = create_signature(test_data, timestamp, self.session_key)
        self.assertIsInstance(signature, str)
        self.assertEqual(len(signature), 64)  # SHA-256 hex length
        
        is_valid = verify_signature(test_data, timestamp, signature, self.session_key)
        self.assertTrue(is_valid)
    
    def test_invalid_signature_rejected(self):
        """Test that invalid signatures are rejected"""
        test_data = {'test': 'data'}
        timestamp = 1234567890000
        signature = create_signature(test_data, timestamp, self.session_key)
        
        # Modify data
        modified_data = {'test': 'modified'}
        is_valid = verify_signature(modified_data, timestamp, signature, self.session_key)
        self.assertFalse(is_valid)
    
    def test_complex_data_structures(self):
        """Test encryption of complex data structures"""
        complex_data = {
            'array': [1, 2, 3],
            'nested': {
                'key': 'value',
                'number': 123
            },
            'boolean': True,
            'null': None
        }
        
        encrypted = encrypt(complex_data, self.session_key)
        decrypted = decrypt(encrypted, self.session_key)
        self.assertEqual(decrypted, complex_data)
    
    def test_different_iv_each_encryption(self):
        """Test that different IV is used for each encryption"""
        test_data = {'message': 'Same data'}
        
        encrypted1 = encrypt(test_data, self.session_key)
        encrypted2 = encrypt(test_data, self.session_key)
        
        # Different IVs mean different encrypted outputs
        self.assertNotEqual(encrypted1, encrypted2)
        
        # But both decrypt to same data
        decrypted1 = decrypt(encrypted1, self.session_key)
        decrypted2 = decrypt(encrypted2, self.session_key)
        self.assertEqual(decrypted1, test_data)
        self.assertEqual(decrypted2, test_data)
    
    def test_unicode_handling(self):
        """Test handling of Unicode characters"""
        unicode_data = {
            'message': 'Hello 世界 🌍',
            'emoji': '🔐🛡️✅'
        }
        
        encrypted = encrypt(unicode_data, self.session_key)
        decrypted = decrypt(encrypted, self.session_key)
        self.assertEqual(decrypted, unicode_data)


if __name__ == '__main__':
    print('Running rossetta-django tests...')
    unittest.main(verbosity=2)
