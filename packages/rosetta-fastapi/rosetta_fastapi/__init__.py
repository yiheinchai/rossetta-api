"""
Rosetta FastAPI - End-to-end encryption middleware for FastAPI
"""

from .middleware import RosettaMiddleware
from .crypto import CryptoManager

__version__ = "1.0.0"
__all__ = ["RosettaMiddleware", "CryptoManager"]
