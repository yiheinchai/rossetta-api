# Security Policy

## Cryptographic Design

### Encryption Algorithm
- **Key Exchange**: ECDH (Elliptic Curve Diffie-Hellman) with P-256 curve
- **Symmetric Encryption**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: HKDF-SHA256

### Replay Attack Prevention
- **Timestamp Validation**: 5-minute window (configurable)
- **Nonce Tracking**: Unique nonce required for each request
- **Automatic Cleanup**: Old nonces removed after replay window expires

### Security Properties

1. **Forward Secrecy**: Each session uses ephemeral ECDH keys
2. **Authentication**: GCM mode provides authenticated encryption
3. **Confidentiality**: AES-256 protects request/response content
4. **Integrity**: GCM authentication tag prevents tampering
5. **Replay Protection**: Timestamp + nonce prevents request replay

## Threat Model

### Protected Against
- ✅ Man-in-the-middle attacks (ECDH key exchange)
- ✅ Request interception (end-to-end encryption)
- ✅ Request modification (authenticated encryption)
- ✅ Replay attacks (timestamp + nonce validation)
- ✅ API reverse engineering (encrypted payloads)

### Not Protected Against
- ❌ Compromised client or server
- ❌ Malicious code injection
- ❌ DDoS attacks (use rate limiting)
- ❌ Brute force on weak secrets (use strong keys)

## Best Practices

### Secret Key Management
```python
# ❌ BAD - Hardcoded key
app.add_middleware(RosettaMiddleware, secret_key="test-key")

# ✅ GOOD - Environment variable
import os
app.add_middleware(
    RosettaMiddleware, 
    secret_key=os.environ["ROSETTA_SECRET_KEY"]
)
```

### Replay Window Configuration
```python
# Default: 5 minutes (300 seconds)
app.add_middleware(RosettaMiddleware, 
    secret_key=secret_key,
    replay_window=300  # Adjust based on your needs
)
```

Shorter windows provide better security but may cause issues with clock skew.

### HTTPS Requirement
While Rosetta provides end-to-end encryption, **you should still use HTTPS** to:
- Prevent metadata leakage (URLs, headers, timing)
- Protect key exchange from downgrade attacks
- Ensure overall security of your application

## Reporting Security Issues

If you discover a security vulnerability, please email the maintainers directly instead of opening a public issue.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond as quickly as possible and work with you to address the issue.

## Security Considerations for Production

1. **Use Strong Secret Keys**
   - Generate cryptographically random keys
   - Minimum 32 bytes of entropy
   - Rotate keys periodically

2. **Monitor for Anomalies**
   - Track failed decryption attempts
   - Monitor replay attack prevention triggers
   - Alert on unusual patterns

3. **Configure Appropriate Timeouts**
   - Set replay window based on your use case
   - Consider clock skew between clients and servers

4. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Apply patches promptly

5. **Defense in Depth**
   - Use Rosetta alongside other security measures
   - Implement authentication and authorization
   - Use HTTPS/TLS
   - Apply rate limiting
   - Validate input on both client and server

## Cryptographic Library Dependencies

### rosetta-client (JavaScript/TypeScript)
- Web Crypto API (built into browsers and Node.js 15+)
- No external cryptographic dependencies

### rosetta-fastapi (Python)
- `cryptography` >= 41.0.0
- Well-maintained, widely-used cryptographic library
- Regular security updates

## Compliance

This library implements industry-standard cryptographic algorithms:
- ECDH key exchange (NIST P-256 curve)
- AES-256-GCM encryption
- HKDF key derivation

These algorithms are approved for use in many security standards and compliance frameworks.

## License

MIT License - See LICENSE file for details.

Note: While this library provides cryptographic functionality, users are responsible for ensuring compliance with applicable laws and regulations in their jurisdiction.
