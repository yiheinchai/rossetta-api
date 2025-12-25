"""Nonce cache for replay attack prevention."""

import time
from collections import OrderedDict
from threading import Lock


class NonceCache:
    """Thread-safe LRU cache for tracking used nonces."""
    
    def __init__(self, max_size: int = 10000, ttl: int = 600):
        """Initialize nonce cache.
        
        Args:
            max_size: Maximum number of nonces to track.
            ttl: Time-to-live for nonces in seconds (default: 10 minutes).
        """
        self.max_size = max_size
        self.ttl = ttl
        self.cache = OrderedDict()
        self.lock = Lock()
    
    def add(self, nonce: str) -> bool:
        """Add a nonce to the cache.
        
        Args:
            nonce: The nonce to add.
            
        Returns:
            True if nonce was added (first time seen), False if already exists.
        """
        with self.lock:
            # Clean expired nonces
            self._clean_expired()
            
            # Check if nonce already exists
            if nonce in self.cache:
                return False
            
            # Add nonce with current timestamp
            self.cache[nonce] = time.time()
            
            # Remove oldest if over max size
            if len(self.cache) > self.max_size:
                self.cache.popitem(last=False)
            
            return True
    
    def _clean_expired(self):
        """Remove expired nonces from cache."""
        current_time = time.time()
        expired = []
        
        for nonce, timestamp in self.cache.items():
            if current_time - timestamp > self.ttl:
                expired.append(nonce)
            else:
                # OrderedDict is sorted by insertion time
                # If this nonce is not expired, later ones won't be either
                break
        
        for nonce in expired:
            del self.cache[nonce]
    
    def clear(self):
        """Clear all nonces from cache."""
        with self.lock:
            self.cache.clear()
