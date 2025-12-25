"""Data models for encrypted requests and responses."""

from dataclasses import dataclass
from typing import Dict, Any, Optional


@dataclass
class EncryptedRequest:
    """Represents an encrypted API request."""
    
    encrypted_data: str  # Base64 encoded encrypted data
    encrypted_key: str   # Base64 encoded encrypted AES key
    nonce: str           # Unique nonce for replay protection
    timestamp: int       # Unix timestamp
    signature: str       # Request signature
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "encrypted_data": self.encrypted_data,
            "encrypted_key": self.encrypted_key,
            "nonce": self.nonce,
            "timestamp": self.timestamp,
            "signature": self.signature,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EncryptedRequest":
        """Create from dictionary."""
        return cls(
            encrypted_data=data["encrypted_data"],
            encrypted_key=data["encrypted_key"],
            nonce=data["nonce"],
            timestamp=data["timestamp"],
            signature=data["signature"],
        )


@dataclass
class EncryptedResponse:
    """Represents an encrypted API response."""
    
    encrypted_data: str  # Base64 encoded encrypted data
    nonce: str           # Response nonce
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "encrypted_data": self.encrypted_data,
            "nonce": self.nonce,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EncryptedResponse":
        """Create from dictionary."""
        return cls(
            encrypted_data=data["encrypted_data"],
            nonce=data["nonce"],
        )
