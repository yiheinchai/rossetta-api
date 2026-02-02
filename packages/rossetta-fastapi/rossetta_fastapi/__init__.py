"""
Rossetta FastAPI Middleware
End-to-end encryption middleware for FastAPI applications
"""

from .middleware import RossettaMiddleware
from .crypto import generate_keypair, derive_shared_key
from .obfuscation import (
    encode_to_google_format,
    decode_from_google_format,
    encode_response_to_google_format,
    decode_from_form_data,
)

__version__ = "0.1.5"
__all__ = [
    "RossettaMiddleware",
    "generate_keypair",
    "derive_shared_key",
    "encode_to_google_format",
    "decode_from_google_format",
    "encode_response_to_google_format",
    "decode_from_form_data",
]
