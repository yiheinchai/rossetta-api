/**
 * Test replay attack prevention
 */

const rossettaFetch = require('../packages/rossetta-client/dist/index.js').default;
const BASE_URL = 'http://localhost:8000';

async function captureRequest() {
  console.log('\n=== Capturing Encrypted Request ===');
  
  let capturedRequest = null;
  const originalFetch = global.fetch;
  
  // Intercept fetch to capture the encrypted request
  global.fetch = async function(url, options) {
    const result = await originalFetch(url, options);
    
    // Capture encrypted requests (not handshake)
    if (options && options.headers && options.headers['X-Rossetta-Encrypted'] === 'true') {
      capturedRequest = {
        url: url,
        options: JSON.parse(JSON.stringify(options))
      };
      console.log('✓ Captured encrypted request');
    }
    
    return result;
  };
  
  // Make a request
  try {
    const response = await rossettaFetch(`${BASE_URL}/api/hello`);
    const data = await response.json();
    console.log('✓ Initial request successful:', data);
  } catch (error) {
    console.error('✗ Initial request failed:', error.message);
  }
  
  // Restore fetch
  global.fetch = originalFetch;
  
  return capturedRequest;
}

async function testReplayAttack() {
  console.log('\n🔒 Testing Replay Attack Prevention');
  console.log('=' .repeat(50));
  
  // Step 1: Capture a request
  const captured = await captureRequest();
  
  if (!captured) {
    console.error('✗ Failed to capture request');
    process.exit(1);
  }
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 2: Try to replay the exact same request
  console.log('\n=== Replaying Captured Request ===');
  try {
    const response = await fetch(captured.url, captured.options);
    const data = await response.json();
    
    if (data.error && data.error.includes('nonce')) {
      console.log('✓ Replay attack prevented!');
      console.log(`  Error: ${data.error}`);
      console.log('\n✅ SUCCESS: Nonce validation blocked the replay attack!');
      process.exit(0);
    } else {
      console.error('✗ Replay attack succeeded (should have failed!)');
      console.error('  Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Replay test error:', error.message);
    process.exit(1);
  }
}

// Run test
testReplayAttack();
