"""
Test script to verify rossetta-client and rossetta-fastapi integration
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_plain_api():
    """Test that plain API calls still work (non-encrypted endpoints)"""
    print("\n=== Testing Plain API (should work) ===")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200

def test_handshake():
    """Test the handshake endpoint"""
    print("\n=== Testing Handshake Endpoint ===")
    
    # Generate a simple public key (for testing, we'll use a placeholder)
    # In real implementation, this would be an actual ECDH public key
    test_key = "test_public_key_placeholder"
    
    response = requests.post(
        f"{BASE_URL}/__rossetta_handshake__",
        json={"client_public_key": test_key}
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Handshake successful!")
        data = response.json()
        print(f"Server public key received: {data.get('server_public_key', 'N/A')[:50]}...")
    else:
        print(f"Error: {response.text}")

def test_encrypted_request():
    """Test sending an encrypted request"""
    print("\n=== Testing Encrypted Request (without proper client) ===")
    
    # Try to send a request marked as encrypted but without proper encryption
    response = requests.post(
        f"{BASE_URL}/api/hello",
        headers={"X-Rossetta-Encrypted": "true"},
        json={"ciphertext": "fake", "iv": "fake"}
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # This should fail because we need a valid session
    assert response.status_code == 401 or response.status_code == 400

if __name__ == "__main__":
    print("Testing Rossetta API Backend")
    print("=" * 50)
    
    try:
        test_plain_api()
        test_handshake()
        test_encrypted_request()
        
        print("\n" + "=" * 50)
        print("✓ All basic tests passed!")
        print("\nNote: Full end-to-end encryption test requires")
        print("running the client demo in a browser.")
        
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
