/**
 * Todo List Application
 * Frontend logic for managing todos with obfuscated API calls
 */

let todos = [];
let editingTodoId = null;

/**
 * Initialize the application
 */
async function init() {
  // Set up event listeners
  document.getElementById('add-todo-form').addEventListener('submit', handleAddTodo);
  
  // Load initial todos
  await loadTodos();
}

/**
 * Load todos from API
 */
async function loadTodos() {
  try {
    showLoading(true);
    todos = await RossettaAPI.listTodos();
    renderTodos();
  } catch (error) {
    showError('Failed to load todos. Make sure the backend is running on port 3001.');
    console.error(error);
  } finally {
    showLoading(false);
  }
}

/**
 * Handle add todo form submission
 */
async function handleAddTodo(e) {
  e.preventDefault();
  
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  
  if (!text) return;
  
  try {
    showLoading(true);
    
    if (editingTodoId) {
      // Update existing todo
      const updatedTodo = await RossettaAPI.updateTodo(editingTodoId, text);
      const index = todos.findIndex(t => t.id === editingTodoId);
      if (index !== -1) {
        todos[index] = updatedTodo;
      }
      editingTodoId = null;
      document.getElementById('add-btn').textContent = 'Add Todo';
    } else {
      // Create new todo
      const newTodo = await RossettaAPI.createTodo(text);
      todos.push(newTodo);
    }
    
    input.value = '';
    renderTodos();
  } catch (error) {
    showError('Failed to save todo');
    console.error(error);
  } finally {
    showLoading(false);
  }
}

/**
 * Handle toggle todo completion
 */
async function handleToggleTodo(id) {
  try {
    showLoading(true);
    const updatedTodo = await RossettaAPI.toggleTodo(id);
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
      todos[index] = updatedTodo;
    }
    renderTodos();
  } catch (error) {
    showError('Failed to toggle todo');
    console.error(error);
  } finally {
    showLoading(false);
  }
}

/**
 * Handle edit todo
 */
function handleEditTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    document.getElementById('todo-input').value = todo.text;
    editingTodoId = id;
    document.getElementById('add-btn').textContent = 'Update Todo';
    document.getElementById('todo-input').focus();
  }
}

/**
 * Handle delete todo
 */
async function handleDeleteTodo(id) {
  if (!confirm('Are you sure you want to delete this todo?')) {
    return;
  }
  
  try {
    showLoading(true);
    await RossettaAPI.deleteTodo(id);
    todos = todos.filter(t => t.id !== id);
    renderTodos();
  } catch (error) {
    showError('Failed to delete todo');
    console.error(error);
  } finally {
    showLoading(false);
  }
}

/**
 * Render todos to DOM
 */
function renderTodos() {
  const container = document.getElementById('todos-container');
  
  if (todos.length === 0) {
    container.innerHTML = '<p class="empty-state">No todos yet. Add one above!</p>';
    return;
  }
  
  container.innerHTML = todos.map(todo => `
    <div class="todo-item ${todo.completed ? 'completed' : ''}">
      <input 
        type="checkbox" 
        ${todo.completed ? 'checked' : ''} 
        onchange="handleToggleTodo('${todo.id}')"
        class="todo-checkbox"
      >
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <div class="todo-actions">
        <button onclick="handleEditTodo('${todo.id}')" class="btn-edit">Edit</button>
        <button onclick="handleDeleteTodo('${todo.id}')" class="btn-delete">Delete</button>
      </div>
    </div>
  `).join('');
}

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
}

/**
 * Show error message
 */
function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 5000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
