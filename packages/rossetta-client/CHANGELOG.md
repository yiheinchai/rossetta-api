# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-25

### Added
- Initial release of rossetta-client
- Drop-in replacement for native fetch API
- Automatic end-to-end encryption with AES-256-GCM
- ECDH key exchange for secure session establishment
- Built-in replay attack prevention with nonce validation
- Timestamp validation to prevent old request replay
- Session management with automatic key lifecycle
- TypeScript support with full type definitions
- Works in both browser and Node.js environments

### Security
- AES-256-GCM encryption for all request/response payloads
- ECDH P-256 key exchange
- HKDF key derivation
- Nonce-based replay attack prevention
- Timestamp validation (default 5-minute window)
