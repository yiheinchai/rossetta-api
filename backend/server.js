/**
 * Rossetta API Backend Server
 * Provides obfuscated API endpoints for todo list operations
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { 
  obfuscateEndpoint, 
  encrypt, 
  decrypt, 
  verifySignature, 
  isTimestampValid,
  ENDPOINTS 
} from '../shared/crypto.js';

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory storage for todos (in production, use a database)
let todos = [
  { id: '1', text: 'Learn about Rossetta API', completed: false, createdAt: Date.now() },
  { id: '2', text: 'Build secure APIs', completed: false, createdAt: Date.now() }
];

// Middleware
// Note: In production, configure CORS with specific allowed origins
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*'
}));
app.use(express.json());
app.use(express.text());

/**
 * Middleware to decrypt and verify incoming requests
 */
function decryptMiddleware(req, res, next) {
  try {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      // Extract encrypted payload
      const encryptedPayload = req.body;
      
      if (!encryptedPayload) {
        const encryptedError = encryptResponse({ error: 'No payload provided' });
        res.status(400);
        res.setHeader('Content-Type', 'text/plain');
        res.send(encryptedError);
        return;
      }

      // Decrypt the payload
      const decryptedPayload = decrypt(encryptedPayload);
      
      // Verify timestamp to prevent replay attacks
      if (!isTimestampValid(decryptedPayload.timestamp)) {
        const encryptedError = encryptResponse({ error: 'Request expired' });
        res.status(401);
        res.setHeader('Content-Type', 'text/plain');
        res.send(encryptedError);
        return;
      }

      // Verify signature
      if (!verifySignature(decryptedPayload.data, decryptedPayload.timestamp, decryptedPayload.signature)) {
        const encryptedError = encryptResponse({ error: 'Invalid signature' });
        res.status(401);
        res.setHeader('Content-Type', 'text/plain');
        res.send(encryptedError);
        return;
      }

      // Attach decrypted data to request
      req.decryptedData = decryptedPayload.data;
    }
    next();
  } catch (error) {
    console.error('Decryption error:', error.message);
    const encryptedError = encryptResponse({ error: 'Invalid request format' });
    res.status(400);
    res.setHeader('Content-Type', 'text/plain');
    res.send(encryptedError);
  }
}

/**
 * Middleware to encrypt outgoing responses
 */
function encryptResponse(data) {
  const timestamp = Date.now();
  const responsePayload = {
    data,
    timestamp
  };
  
  return encrypt(responsePayload);
}

// Apply decryption middleware to all routes
app.use(decryptMiddleware);

// Define obfuscated endpoints
const OBFUSCATED_ENDPOINTS = {
  LIST_TODOS: obfuscateEndpoint(ENDPOINTS.LIST_TODOS),
  CREATE_TODO: obfuscateEndpoint(ENDPOINTS.CREATE_TODO),
  UPDATE_TODO: obfuscateEndpoint(ENDPOINTS.UPDATE_TODO),
  DELETE_TODO: obfuscateEndpoint(ENDPOINTS.DELETE_TODO),
  TOGGLE_TODO: obfuscateEndpoint(ENDPOINTS.TOGGLE_TODO)
};

console.log('Obfuscated endpoints:', OBFUSCATED_ENDPOINTS);

/**
 * List all todos
 */
app.get(OBFUSCATED_ENDPOINTS.LIST_TODOS, (req, res) => {
  const encryptedResponse = encryptResponse(todos);
  res.setHeader('Content-Type', 'text/plain');
  res.send(encryptedResponse);
});

/**
 * Create a new todo
 */
app.post(OBFUSCATED_ENDPOINTS.CREATE_TODO, (req, res) => {
  const { text } = req.decryptedData;
  
  const newTodo = {
    id: crypto.randomBytes(8).toString('hex'),
    text,
    completed: false,
    createdAt: Date.now()
  };
  
  todos.push(newTodo);
  
  const encryptedResponse = encryptResponse(newTodo);
  res.setHeader('Content-Type', 'text/plain');
  res.send(encryptedResponse);
});

/**
 * Update a todo
 */
app.put(OBFUSCATED_ENDPOINTS.UPDATE_TODO, (req, res) => {
  const { id, text } = req.decryptedData;
  
  const todo = todos.find(t => t.id === id);
  if (!todo) {
    const encryptedResponse = encryptResponse({ error: 'Todo not found' });
    res.status(404);
    res.setHeader('Content-Type', 'text/plain');
    res.send(encryptedResponse);
    return;
  }
  
  todo.text = text;
  
  const encryptedResponse = encryptResponse(todo);
  res.setHeader('Content-Type', 'text/plain');
  res.send(encryptedResponse);
});

/**
 * Toggle todo completion status
 */
app.post(OBFUSCATED_ENDPOINTS.TOGGLE_TODO, (req, res) => {
  const { id } = req.decryptedData;
  
  const todo = todos.find(t => t.id === id);
  if (!todo) {
    const encryptedResponse = encryptResponse({ error: 'Todo not found' });
    res.status(404);
    res.setHeader('Content-Type', 'text/plain');
    res.send(encryptedResponse);
    return;
  }
  
  todo.completed = !todo.completed;
  
  const encryptedResponse = encryptResponse(todo);
  res.setHeader('Content-Type', 'text/plain');
  res.send(encryptedResponse);
});

/**
 * Delete a todo
 */
app.delete(OBFUSCATED_ENDPOINTS.DELETE_TODO, (req, res) => {
  const { id } = req.decryptedData;
  
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) {
    const encryptedResponse = encryptResponse({ error: 'Todo not found' });
    res.status(404);
    res.setHeader('Content-Type', 'text/plain');
    res.send(encryptedResponse);
    return;
  }
  
  todos.splice(index, 1);
  
  const encryptedResponse = encryptResponse({ success: true });
  res.setHeader('Content-Type', 'text/plain');
  res.send(encryptedResponse);
});

// Health check endpoint (not obfuscated for monitoring purposes)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve frontend static files
app.use(express.static('../frontend'));

app.listen(PORT, () => {
  console.log(`\n🔐 Rossetta API Server running on port ${PORT}`);
  console.log(`📡 All API endpoints are obfuscated and encrypted`);
  console.log(`🔒 Network requests cannot be reverse-engineered from browser DevTools\n`);
});
