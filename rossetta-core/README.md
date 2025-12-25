# Rossetta Core

Core encryption utilities for Rossetta API - provides end-to-end encryption functionality.

## Features

- RSA key pair generation and management
- AES-256-GCM encryption/decryption
- Nonce-based replay attack prevention
- Request signing and verification
- Timestamp validation

## Installation

```bash
pip install rossetta-core
```

## Usage

```python
from rossetta_core.crypto import KeyManager, encrypt_data, decrypt_data

# Generate keys
key_manager = KeyManager()
public_key = key_manager.get_public_key_pem()

# Encrypt data
encrypted = encrypt_data(data, public_key)

# Decrypt data
decrypted = decrypt_data(encrypted, key_manager.private_key)
```
