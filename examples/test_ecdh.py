"""
Test to verify ECDH key exchange compatibility between client and server
"""

import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.backends import default_backend

# Generate server keys
server_private = ec.generate_private_key(ec.SECP256R1(), default_backend())
server_public = server_private.public_key()

# Export server public key
server_public_bytes = server_public.public_bytes(
    encoding=serialization.Encoding.DER,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)
server_public_b64 = base64.b64encode(server_public_bytes).decode('utf-8')

print("Server Public Key (base64):")
print(server_public_b64)
print(f"\nLength: {len(server_public_bytes)} bytes")
print(f"First 20 bytes (hex): {server_public_bytes[:20].hex()}")

# Simulate receiving a client public key (we'll generate one here)
client_private = ec.generate_private_key(ec.SECP256R1(), default_backend())
client_public = client_private.public_key()

client_public_bytes = client_public.public_bytes(
    encoding=serialization.Encoding.DER,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)
client_public_b64 = base64.b64encode(client_public_bytes).decode('utf-8')

print("\nClient Public Key (base64):")
print(client_public_b64)

# Server derives shared secret
server_shared = server_private.exchange(ec.ECDH(), client_public)
print(f"\nServer shared secret (raw): {server_shared.hex()}")

# Derive AES key
server_aes_key = HKDF(
    algorithm=hashes.SHA256(),
    length=32,
    salt=None,
    info=b'rossetta-api',
    backend=default_backend()
).derive(server_shared)

print(f"Server AES key: {server_aes_key.hex()}")

# Client derives shared secret
client_shared = client_private.exchange(ec.ECDH(), server_public)
print(f"\nClient shared secret (raw): {client_shared.hex()}")

# Derive AES key
client_aes_key = HKDF(
    algorithm=hashes.SHA256(),
    length=32,
    salt=None,
    info=b'rossetta-api',
    backend=default_backend()
).derive(client_shared)

print(f"Client AES key: {client_aes_key.hex()}")

# Verify they match
if server_aes_key == client_aes_key:
    print("\n✓ Keys match! ECDH is working correctly.")
else:
    print("\n✗ Keys don't match! There's a problem with ECDH.")
