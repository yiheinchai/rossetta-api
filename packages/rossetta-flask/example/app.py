"""
Example Flask application using Rossetta Flask middleware
"""

from flask import Flask, request
import sys
import os

# Add parent directory to path to import rossetta_flask
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rossetta_flask import RossettaFlask, encrypt_response, protected_route

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-change-in-production')

# Initialize Rossetta middleware
rossetta = RossettaFlask(
    app,
    secret=os.environ.get('ROSSETTA_SECRET_KEY', 'dev-rossetta-secret'),
    timestamp_window=300000  # 5 minutes
)

# In-memory todo storage (for demo purposes only)
todos = [
    {"id": 1, "text": "Learn Rossetta API", "completed": False},
    {"id": 2, "text": "Build secure app", "completed": False}
]
next_id = 3

# Session initialization is automatically available at /api/init-session

@app.route('/')
def index():
    """Simple index page"""
    return """
    <html>
        <head><title>Rossetta Flask Example</title></head>
        <body>
            <h1>Rossetta Flask Example API</h1>
            <p>Available endpoints:</p>
            <ul>
                <li>POST /api/init-session - Initialize session</li>
                <li>GET /api/todos - List all todos</li>
                <li>POST /api/todos - Create a new todo</li>
                <li>PUT /api/todos/&lt;id&gt; - Update a todo</li>
                <li>DELETE /api/todos/&lt;id&gt; - Delete a todo</li>
            </ul>
            <p>All endpoints (except init-session) use encrypted requests/responses.</p>
            <p>Use the @rossetta-api/client package for easy integration.</p>
        </body>
    </html>
    """

@app.route('/api/todos', methods=['GET'])
@protected_route
def list_todos():
    """List all todos - response is automatically encrypted"""
    return todos

@app.route('/api/todos', methods=['POST'])
def create_todo():
    """Create a new todo"""
    global next_id
    
    # Access decrypted data
    data = request.decrypted_data
    
    todo = {
        "id": next_id,
        "text": data.get('text', ''),
        "completed": False
    }
    
    todos.append(todo)
    next_id += 1
    
    # Encrypt and return response
    return encrypt_response(todo)

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
@protected_route
def update_todo(todo_id):
    """Update a todo"""
    data = request.decrypted_data
    
    for todo in todos:
        if todo['id'] == todo_id:
            todo['text'] = data.get('text', todo['text'])
            todo['completed'] = data.get('completed', todo['completed'])
            return todo
    
    return {"error": "Todo not found"}, 404

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
@protected_route
def delete_todo(todo_id):
    """Delete a todo"""
    global todos
    
    initial_length = len(todos)
    todos = [t for t in todos if t['id'] != todo_id]
    
    if len(todos) < initial_length:
        return {"deleted": True, "id": todo_id}
    
    return {"error": "Todo not found"}, 404

@app.route('/health')
def health():
    """Health check endpoint (unencrypted)"""
    return {"status": "healthy"}

if __name__ == '__main__':
    print("=" * 60)
    print("Rossetta Flask Example Server")
    print("=" * 60)
    print(f"Server running at: http://localhost:5000")
    print(f"Session init endpoint: http://localhost:5000/api/init-session")
    print("=" * 60)
    print("\n⚠️  Running in development mode - do NOT use in production!")
    print("For production, use a production WSGI server like gunicorn:")
    print("  gunicorn -w 4 -b 0.0.0.0:5000 app:app")
    print("=" * 60)
    
    # Development server (debug=True for development only)
    # In production, use a production WSGI server like gunicorn or uwsgi
    app.run(debug=True, host='0.0.0.0', port=5000)
