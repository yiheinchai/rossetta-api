"""Tests for rossetta_core.models module."""

from rossetta_core.models import EncryptedRequest, EncryptedResponse


def test_encrypted_request_to_dict():
    """Test EncryptedRequest to_dict method."""
    req = EncryptedRequest(
        encrypted_data="abc123",
        encrypted_key="key123",
        nonce="nonce123",
        timestamp=1234567890,
        signature="sig123"
    )
    
    result = req.to_dict()
    
    assert result == {
        "encrypted_data": "abc123",
        "encrypted_key": "key123",
        "nonce": "nonce123",
        "timestamp": 1234567890,
        "signature": "sig123",
    }


def test_encrypted_request_from_dict():
    """Test EncryptedRequest from_dict method."""
    data = {
        "encrypted_data": "abc123",
        "encrypted_key": "key123",
        "nonce": "nonce123",
        "timestamp": 1234567890,
        "signature": "sig123",
    }
    
    req = EncryptedRequest.from_dict(data)
    
    assert req.encrypted_data == "abc123"
    assert req.encrypted_key == "key123"
    assert req.nonce == "nonce123"
    assert req.timestamp == 1234567890
    assert req.signature == "sig123"


def test_encrypted_response_to_dict():
    """Test EncryptedResponse to_dict method."""
    resp = EncryptedResponse(
        encrypted_data="data123",
        nonce="nonce456"
    )
    
    result = resp.to_dict()
    
    assert result == {
        "encrypted_data": "data123",
        "nonce": "nonce456",
    }


def test_encrypted_response_from_dict():
    """Test EncryptedResponse from_dict method."""
    data = {
        "encrypted_data": "data123",
        "nonce": "nonce456",
    }
    
    resp = EncryptedResponse.from_dict(data)
    
    assert resp.encrypted_data == "data123"
    assert resp.nonce == "nonce456"
