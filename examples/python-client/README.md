# Python Client Example

Demonstrates using Rosetta API from a Python client.

## Running the Example

1. Start the FastAPI server:
```bash
cd ../simple-app
pip install -r requirements.txt
python server.py
```

2. In another terminal, run the client:
```bash
cd examples/python-client
python client.py
```

## What This Shows

- ECDH key exchange with the server
- Encrypted GET requests  
- Encrypted POST requests with JSON bodies
- Encrypted responses
- Replay attack prevention

This example uses the same cryptographic library as the server for demonstration purposes.
