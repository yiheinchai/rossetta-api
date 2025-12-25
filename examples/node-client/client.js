/**
 * Node.js client example for Rosetta API
 * Demonstrates how to use the rosetta-client package
 */

// Import the encrypted fetch from rosetta-client
// In a real app: import { fetch } from 'rosetta-client';
// For this example, we'll use the built version
const { fetch } = require('../../packages/rosetta-client/lib/index.js');

async function main() {
    console.log('🚀 Rosetta Client Node.js Example\n');
    
    const baseUrl = 'http://localhost:8000';
    
    try {
        // Test 1: Simple GET request
        console.log('📝 Test 1: GET /api/data');
        const response1 = await fetch(`${baseUrl}/api/data`);
        const data1 = await response1.json();
        console.log('✓ Response:', data1);
        console.log('');
        
        // Test 2: POST request with data
        console.log('📝 Test 2: POST /api/echo');
        const response2 = await fetch(`${baseUrl}/api/echo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Hello from Node.js!',
                timestamp: new Date().toISOString()
            })
        });
        const data2 = await response2.json();
        console.log('✓ Response:', data2);
        console.log('');
        
        // Test 3: GET with path parameter
        console.log('📝 Test 3: GET /api/user/42');
        const response3 = await fetch(`${baseUrl}/api/user/42`);
        const data3 = await response3.json();
        console.log('✓ Response:', data3);
        console.log('');
        
        console.log('✅ All requests completed successfully!');
        console.log('💡 All requests and responses were encrypted end-to-end');
        console.log('🔒 Check the network traffic - you\'ll see only encrypted payloads!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the example
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
