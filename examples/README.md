# Rosetta API Examples

This directory contains example applications demonstrating the Rosetta API.

## Simple App

A basic example showing how to use Rosetta with FastAPI and a web client.

### Running the Example

1. Install dependencies:
```bash
cd examples/simple-app
pip install -r requirements.txt
```

2. Start the server:
```bash
python server.py
```

3. Open `index.html` in a browser or serve it:
```bash
python -m http.server 3000
```

Then visit http://localhost:3000

## Integration Test

Run the complete integration test:

```bash
pip install -r simple-app/requirements.txt
python integration_test.py
```

This tests:
- Key exchange
- Encrypted requests/responses
- Replay attack prevention
- Unencrypted request passthrough
