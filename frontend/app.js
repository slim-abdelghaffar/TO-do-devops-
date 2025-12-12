// ========================================
// Configuration
// ========================================
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

const HEALTH_CHECK_URL = API_URL.replace('/api', '/health');


// ========================================
// DOM Elements
// ========================================
const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const retryBtn = document.getElementById('retryBtn');
const emptyState = document.getElementById('emptyState');
const apiStatus = document.getElementById('apiStatus');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Stats
const totalCount = document.getElementById('totalCount');
const activeCount = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');

// ========================================
// State Management
// ========================================
let todos = [];
let isLoading = false;

// ========================================
// Utility Functions
// ========================================

function showToast(message, duration = 3000) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

function showLoading() {
    isLoading = true;
    loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';
    emptyState.style.display = 'none';
}

function hideLoading() {
    isLoading = false;
    loadingIndicator.style.display = 'none';
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    hideLoading();
}

function hideError() {
    errorMessage.style.display = 'none';
}

function updateStats() {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const active = total - completed;

    totalCount.textContent = total;
    activeCount.textContent = active;
    completedCount.textContent = completed;
}

function showEmptyState() {
    emptyState.style.display = todos.length === 0 ? 'block' : 'none';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
}

// ========================================
// API Functions
// ========================================

async function checkBackendHealth() {
    try {
        const response = await fetch(HEALTH_CHECK_URL);
        if (response.ok) {
            apiStatus.textContent = 'Online';
            apiStatus.className = 'status-badge status-online';
        } else {
            apiStatus.textContent = 'Offline';
            apiStatus.className = 'status-badge status-offline';
        }
    } catch (error) {
        apiStatus.textContent = 'Offline';
        apiStatus.className = 'status-badge status-offline';
    }
}

async function fetchTodos() {
    showLoading();
    hideError();

    try {
        const response = await fetch(`${API_URL}/todos`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch todos: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            todos = data.data;
            renderTodos();
            updateStats();
            showEmptyState();
        } else {
            throw new Error(data.message || 'Failed to fetch todos');
        }
    } catch (error) {
        console.error('Error fetching todos:', error);
        showError(`Unable to load todos. ${error.message}`);
        todos = [];
    } finally {
        hideLoading();
    }
}

async function createTodo(title) {
    if (!title.trim()) {
        showToast('⚠️ Please enter a todo title', 2000);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/todos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title: title.trim() }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            todos.unshift(data.data);
            renderTodos();
            updateStats();
            showEmptyState();
            todoInput.value = '';
            showToast('✅ Todo added successfully!');
        } else {
            throw new Error(data.message || 'Failed to create todo');
        }
    } catch (error) {
        console.error('Error creating todo:', error);
        showToast(`❌ Error: ${error.message}`);
    }
}

async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const newCompletedState = !todo.completed;

    try {
        const response = await fetch(`${API_URL}/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed: newCompletedState }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            todo.completed = newCompletedState;
            renderTodos();
            updateStats();
            showToast(newCompletedState ? '✅ Todo completed!' : '↩️ Todo reopened');
        } else {
            throw new Error(data.message || 'Failed to update todo');
        }
    } catch (error) {
        console.error('Error toggling todo:', error);
        showToast(`❌ Error: ${error.message}`);
    }
}

async function deleteTodo(id) {
    if (!confirm('Are you sure you want to delete this todo?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/todos/${id}`, {
            method: 'DELETE',
        });

        const data = await response.json();

        if (response.ok && data.success) {
            todos = todos.filter(t => t.id !== id);
            renderTodos();
            updateStats();
            showEmptyState();
            showToast('🗑️ Todo deleted successfully');
        } else {
            throw new Error(data.message || 'Failed to delete todo');
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
        showToast(`❌ Error: ${error.message}`);
    }
}

// ========================================
// Rendering Functions
// ========================================

function renderTodos() {
    todoList.innerHTML = '';

    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.setAttribute('data-id', todo.id);

        li.innerHTML = `
            <input 
                type="checkbox" 
                class="todo-checkbox" 
                ${todo.completed ? 'checked' : ''}
                onchange="toggleTodo(${todo.id})"
            >
            <span class="todo-text">${escapeHtml(todo.title)}</span>
            <span class="todo-date">${formatDate(todo.created_at)}</span>
            <button class="todo-delete" onclick="deleteTodo(${todo.id})">
                Delete
            </button>
        `;

        todoList.appendChild(li);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// Event Listeners
// ========================================

addBtn.addEventListener('click', () => {
    const title = todoInput.value;
    createTodo(title);
});

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const title = todoInput.value;
        createTodo(title);
    }
});

retryBtn.addEventListener('click', () => {
    fetchTodos();
});

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Todo App Initialized');
    console.log('📡 API URL:', API_URL);
    
    // Check backend health
    checkBackendHealth();
    setInterval(checkBackendHealth, 30000); // Check every 30 seconds

    // Load initial todos
    fetchTodos();
});

// ========================================
// Expose functions to global scope for inline event handlers
// ========================================
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
