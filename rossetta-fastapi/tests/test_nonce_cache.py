"""Tests for nonce cache."""

import time
from rossetta_fastapi.nonce_cache import NonceCache


def test_nonce_cache_add_new():
    """Test adding new nonce."""
    cache = NonceCache()
    
    result = cache.add("nonce1")
    assert result is True


def test_nonce_cache_add_duplicate():
    """Test adding duplicate nonce."""
    cache = NonceCache()
    
    cache.add("nonce1")
    result = cache.add("nonce1")
    
    assert result is False


def test_nonce_cache_max_size():
    """Test that cache respects max size."""
    cache = NonceCache(max_size=3)
    
    cache.add("nonce1")
    cache.add("nonce2")
    cache.add("nonce3")
    cache.add("nonce4")  # Should evict nonce1
    
    # nonce1 should be evicted, so adding it again should succeed
    result = cache.add("nonce1")
    assert result is True
    
    # After adding nonce1, cache has: nonce2, nonce3, nonce4, nonce1 (nonce2 evicted)
    # So nonce2 should be addable again
    result = cache.add("nonce2")
    assert result is True


def test_nonce_cache_ttl():
    """Test that nonces expire after TTL."""
    cache = NonceCache(ttl=1)  # 1 second TTL
    
    cache.add("nonce1")
    
    # Should still be there
    result = cache.add("nonce1")
    assert result is False
    
    # Wait for expiration
    time.sleep(1.1)
    
    # Add another nonce to trigger cleanup
    cache.add("nonce2")
    
    # nonce1 should be expired now
    result = cache.add("nonce1")
    assert result is True


def test_nonce_cache_clear():
    """Test clearing cache."""
    cache = NonceCache()
    
    cache.add("nonce1")
    cache.add("nonce2")
    
    cache.clear()
    
    # Both should be addable again
    assert cache.add("nonce1") is True
    assert cache.add("nonce2") is True
