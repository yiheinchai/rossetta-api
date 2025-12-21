/**
 * Rossetta API Client for Todo App
 * Uses the @rossetta-api/client package (via lib)
 */

import { RossettaClient } from './lib/rossetta-client.js';

// Create client instance - use proxy in dev, direct in production
const baseURL = import.meta.env.DEV ? '' : 'http://localhost:3001';
const client = new RossettaClient(baseURL);

// Define endpoint names (must match backend)
const ENDPOINTS = {
  LIST_TODOS: 'list-todos',
  CREATE_TODO: 'create-todo',
  UPDATE_TODO: 'update-todo',
  DELETE_TODO: 'delete-todo',
  TOGGLE_TODO: 'toggle-todo'
};

// API methods for todo operations
export const RossettaAPI = {
  async listTodos() {
    return client.request(ENDPOINTS.LIST_TODOS, 'GET');
  },
  
  async createTodo(text) {
    return client.request(ENDPOINTS.CREATE_TODO, 'POST', { text });
  },
  
  async updateTodo(id, text) {
    return client.request(ENDPOINTS.UPDATE_TODO, 'PUT', { id, text });
  },
  
  async toggleTodo(id) {
    return client.request(ENDPOINTS.TOGGLE_TODO, 'POST', { id });
  },
  
  async deleteTodo(id) {
    return client.request(ENDPOINTS.DELETE_TODO, 'DELETE', { id });
  }
};
