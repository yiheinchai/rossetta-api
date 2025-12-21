/**
 * Rossetta API Client
 * Handles all obfuscated API calls to the backend
 */

const API_BASE_URL = 'http://localhost:3001';

/**
 * Make an obfuscated API request
 */
async function makeRequest(endpointName, method = 'GET', data = null) {
  try {
    // Get obfuscated endpoint
    const endpoint = await obfuscateEndpoint(endpointName);
    const url = API_BASE_URL + endpoint;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'text/plain'
      }
    };
    
    // Encrypt request body if provided
    if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      const timestamp = Date.now();
      const signature = await createSignature(data, timestamp);
      
      const payload = {
        data,
        timestamp,
        signature
      };
      
      const encryptedPayload = await encrypt(payload);
      options.body = encryptedPayload;
    }
    
    // Make request
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Decrypt response
    const encryptedResponse = await response.text();
    const decryptedResponse = await decrypt(encryptedResponse);
    
    return decryptedResponse.data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * API methods for todo operations
 */
const RossettaAPI = {
  /**
   * Get all todos
   */
  async listTodos() {
    return makeRequest(ENDPOINTS.LIST_TODOS, 'GET');
  },
  
  /**
   * Create a new todo
   */
  async createTodo(text) {
    return makeRequest(ENDPOINTS.CREATE_TODO, 'POST', { text });
  },
  
  /**
   * Update a todo
   */
  async updateTodo(id, text) {
    return makeRequest(ENDPOINTS.UPDATE_TODO, 'PUT', { id, text });
  },
  
  /**
   * Toggle todo completion status
   */
  async toggleTodo(id) {
    return makeRequest(ENDPOINTS.TOGGLE_TODO, 'POST', { id });
  },
  
  /**
   * Delete a todo
   */
  async deleteTodo(id) {
    return makeRequest(ENDPOINTS.DELETE_TODO, 'DELETE', { id });
  }
};
