/**
 * Simple Chat App - Frontend JavaScript
 * NO ENCRYPTION - Plain fetch requests
 */

const API_BASE = 'http://localhost:8000';
let messages = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadMessages();
  
  document.getElementById('chat-form').addEventListener('submit', handleSendMessage);
  document.getElementById('refresh-btn').addEventListener('click', loadMessages);
  document.getElementById('clear-btn').addEventListener('click', clearMessages);
});

// Load messages from server
async function loadMessages() {
  try {
    const response = await fetch(`${API_BASE}/api/messages`);
    const data = await response.json();
    messages = data.messages;
    renderMessages();
  } catch (error) {
    console.error('Failed to load messages:', error);
  }
}

// Send a new message
async function handleSendMessage(e) {
  e.preventDefault();
  
  const username = document.getElementById('username-input').value.trim();
  const text = document.getElementById('message-input').value.trim();
  
  if (!username || !text) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, text })
    });
    
    if (response.ok) {
      document.getElementById('message-input').value = '';
      await loadMessages();
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

// Clear all messages
async function clearMessages() {
  if (!confirm('Clear all messages?')) return;
  
  try {
    await fetch(`${API_BASE}/api/messages`, { method: 'DELETE' });
    await loadMessages();
  } catch (error) {
    console.error('Failed to clear messages:', error);
  }
}

// Render messages to DOM
function renderMessages() {
  const chatBox = document.getElementById('chat-box');
  
  if (messages.length === 0) {
    chatBox.innerHTML = '<div class="empty-state">No messages yet. Start chatting!</div>';
    return;
  }
  
  chatBox.innerHTML = messages.map(msg => `
    <div class="message">
      <div class="message-header">
        <span class="username">${escapeHtml(msg.username)}</span>
        <span class="timestamp">${formatTime(msg.timestamp)}</span>
      </div>
      <div class="message-text">${escapeHtml(msg.text)}</div>
    </div>
  `).join('');
  
  // Scroll to bottom
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}
