/**
 * Node.js test script for rossetta-client
 * Tests end-to-end encryption with the FastAPI backend
 */

// Import built rossetta-client
const rossettaFetch = require('../packages/rossetta-client/dist/index.js').default;

const BASE_URL = 'http://localhost:8000';

async function testGetRequest() {
  console.log('\n=== Testing GET Request ===');
  try {
    const response = await rossettaFetch(`${BASE_URL}/api/hello`);
    const data = await response.json();
    console.log('✓ GET /api/hello successful');
    console.log('Response:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('✗ GET request failed:', error.message);
    return false;
  }
}

async function testGetWithData() {
  console.log('\n=== Testing GET Request with Data ===');
  try {
    const response = await rossettaFetch(`${BASE_URL}/api/data`);
    const data = await response.json();
    console.log('✓ GET /api/data successful');
    console.log('Response:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('✗ GET with data failed:', error.message);
    return false;
  }
}

async function testPostRequest() {
  console.log('\n=== Testing POST Request ===');
  try {
    const response = await rossettaFetch(`${BASE_URL}/api/echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Hello, encrypted world!' })
    });
    const data = await response.json();
    console.log('✓ POST /api/echo successful');
    console.log('Response:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('✗ POST request failed:', error.message);
    return false;
  }
}

async function testPostSubmit() {
  console.log('\n=== Testing POST Submit ===');
  try {
    const response = await rossettaFetch(`${BASE_URL}/api/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 42,
        name: 'Test Item',
        value: 'Secret Value'
      })
    });
    const data = await response.json();
    console.log('✓ POST /api/submit successful');
    console.log('Response:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('✗ POST submit failed:', error.message);
    return false;
  }
}

async function testGetWithPathParam() {
  console.log('\n=== Testing GET with Path Parameter ===');
  try {
    const response = await rossettaFetch(`${BASE_URL}/api/user/123`);
    const data = await response.json();
    console.log('✓ GET /api/user/123 successful');
    console.log('Response:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('✗ GET with path param failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🔒 Rossetta API End-to-End Encryption Test');
  console.log('=' .repeat(50));
  
  const results = [];
  
  results.push(await testGetRequest());
  results.push(await testGetWithData());
  results.push(await testPostRequest());
  results.push(await testPostSubmit());
  results.push(await testGetWithPathParam());
  
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    console.log(`✓ All ${total} tests passed!`);
    process.exit(0);
  } else {
    console.log(`✗ ${total - passed} out of ${total} tests failed`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
