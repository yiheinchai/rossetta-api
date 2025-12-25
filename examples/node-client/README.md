# Node.js Client Example

This example demonstrates how to use the rosetta-client package in a Node.js application.

## Prerequisites

1. Start the FastAPI server:
```bash
cd ../simple-app
pip install -r requirements.txt
python server.py
```

2. In another terminal, build the client package:
```bash
cd ../../packages/rosetta-client
npm install
npm run build
```

## Running the Example

```bash
cd examples/node-client
node client.js
```

You should see encrypted requests being sent to the server and decrypted responses being received.

## What This Example Shows

- Automatic key exchange with the server
- Encrypted GET requests
- Encrypted POST requests with JSON bodies
- Encrypted path parameters
- All with zero code changes from regular fetch!
