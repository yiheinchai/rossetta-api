#!/bin/bash

# Rossetta API - Development Setup Script

set -e

echo "🔒 Setting up Rossetta API Development Environment"
echo "=================================================="

# Function to print status
print_status() {
    echo ""
    echo "📦 $1"
    echo "---"
}

# 1. Setup rossetta-client
print_status "Setting up rossetta-client (JavaScript/TypeScript)"
cd packages/rossetta-client
npm install
npm run build
echo "✓ Client package built successfully"

# 2. Setup rossetta-fastapi  
print_status "Setting up rossetta-fastapi (Python)"
cd ../rossetta-fastapi
pip install --user -e .
echo "✓ FastAPI package installed in development mode"

# 3. Setup example backend
print_status "Setting up example backend"
cd ../../examples/fastapi-backend
pip install --user -r requirements.txt
echo "✓ Backend dependencies installed"

# 4. Run tests
print_status "Running tests"
cd ..
echo "Running Python tests..."
cd ../packages/rossetta-fastapi
python -m pytest tests/ -v || true
cd ../../examples

echo ""
echo "=================================================="
echo "✅ Setup complete!"
echo ""
echo "To test the system:"
echo "  1. Start backend: cd examples/fastapi-backend && python main.py"
echo "  2. Run tests: cd examples && node test_e2e.js"
echo "  3. Test replay attack: cd examples && node test_replay.js"
echo ""
echo "For browser demo:"
echo "  1. Start backend (as above)"
echo "  2. Serve demo: cd examples/client-demo && python -m http.server 3000"
echo "  3. Open http://localhost:3000 in browser"
echo "=================================================="
