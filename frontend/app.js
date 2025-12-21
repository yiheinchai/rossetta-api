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
  const countEl = document.getElementById('todos-count');
  
  // Update count
  const completedCount = todos.filter(t => t.completed).length;
  countEl.textContent = `${todos.length} task${todos.length !== 1 ? 's' : ''} (${completedCount} completed)`;
  
  if (todos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>No tasks yet. Add one above to get started!</p>
      </div>
    `;
    return;
  }
  
  // Clear container
  container.innerHTML = '';
  
  // Create todo elements with proper event listeners
  todos.forEach(todo => {
    const todoEl = document.createElement('div');
    todoEl.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    
    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.className = 'todo-checkbox';
    checkbox.addEventListener('change', () => handleToggleTodo(todo.id));
    
    // Text
    const textEl = document.createElement('span');
    textEl.className = 'todo-text';
    textEl.textContent = todo.text;
    
    // Actions container
    const actionsEl = document.createElement('div');
    actionsEl.className = 'todo-actions';
    
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'btn-edit';
    editBtn.addEventListener('click', () => handleEditTodo(todo.id));
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'btn-delete';
    deleteBtn.addEventListener('click', () => handleDeleteTodo(todo.id));
    
    // Assemble
    actionsEl.appendChild(editBtn);
    actionsEl.appendChild(deleteBtn);
    
    todoEl.appendChild(checkbox);
    todoEl.appendChild(textEl);
    todoEl.appendChild(actionsEl);
    
    container.appendChild(todoEl);
  });
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

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
