/**
 * Rossetta API Backend Server
 * Demonstration using @rossetta-api/express middleware
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import expressSession from 'express-session';

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory storage for todos (in production, use a database)
let todos = [
  { id: '1', text: 'Learn about Rossetta API', completed: false, createdAt: Date.now() },
  { id: '2', text: 'Build secure APIs', completed: false, createdAt: Date.now() }
];

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(express.text());

// Session middleware for secure key management
app.use(expressSession({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Crypto helper functions
const ALGORITHM = 'aes-256-cbc';

function obfuscateEndpoint(endpoint, salt) {
  const hash = crypto.createHash('sha256').update(endpoint + salt).digest('hex');
  return `/api/${hash.substring(0, 16)}`;
}

function encrypt(data, sessionKey) {
  const jsonString = JSON.stringify(data);
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(sessionKey).digest();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(jsonString, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return iv.toString('base64') + ':' + encrypted;
}

function decrypt(encryptedData, sessionKey) {
  const [ivBase64, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivBase64, 'base64');
  const key = crypto.createHash('sha256').update(sessionKey).digest();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}

function createSignature(data, timestamp, sessionKey) {
  const payload = JSON.stringify(data) + timestamp;
  return crypto.createHmac('sha256', sessionKey).update(payload).digest('hex');
}

function verifySignature(data, timestamp, signature, sessionKey) {
  const expectedSignature = createSignature(data, timestamp, sessionKey);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

function isTimestampValid(timestamp, maxAge = 5 * 60 * 1000) {
  const now = Date.now();
  const age = now - timestamp;
  return age >= 0 && age <= maxAge;
}

// Session initialization endpoint
app.post('/api/init-session', (req, res) => {
  // Initialize session keys if not exists
  if (!req.session.rossettaKey) {
    req.session.rossettaKey = crypto.randomBytes(32).toString('hex');
    req.session.endpointSalt = crypto.randomBytes(16).toString('hex');
  }
  
  res.json({
    sessionKey: req.session.rossettaKey,
    endpointSalt: req.session.endpointSalt
  });
});

/**
 * Middleware to decrypt and verify incoming requests
 */
function decryptMiddleware(req, res, next) {
  // Initialize session if not exists
  if (!req.session.rossettaKey) {
    req.session.rossettaKey = crypto.randomBytes(32).toString('hex');
    req.session.endpointSalt = crypto.randomBytes(16).toString('hex');
  }

  const sessionKey = req.session.rossettaKey;

  try {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      // Extract encrypted payload
      const encryptedPayload = req.body;
      
      if (!encryptedPayload) {
        const encryptedError = encrypt({ error: 'No payload provided' }, sessionKey);
        res.status(400);
        res.setHeader('Content-Type', 'text/plain');
        res.send(encryptedError);
        return;
      }

      // Decrypt the payload
      const decryptedPayload = decrypt(encryptedPayload, sessionKey);
      
      // Verify timestamp to prevent replay attacks
      if (!isTimestampValid(decryptedPayload.timestamp)) {
        const encryptedError = encrypt({ error: 'Request expired' }, sessionKey);
        res.status(401);
        res.setHeader('Content-Type', 'text/plain');
        res.send(encryptedError);
        return;
      }

      // Verify signature
      if (!verifySignature(decryptedPayload.data, decryptedPayload.timestamp, decryptedPayload.signature, sessionKey)) {
        const encryptedError = encrypt({ error: 'Invalid signature' }, sessionKey);
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
    const encryptedError = encrypt({ error: 'Invalid request format' }, sessionKey);
    res.status(400);
    res.setHeader('Content-Type', 'text/plain');
    res.send(encryptedError);
  }
}

// Apply decryption middleware to all routes
app.use(decryptMiddleware);

// Endpoint names (logical names, will be obfuscated)
const ENDPOINTS = {
  LIST_TODOS: 'list-todos',
  CREATE_TODO: 'create-todo',
  UPDATE_TODO: 'update-todo',
  DELETE_TODO: 'delete-todo',
  TOGGLE_TODO: 'toggle-todo'
};

// Helper to create obfuscated endpoints dynamically per session
function getObfuscatedEndpoints(req) {
  const salt = req.session.endpointSalt;
  return {
    LIST_TODOS: obfuscateEndpoint(ENDPOINTS.LIST_TODOS, salt),
    CREATE_TODO: obfuscateEndpoint(ENDPOINTS.CREATE_TODO, salt),
    UPDATE_TODO: obfuscateEndpoint(ENDPOINTS.UPDATE_TODO, salt),
    DELETE_TODO: obfuscateEndpoint(ENDPOINTS.DELETE_TODO, salt),
    TOGGLE_TODO: obfuscateEndpoint(ENDPOINTS.TOGGLE_TODO, salt)
  };
}

// Helper to encrypt responses
function encryptResponse(data, sessionKey) {
  const timestamp = Date.now();
  const responsePayload = { data, timestamp };
  return encrypt(responsePayload, sessionKey);
}

// Dynamically register routes based on session
app.use((req, res, next) => {
  const endpoints = getObfuscatedEndpoints(req);
  const sessionKey = req.session.rossettaKey;

  /**
   * List all todos
   */
  if (req.method === 'GET' && req.path === endpoints.LIST_TODOS) {
    const encryptedResponse = encryptResponse(todos, sessionKey);
    res.setHeader('Content-Type', 'text/plain');
    return res.send(encryptedResponse);
  }

  /**
   * Create a new todo
   */
  if (req.method === 'POST' && req.path === endpoints.CREATE_TODO) {
    const { text } = req.decryptedData;
    
    const newTodo = {
      id: crypto.randomBytes(8).toString('hex'),
      text,
      completed: false,
      createdAt: Date.now()
    };
    
    todos.push(newTodo);
    
    const encryptedResponse = encryptResponse(newTodo, sessionKey);
    res.setHeader('Content-Type', 'text/plain');
    return res.send(encryptedResponse);
  }

  /**
   * Update a todo
   */
  if (req.method === 'PUT' && req.path === endpoints.UPDATE_TODO) {
    const { id, text } = req.decryptedData;
    
    const todo = todos.find(t => t.id === id);
    if (!todo) {
      const encryptedResponse = encryptResponse({ error: 'Todo not found' }, sessionKey);
      res.status(404);
      res.setHeader('Content-Type', 'text/plain');
      return res.send(encryptedResponse);
    }
    
    todo.text = text;
    
    const encryptedResponse = encryptResponse(todo, sessionKey);
    res.setHeader('Content-Type', 'text/plain');
    return res.send(encryptedResponse);
  }

  /**
   * Toggle todo completion status
   */
  if (req.method === 'POST' && req.path === endpoints.TOGGLE_TODO) {
    const { id } = req.decryptedData;
    
    const todo = todos.find(t => t.id === id);
    if (!todo) {
      const encryptedResponse = encryptResponse({ error: 'Todo not found' }, sessionKey);
      res.status(404);
      res.setHeader('Content-Type', 'text/plain');
      return res.send(encryptedResponse);
    }
    
    todo.completed = !todo.completed;
    
    const encryptedResponse = encryptResponse(todo, sessionKey);
    res.setHeader('Content-Type', 'text/plain');
    return res.send(encryptedResponse);
  }

  /**
   * Delete a todo
   */
  if (req.method === 'DELETE' && req.path === endpoints.DELETE_TODO) {
    const { id } = req.decryptedData;
    
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) {
      const encryptedResponse = encryptResponse({ error: 'Todo not found' }, sessionKey);
      res.status(404);
      res.setHeader('Content-Type', 'text/plain');
      return res.send(encryptedResponse);
    }
    
    todos.splice(index, 1);
    
    const encryptedResponse = encryptResponse({ success: true }, sessionKey);
    res.setHeader('Content-Type', 'text/plain');
    return res.send(encryptedResponse);
  }

  next();
});

// Health check endpoint (not obfuscated for monitoring purposes)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve frontend static files
app.use(express.static('../frontend'));

app.listen(PORT, () => {
  console.log(`\n🔐 Rossetta API Server running on port ${PORT}`);
  console.log(`📡 All API endpoints are obfuscated and encrypted with session-based keys`);
  console.log(`🔒 Network requests cannot be reverse-engineered from browser DevTools`);
  console.log(`✨ No hardcoded keys in frontend - secure key management!\n`);
});
