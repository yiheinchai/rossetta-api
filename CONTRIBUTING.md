# Contributing to Rosetta API

Thank you for your interest in contributing to Rosetta API!

## Development Setup

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- pip

### Initial Setup

1. Clone the repository:
```bash
git clone https://github.com/yiheinchai/rossetta-api.git
cd rossetta-api
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install client dependencies
cd packages/rosetta-client
npm install
cd ../..

# Install server dependencies
cd packages/rosetta-fastapi
pip install -e ".[dev]"
cd ../..
```

## Running Tests

### Client Package
```bash
cd packages/rosetta-client
npm test
npm run build
```

### Server Package
```bash
cd packages/rosetta-fastapi
pytest tests/ -v
```

### Integration Tests
```bash
python examples/integration_test.py
```

## Code Style

### TypeScript/JavaScript
- Use TypeScript for type safety
- Follow existing code style
- Run `npm run build` to check for errors

### Python
- Follow PEP 8 style guide
- Use type hints where possible
- Run tests before submitting PR

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Pull Request Guidelines

- Include tests for new features
- Update documentation as needed
- Ensure all tests pass
- Follow the existing code style
- Write clear commit messages

## Reporting Issues

- Use the GitHub issue tracker
- Include steps to reproduce
- Provide error messages and logs
- Specify versions of packages used

## Questions?

Feel free to open an issue for questions or discussions.

Thank you for contributing!
