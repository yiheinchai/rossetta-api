# Publishing Guide

## Publishing rosetta-client to NPM

### Prerequisites
- NPM account
- Write access to the package name

### Steps

1. Update version in `package.json` if needed

2. Build the package:
```bash
cd packages/rosetta-client
npm install
npm run build
```

3. Test the package locally:
```bash
npm pack
# This creates a .tgz file you can test install in another project
```

4. Publish to NPM:
```bash
npm login
npm publish
```

### Package Contents
- `lib/` - Compiled JavaScript and TypeScript definitions
- `src/` - Source TypeScript files
- `package.json` - Package metadata
- `README.md` - Documentation

---

## Publishing rosetta-fastapi to PyPI

### Prerequisites
- PyPI account
- `twine` installed (`pip install twine build`)

### Steps

1. Update version in `pyproject.toml` if needed

2. Build the package:
```bash
cd packages/rosetta-fastapi
python -m build
```

This creates:
- `dist/*.whl` - Wheel distribution
- `dist/*.tar.gz` - Source distribution

3. Check the package:
```bash
twine check dist/*
```

4. Test upload to Test PyPI (optional but recommended):
```bash
twine upload --repository testpypi dist/*
```

5. Upload to PyPI:
```bash
twine upload dist/*
```

### Package Contents
- `rosetta_fastapi/` - Python package code
  - `__init__.py` - Package initialization
  - `middleware.py` - FastAPI middleware
  - `crypto.py` - Cryptographic utilities
- `tests/` - Test suite
- `pyproject.toml` - Package metadata
- `README.md` - Documentation

---

## Version Management

Both packages should maintain synchronized major versions for compatibility.

### Semant Versioning
- Major version (1.x.x): Breaking changes
- Minor version (x.1.x): New features, backwards compatible
- Patch version (x.x.1): Bug fixes

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version numbers bumped
- [ ] Git tag created
- [ ] Published to package registry
- [ ] Release notes published

---

## Testing Before Publishing

### rosetta-client
```bash
cd packages/rosetta-client
npm test
npm run build
```

### rosetta-fastapi
```bash
cd packages/rosetta-fastapi
pytest tests/
```

### Integration Test
```bash
python examples/integration_test.py
```

All tests should pass before publishing.
