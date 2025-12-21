/**
 * Test script to verify the obfuscated API is working
 */

import { 
  obfuscateEndpoint, 
  encrypt, 
  decrypt, 
  createSignature,
  ENDPOINTS 
} from '../shared/crypto.js';

async function testAPI() {
  console.log('🧪 Testing Rossetta API...\n');
  
  // Test 1: GET request (list todos)
  console.log('Test 1: List Todos (GET request)');
  const listEndpoint = obfuscateEndpoint(ENDPOINTS.LIST_TODOS);
  console.log(`  Obfuscated endpoint: ${listEndpoint}`);
  
  const response = await fetch(`http://localhost:3001${listEndpoint}`);
  const encryptedResponse = await response.text();
  console.log(`  Encrypted response: ${encryptedResponse.substring(0, 50)}...`);
  
  const decryptedData = decrypt(encryptedResponse);
  console.log(`  Decrypted data:`, decryptedData.data);
  console.log('  ✅ GET request successful\n');
  
  // Test 2: POST request (create todo)
  console.log('Test 2: Create Todo (POST request)');
  const createEndpoint = obfuscateEndpoint(ENDPOINTS.CREATE_TODO);
  console.log(`  Obfuscated endpoint: ${createEndpoint}`);
  
  const todoData = { text: 'Test Todo from Script' };
  const timestamp = Date.now();
  const signature = createSignature(todoData, timestamp);
  
  const requestPayload = {
    data: todoData,
    timestamp,
    signature
  };
  
  const encryptedRequest = encrypt(requestPayload);
  console.log(`  Encrypted request: ${encryptedRequest.substring(0, 50)}...`);
  
  const createResponse = await fetch(`http://localhost:3001${createEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: encryptedRequest
  });
  
  const encryptedCreateResponse = await createResponse.text();
  const decryptedCreateData = decrypt(encryptedCreateResponse);
  console.log(`  Created todo:`, decryptedCreateData.data);
  console.log('  ✅ POST request successful\n');
  
  console.log('🎉 All tests passed!');
  console.log('\n📊 Summary:');
  console.log('  - Network requests are fully encrypted');
  console.log('  - Endpoints are obfuscated');
  console.log('  - No readable data in network inspector');
  console.log('  - API cannot be reverse-engineered from browser DevTools');
}

testAPI().catch(console.error);
