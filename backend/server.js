/**
 * Rossetta API Todo Demo - Backend
 * This demo uses @rossetta-api/express package
 */

import express from 'express';
import crypto from 'crypto';
// Import from the local package (in production, users would: npm install @rossetta-api/express)
import { rossettaMiddleware, createSessionInitHandler } from '../packages/rossetta-express/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory storage for todos (in production, use a database)
let todos = [
  { id: '1', text: 'Learn about Rossetta API', completed: false, createdAt: Date.now() },
  { id: '2', text: 'Build secure APIs', completed: false, createdAt: Date.now() }
];

// Apply Rossetta middleware - this handles all encryption/obfuscation automatically!
app.use(rossettaMiddleware({
  secret: process.env.ROSSETTA_SECRET_KEY,
  sessionMaxAge: 24 * 60 * 60 * 1000,
  timestampWindow: 5 * 60 * 1000
}));

// Session initialization endpoint for frontend
app.post('/api/init-session', createSessionInitHandler());

// Define obfuscated endpoints using the helper
function getObfuscatedPath(req, logicalName) {
  return req.rossetta.obfuscateEndpoint(logicalName);
}

// Todo endpoints - these paths are obfuscated per session
app.use((req, res, next) => {
  const listPath = getObfuscatedPath(req, 'list-todos');
  const createPath = getObfuscatedPath(req, 'create-todo');
  const updatePath = getObfuscatedPath(req, 'update-todo');
  const togglePath = getObfuscatedPath(req, 'toggle-todo');
  const deletePath = getObfuscatedPath(req, 'delete-todo');

  // List todos
  if (req.method === 'GET' && req.path === listPath) {
    return res.encryptResponse(todos);
  }

  // Create todo
  if (req.method === 'POST' && req.path === createPath) {
    const { text } = req.body;
    const newTodo = {
      id: crypto.randomBytes(8).toString('hex'),
      text,
      completed: false,
      createdAt: Date.now()
    };
    todos.push(newTodo);
    return res.encryptResponse(newTodo);
  }

  // Update todo
  if (req.method === 'PUT' && req.path === updatePath) {
    const { id, text } = req.body;
    const todo = todos.find(t => t.id === id);
    if (!todo) {
      res.status(404);
      return res.encryptResponse({ error: 'Todo not found' });
    }
    todo.text = text;
    return res.encryptResponse(todo);
  }

  // Toggle todo
  if (req.method === 'POST' && req.path === togglePath) {
    const { id } = req.body;
    const todo = todos.find(t => t.id === id);
    if (!todo) {
      res.status(404);
      return res.encryptResponse({ error: 'Todo not found' });
    }
    todo.completed = !todo.completed;
    return res.encryptResponse(todo);
  }

  // Delete todo
  if (req.method === 'DELETE' && req.path === deletePath) {
    const { id } = req.body;
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) {
      res.status(404);
      return res.encryptResponse({ error: 'Todo not found' });
    }
    todos.splice(index, 1);
    return res.encryptResponse({ success: true });
  }

  next();
});

// Health check endpoint (not obfuscated for monitoring)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve frontend static files
app.use(express.static('../frontend'));

app.listen(PORT, () => {
  console.log(`\n🔐 Rossetta API Todo Demo running on port ${PORT}`);
  console.log(`✅ Using @rossetta-api/express package`);
  console.log(`📡 All API endpoints are obfuscated and encrypted`);
  console.log(`🔒 Session-based keys - no hardcoded secrets!\n`);
});
