# Publishing Guide for Rossetta API Packages

This guide explains how to publish the Rossetta API packages to NPM and PyPI.

## Prerequisites

### For NPM Packages (@rossetta-api/express, @rossetta-api/client)

1. **NPM Account**: Create account at https://www.npmjs.com/signup
2. **Login to NPM**:
   ```bash
   npm login
   ```
3. **Verify login**:
   ```bash
   npm whoami
   ```

### For PyPI Package (rossetta-fastapi)

1. **PyPI Account**: Create account at https://pypi.org/account/register/
2. **Install twine**:
   ```bash
   pip install twine build
   ```
3. **Create API token** at https://pypi.org/manage/account/token/

## Publishing Steps

### Publish NPM Packages

#### 1. Publish @rossetta-api/express

```bash
cd packages/rossetta-express
npm publish --access public
```

#### 2. Publish @rossetta-api/client

```bash
cd packages/rossetta-client
npm publish --access public
```

**Note**: Use `--access public` for scoped packages (@rossetta-api/...) to make them publicly available.

### Publish PyPI Packages

#### rossetta-fastapi

**1. Build the package**

```bash
cd packages/rossetta-fastapi
python3 -m build
```

This creates:
- `dist/rossetta-fastapi-0.1.0.tar.gz` (source distribution)
- `dist/rossetta_fastapi-0.1.0-py3-none-any.whl` (wheel)

**2. Upload to PyPI**

```bash
python3 -m twine upload dist/*
```

Enter your PyPI username and API token when prompted.

#### rossetta-flask

**1. Build the package**

```bash
cd packages/rossetta-flask
python3 -m build
```

This creates:
- `dist/rossetta-flask-0.1.0.tar.gz` (source distribution)
- `dist/rossetta_flask-0.1.0-py3-none-any.whl` (wheel)

**2. Upload to PyPI**

```bash
python3 -m twine upload dist/*
```

Enter your PyPI username and API token when prompted.

## Verification

### Verify NPM Packages

```bash
# Search for the package
npm search @rossetta-api/express

# View package info
npm view @rossetta-api/express

# Install and test
mkdir test-install
cd test-install
npm init -y
npm install @rossetta-api/express
```

### Verify PyPI Packages

**rossetta-fastapi:**

```bash
# View package info
pip show rossetta-fastapi

# Install and test
pip install rossetta-fastapi
```

**rossetta-flask:**

```bash
# View package info
pip show rossetta-flask

# Install and test
pip install rossetta-flask
```

## Post-Publishing

### 1. Tag the Release

```bash
git tag -a v0.1.0 -m "Release version 0.1.0"
git push origin v0.1.0
```

### 2. Create GitHub Release

1. Go to https://github.com/yiheinchai/rossetta-api/releases
2. Click "Create a new release"
3. Choose tag `v0.1.0`
4. Add release notes
5. Publish release

### 3. Update README

Add installation instructions to main README:

```markdown
## Installation

### NPM Packages

\`\`\`bash
npm install @rossetta-api/express
npm install @rossetta-api/client
\`\`\`

### PyPI Packages

\`\`\`bash
pip install rossetta-fastapi
pip install rossetta-flask
\`\`\`
```

## Troubleshooting

### NPM: "You do not have permission to publish"

- Make sure you're logged in: `npm whoami`
- For scoped packages, use: `npm publish --access public`
- Verify package name is available: `npm view @rossetta-api/express`

### PyPI: "403 Forbidden"

- Verify API token is correct
- Check package name is available: `pip search rossetta-fastapi`
- Ensure you have permissions for the package

### "Package name already exists"

If the package name is taken, choose a different name:
- `@rossetta-api/express-middleware`
- `rossetta-api-fastapi`
- Add your username: `@yourusername/rossetta-express`

## Version Updates

For future releases:

1. Update version in `package.json` (NPM) or `setup.py` (PyPI)
2. Follow semantic versioning: MAJOR.MINOR.PATCH
3. Update CHANGELOG.md
4. Rebuild and republish

## Security

- **Never commit credentials** to version control
- Use `.npmrc` for NPM tokens (add to `.gitignore`)
- Use `~/.pypirc` for PyPI credentials (not in repo)
- Enable 2FA on both NPM and PyPI accounts

## Support

For issues with publishing:
- NPM: https://docs.npmjs.com/cli/v9/commands/npm-publish
- PyPI: https://packaging.python.org/tutorials/packaging-projects/
