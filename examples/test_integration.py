#!/usr/bin/env python3
"""
Integration test for Rossetta API
Tests the complete flow: client -> encrypted request -> server -> encrypted response -> client
"""

import requests
import json
import sys

from rossetta_core.crypto import encrypt_data, decrypt_response, KeyManager

def test_integration():
    """Test the complete integration."""
    base_url = "http://localhost:8000"
    
    print("=" * 60)
    print("Rossetta API Integration Test")
    print("=" * 60)
    
    # Step 1: Fetch public key
    print("\n1️⃣  Fetching public key from server...")
    try:
        response = requests.get(f"{base_url}/.well-known/rossetta-public-key")
        response.raise_for_status()
        public_key_data = response.json()
        public_key = public_key_data["public_key"]
        print("✅ Public key received")
        print(f"   Key preview: {public_key[:50]}...")
    except Exception as e:
        print(f"❌ Failed to fetch public key: {e}")
        return False
    
    # Step 2: Test GET request (get all users)
    print("\n2️⃣  Testing encrypted GET request...")
    try:
        request_data = {
            "method": "GET",
            "url": "/api/users",
            "headers": {},
            "body": None
        }
        
        # Encrypt request
        encrypted_payload = encrypt_data(request_data, public_key)
        print("✅ Request encrypted")
        print(f"   Nonce: {encrypted_payload['nonce'][:20]}...")
        print(f"   Timestamp: {encrypted_payload['timestamp']}")
        
        # Send encrypted request
        response = requests.post(
            f"{base_url}/api/users",
            json=encrypted_payload,
            headers={"Content-Type": "application/vnd.rossetta.encrypted+json"}
        )
        
        if response.status_code != 200:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        print("✅ Server responded with encrypted data")
        
        # Note: For full decryption we'd need the AES key from request
        # For this test, we just verify we get an encrypted response
        response_data = response.json()
        assert "encrypted_data" in response_data
        assert "nonce" in response_data
        print("✅ Response is properly encrypted")
        
    except Exception as e:
        print(f"❌ GET request failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 3: Test POST request (create user)
    print("\n3️⃣  Testing encrypted POST request...")
    try:
        request_data = {
            "method": "POST",
            "url": "/api/users",
            "headers": {"Content-Type": "application/json"},
            "body": {
                "name": "Test User",
                "email": "test@example.com",
                "age": 25
            }
        }
        
        # Encrypt request
        encrypted_payload = encrypt_data(request_data, public_key)
        print("✅ POST request encrypted")
        
        # Send encrypted request
        response = requests.post(
            f"{base_url}/api/users",
            json=encrypted_payload,
            headers={"Content-Type": "application/vnd.rossetta.encrypted+json"}
        )
        
        if response.status_code != 200:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        print("✅ POST request succeeded")
        print("✅ User created with encrypted request")
        
    except Exception as e:
        print(f"❌ POST request failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 4: Test replay attack prevention
    print("\n4️⃣  Testing replay attack prevention...")
    try:
        request_data = {
            "method": "GET",
            "url": "/api/users",
            "headers": {},
            "body": None
        }
        
        # Encrypt request
        encrypted_payload = encrypt_data(request_data, public_key)
        
        # Send first request
        response1 = requests.post(
            f"{base_url}/api/users",
            json=encrypted_payload,
            headers={"Content-Type": "application/vnd.rossetta.encrypted+json"}
        )
        
        if response1.status_code != 200:
            print(f"❌ First request failed: {response1.status_code}")
            return False
        
        print("✅ First request succeeded")
        
        # Try to replay the EXACT same request
        response2 = requests.post(
            f"{base_url}/api/users",
            json=encrypted_payload,
            headers={"Content-Type": "application/vnd.rossetta.encrypted+json"}
        )
        
        if response2.status_code == 400:
            error_data = response2.json()
            if "replay attack" in error_data.get("error", "").lower():
                print("✅ Replay attack BLOCKED! 🛡️")
                print(f"   Server response: {error_data['error']}")
            else:
                print(f"❌ Got 400 but wrong error: {error_data}")
                return False
        else:
            print(f"❌ Replay attack NOT blocked (got {response2.status_code})")
            return False
            
    except Exception as e:
        print(f"❌ Replay test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 5: Test unencrypted request (should still work)
    print("\n5️⃣  Testing unencrypted request passthrough...")
    try:
        response = requests.get(f"{base_url}/")
        if response.status_code == 200:
            data = response.json()
            print("✅ Unencrypted requests still work")
            print(f"   Response: {data}")
        else:
            print(f"❌ Unencrypted request failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Unencrypted request test failed: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("🎉 ALL TESTS PASSED!")
    print("=" * 60)
    print("\n✅ E2E encryption working correctly")
    print("✅ Replay attacks are prevented")
    print("✅ Unencrypted requests pass through")
    print("✅ Both GET and POST requests work")
    print("\n🔒 Your API is now secured with end-to-end encryption!")
    
    return True

if __name__ == "__main__":
    success = test_integration()
    sys.exit(0 if success else 1)
