# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-25

### Added
- Initial release of Rosetta API
- rosetta-client NPM package with encrypted fetch wrapper
- rosetta-fastapi PyPI package with FastAPI middleware
- End-to-end encryption using ECDH + AES-256-GCM
- Replay attack prevention with timestamp and nonce validation
- Comprehensive test suite (10 tests, all passing)
- Integration tests demonstrating full client-server communication
- Example applications and documentation
- Support for:
  - Automatic key exchange
  - Request/response encryption
  - Multiple HTTP methods (GET, POST, etc.)
  - Path parameters and query strings
  - JSON request/response bodies
  - Custom headers

### Security
- ECDH P-256 for key exchange
- AES-256-GCM for symmetric encryption
- Timestamp validation (5-minute window)
- Nonce tracking to prevent replay attacks
- Automatic session management

### Documentation
- README with usage examples
- API documentation for both packages
- Integration test examples
- Publishing guide

## [Unreleased]

### Planned
- Additional backend framework support (Express, Django, etc.)
- Browser extension for debugging encrypted requests
- Performance optimizations
- Additional language bindings
