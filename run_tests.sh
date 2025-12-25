#!/bin/bash

# Comprehensive test suite for Rossetta API

echo "🧪 Rossetta API - Comprehensive Test Suite"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testing: $test_name ... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Check if server is running
if ! curl -s http://localhost:8000/ > /dev/null; then
    echo -e "${YELLOW}⚠ Warning: Backend server not running${NC}"
    echo "Please start the backend first:"
    echo "  cd examples/fastapi-backend && python main.py"
    echo ""
    exit 1
fi

echo "Backend server: ✓ Running"
echo ""

# Python tests
echo "Python Unit Tests:"
echo "-----------------"
cd packages/rossetta-fastapi
python -m pytest tests/ -v --tb=short
PYTEST_EXIT=$?
cd ../../examples

if [ $PYTEST_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ All Python tests passed${NC}"
    ((TESTS_PASSED+=9))
else
    echo -e "${RED}✗ Some Python tests failed${NC}"
    ((TESTS_FAILED+=1))
fi

echo ""
echo "Integration Tests:"
echo "-----------------"

# End-to-end tests
run_test "E2E GET Request" "node test_e2e.js 2>&1 | grep -q 'All 5 tests passed'"

# Replay attack test
run_test "Replay Attack Prevention" "node test_replay.js 2>&1 | grep -q 'SUCCESS'"

# Test plain API still works
run_test "Non-encrypted Endpoint" "curl -s http://localhost:8000/ | grep -q 'Welcome'"

# Test handshake endpoint exists
run_test "Handshake Endpoint" "curl -s -X POST http://localhost:8000/__rossetta_handshake__ -H 'Content-Type: application/json' -d '{\"client_public_key\":\"test\"}' | grep -q 'error'"

echo ""
echo "==========================================="
echo "Test Summary:"
echo "  Total Passed: $TESTS_PASSED"
echo "  Total Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
