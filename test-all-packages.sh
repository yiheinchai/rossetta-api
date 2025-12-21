#!/bin/bash
# Test runner for all Rossetta packages

echo "🧪 Running tests for all Rossetta packages..."
echo ""

# Track results
FAILED=0
PASSED=0

# Test NextJS package
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Testing @rossetta-api/nextjs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd packages/rossetta-nextjs
if node test.js; then
  echo "✅ NextJS tests passed"
  ((PASSED++))
else
  echo "❌ NextJS tests failed"
  ((FAILED++))
fi
cd ../..
echo ""

# Test Django package
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Testing rossetta-django"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd packages/rossetta-django
if python3 test.py; then
  echo "✅ Django tests passed"
  ((PASSED++))
else
  echo "❌ Django tests failed"
  ((FAILED++))
fi
cd ../..
echo ""

# Syntax check for React package
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Checking @rossetta-api/react syntax"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if node --check packages/rossetta-react/index.js; then
  echo "✅ React package syntax valid"
  ((PASSED++))
else
  echo "❌ React package syntax invalid"
  ((FAILED++))
fi
echo ""

# Syntax check for Tanstack Router package
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Checking @rossetta-api/tanstack-router syntax"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if node --check packages/rossetta-tanstack-router/index.js; then
  echo "✅ Tanstack Router package syntax valid"
  ((PASSED++))
else
  echo "❌ Tanstack Router package syntax invalid"
  ((FAILED++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ All tests passed! Packages are ready for production."
  exit 0
else
  echo "❌ Some tests failed. Please fix the issues before deploying."
  exit 1
fi
