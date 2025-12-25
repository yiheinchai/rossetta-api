# Testing and Usage Guide

## Running the Complete Test Suite

### 1. Python Package Tests

```bash
cd packages/rosetta-fastapi
python -m pytest tests/ -v
```

Expected output: **10 tests passed**

Tests include:
- Cryptographic key generation
- Key export/import
- Shared key derivation (ECDH)
- Encryption/decryption (AES-GCM)
- IV generation
- Key exchange endpoint
- Full encrypted request/response cycle
- Replay attack prevention
- Timestamp validation
- Unencrypted request passthrough

### 2. Integration Tests

```bash
python examples/integration_test.py
```

This tests:
- Complete client-server key exchange
- Encrypted request/response handling
- Replay attack detection
- Unencrypted request compatibility

### 3. Manual Testing with Python Client

Terminal 1 (Server):
```bash
cd examples/simple-app
pip install -r requirements.txt
python server.py
```

Terminal 2 (Client):
```bash
cd examples/python-client
python client.py
```

Expected output:
- ✓ Key exchange successful
- ✓ All encrypted requests complete successfully
- ✓ Responses correctly decrypted

## Demonstrating Security Features

### 1. Replay Attack Prevention

Try this:
1. Start the server: `cd examples/simple-app && python server.py`
2. Run the Python client once: `cd examples/python-client && python client.py`
3. Open DevTools Network tab (if using browser)
4. Copy any encrypted request
5. Try to replay it with curl or Postman

**Result**: The replayed request will fail with 401 Unauthorized because the nonce has already been used.

Example:
```bash
# This will fail on second attempt
curl -X POST http://localhost:8000/api/data \
  -H "X-Rosetta-Encrypted: true" \
  -H "Content-Type: application/json" \
  -d '{"encryptedPayload":"...","iv":"..."}'
```

### 2. Encrypted Payloads

Inspect network traffic while running the Python client:
- All request bodies are encrypted (base64-encoded ciphertext)
- All response bodies are encrypted
- No plaintext data visible
- Metadata (URLs, methods) still visible (use HTTPS in production)

### 3. Timestamp Validation

The middleware rejects requests with timestamps outside the 5-minute window:
```python
# This would be rejected
old_timestamp = int((time.time() - 400) * 1000)  # 6+ minutes ago
```

## Performance Testing

### Simple Benchmark

```python
import time
from examples.python_client.client import RosettaClient

client = RosettaClient("http://localhost:8000")

# Warm up
client.fetch("/api/data")

# Benchmark
start = time.time()
for _ in range(100):
    client.fetch("/api/data")
end = time.time()

print(f"100 requests in {end-start:.2f}s")
print(f"Average: {(end-start)/100*1000:.2f}ms per request")
```

Expected performance:
- Key exchange: ~10-50ms (one-time per session)
- Encrypted request: ~5-20ms overhead vs plain request
- Most overhead from cryptographic operations

## Production Checklist

Before deploying to production:

- [ ] **Security**
  - [ ] Use strong, randomly generated secret keys
  - [ ] Store secret keys in environment variables or secret management
  - [ ] Use HTTPS/TLS for all communications
  - [ ] Configure appropriate replay window for your use case
  - [ ] Implement rate limiting
  - [ ] Add monitoring for failed decryption attempts

- [ ] **Performance**
  - [ ] Benchmark with expected load
  - [ ] Consider key caching strategies
  - [ ] Monitor memory usage (nonce tracking)
  - [ ] Set up automatic nonce cleanup

- [ ] **Reliability**
  - [ ] Handle clock skew between clients and servers
  - [ ] Implement graceful degradation
  - [ ] Add health check endpoints
  - [ ] Set up logging and monitoring

- [ ] **Documentation**
  - [ ] Document API endpoints for your team
  - [ ] Provide client integration examples
  - [ ] Create troubleshooting guide
  - [ ] Document key rotation procedures

## Troubleshooting

### "InvalidTag" Error
- **Cause**: Decryption failed, usually due to mismatched keys
- **Fix**: Ensure client and server performed successful key exchange
- **Debug**: Check that shared keys are derived correctly

### "Invalid or replayed request" (401)
- **Cause**: Nonce reused or timestamp outside window
- **Fix**: Don't retry requests with same nonce
- **Note**: This is expected behavior for security

### Timestamp validation failures
- **Cause**: Clock skew between client and server
- **Fix**: Synchronize system clocks (NTP)
- **Workaround**: Increase `replay_window` parameter

### Key exchange fails
- **Cause**: Network issues or malformed public keys
- **Fix**: Check network connectivity and logs
- **Debug**: Verify public key format (base64-encoded DER)

## Example Outputs

### Successful Request
```
🚀 Rosetta Python Client Example

📝 Test 1: GET /api/data
✓ Key exchange successful
✓ Response: {'message': 'This response is encrypted', 'data': [1, 2, 3, 4, 5]}
```

### Replay Attack Blocked
```
📝 Test: Replay Attack
✓ First request: 200 OK
✗ Replayed request: 401 Unauthorized
  Error: Invalid or replayed request
```

### All Tests Passing
```
================================================= test session starts ==================================================
tests/test_crypto.py::test_key_generation PASSED                                                                 [ 10%]
tests/test_crypto.py::test_public_key_export PASSED                                                              [ 20%]
tests/test_crypto.py::test_shared_key_derivation PASSED                                                          [ 30%]
tests/test_crypto.py::test_encryption_decryption PASSED                                                          [ 40%]
tests/test_crypto.py::test_iv_generation PASSED                                                                  [ 50%]
tests/test_middleware.py::test_key_exchange PASSED                                                               [ 60%]
tests/test_middleware.py::test_encrypted_request_response PASSED                                                 [ 70%]
tests/test_middleware.py::test_replay_attack_prevention PASSED                                                   [ 80%]
tests/test_middleware.py::test_timestamp_validation PASSED                                                       [ 90%]
tests/test_middleware.py::test_unencrypted_request_passthrough PASSED                                            [100%]

================================================== 10 passed in 0.42s ==================================================
```

## Next Steps

1. **Try the examples**: Run the Python client against the server
2. **Read the security docs**: See SECURITY.md for best practices
3. **Customize for your needs**: Adjust replay window, add auth, etc.
4. **Deploy with confidence**: Use the production checklist above
5. **Contribute**: See CONTRIBUTING.md to help improve Rosetta API

## Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: See README.md and package-specific READMEs
- **Security**: See SECURITY.md for security-related questions
