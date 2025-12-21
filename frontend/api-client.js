/**
 * Rossetta API Client for Todo App
 * This file imports and uses the @rossetta-api/client package
 */

// In production, users would do: import RossettaClient from '@rossetta-api/client';
// For this demo, we import from the local package
import { RossettaClient } from '../packages/rossetta-client/index.js';

// Create client instance
const client = new RossettaClient('http://localhost:3001');

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
  /**
   * Get all todos
   */
  async listTodos() {
    return client.request(ENDPOINTS.LIST_TODOS, 'GET');
  },
  
  /**
   * Create a new todo
   */
  async createTodo(text) {
    return client.request(ENDPOINTS.CREATE_TODO, 'POST', { text });
  },
  
  /**
   * Update a todo
   */
  async updateTodo(id, text) {
    return client.request(ENDPOINTS.UPDATE_TODO, 'PUT', { id, text });
  },
  
  /**
   * Toggle todo completion status
   */
  async toggleTodo(id) {
    return client.request(ENDPOINTS.TOGGLE_TODO, 'POST', { id });
  },
  
  /**
   * Delete a todo
   */
  async deleteTodo(id) {
    return client.request(ENDPOINTS.DELETE_TODO, 'DELETE', { id });
  }
};
