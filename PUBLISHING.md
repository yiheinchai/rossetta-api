# Publishing Guide

## Publishing to npm (rossetta-client)

### Prerequisites
- npm account with publishing rights
- Verified email on npm

### Steps

1. **Build the package**
   ```bash
   cd packages/rossetta-client
   npm run build
   ```

2. **Test the package locally**
   ```bash
   npm pack
   # This creates rossetta-client-1.0.0.tgz
   # Test by installing in another project: npm install ./rossetta-client-1.0.0.tgz
   ```

3. **Login to npm**
   ```bash
   npm login
   ```

4. **Publish**
   ```bash
   npm publish --access public
   ```

### Updating the package

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Build and publish:
   ```bash
   npm run build
   npm publish
   ```

## Publishing to PyPI (rossetta-fastapi)

### Prerequisites
- PyPI account
- `twine` installed: `pip install twine build`

### Steps

1. **Build the package**
   ```bash
   cd packages/rossetta-fastapi
   python -m build
   ```

2. **Check the distribution**
   ```bash
   twine check dist/*
   ```

3. **Test upload to TestPyPI (optional)**
   ```bash
   twine upload --repository testpypi dist/*
   ```

4. **Upload to PyPI**
   ```bash
   twine upload dist/*
   ```

### Updating the package

1. Update version in `pyproject.toml`
2. Update `CHANGELOG.md`
3. Clean old dist, build and publish:
   ```bash
   rm -rf dist/
   python -m build
   twine upload dist/*
   ```

## Pre-publish Checklist

- [ ] All tests passing
- [ ] Documentation up to date
- [ ] README files complete
- [ ] CHANGELOG updated
- [ ] Version numbers incremented
- [ ] LICENSE files included
- [ ] .gitignore properly configured
- [ ] No sensitive data in code
- [ ] Examples tested and working

## Post-publish Tasks

- [ ] Create git tag for release
- [ ] Push tag to repository
- [ ] Create GitHub release with notes
- [ ] Update documentation website (if any)
- [ ] Announce on social media/forums
