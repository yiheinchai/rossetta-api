"""
Example FastAPI application using Rossetta FastAPI middleware
"""

from fastapi import FastAPI, Request
from starlette.middleware.sessions import SessionMiddleware
import sys
import os

# Add parent directory to path to import rossetta_fastapi
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rossetta_fastapi import setup_rossetta

# Create FastAPI app
app = FastAPI()

# Setup Rossetta - this adds middleware AND creates /api/init-session endpoint
setup_rossetta(
    app,
    secret=os.environ.get('ROSSETTA_SECRET_KEY', 'dev-rossetta-secret'),
    timestamp_window=300000  # 5 minutes
)

# Add session middleware after Rossetta
# Note: In FastAPI/Starlette, middlewares are executed in reverse order of registration
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get('SESSION_SECRET_KEY', 'dev-secret-change-in-production')
)

# In-memory todo storage (for demo purposes only)
todos = [
    {"id": 1, "text": "Learn Rossetta API", "completed": False},
    {"id": 2, "text": "Build secure app", "completed": False}
]
next_id = 3

# Session initialization is automatically available at /api/init-session

@app.get("/")
async def index():
    """Simple index page"""
    return {
        "message": "Rossetta FastAPI Example API",
        "endpoints": {
            "init": "POST /api/init-session - Initialize session",
            "list": "GET /api/todos - List all todos",
            "create": "POST /api/todos - Create a new todo",
            "update": "PUT /api/todos/{id} - Update a todo",
            "delete": "DELETE /api/todos/{id} - Delete a todo",
            "health": "GET /health - Health check"
        },
        "note": "All endpoints (except init-session and health) use encrypted requests/responses"
    }


@app.get("/api/todos")
async def list_todos(request: Request):
    """List all todos - response is automatically encrypted"""
    return todos


@app.post("/api/todos")
async def create_todo(request: Request):
    """Create a new todo"""
    global next_id
    
    # Access decrypted data
    data = request.state.decrypted_data
    
    todo = {
        "id": next_id,
        "text": data.get('text', ''),
        "completed": False
    }
    
    todos.append(todo)
    next_id += 1
    
    # Just return the data - encryption happens automatically
    return todo


@app.put("/api/todos/{todo_id}")
async def update_todo(todo_id: int, request: Request):
    """Update a todo"""
    data = request.state.decrypted_data
    
    for todo in todos:
        if todo['id'] == todo_id:
            todo['text'] = data.get('text', todo['text'])
            todo['completed'] = data.get('completed', todo['completed'])
            return todo
    
    return {"error": "Todo not found"}


@app.delete("/api/todos/{todo_id}")
async def delete_todo(todo_id: int, request: Request):
    """Delete a todo"""
    global todos
    
    initial_length = len(todos)
    todos = [t for t in todos if t['id'] != todo_id]
    
    if len(todos) < initial_length:
        return {"deleted": True, "id": todo_id}
    
    return {"error": "Todo not found"}


@app.get("/health")
async def health():
    """Health check endpoint (unencrypted)"""
    return {"status": "healthy"}


if __name__ == '__main__':
    import uvicorn
    
    print("=" * 60)
    print("Rossetta FastAPI Example Server")
    print("=" * 60)
    print(f"Server running at: http://localhost:8000")
    print(f"Session init endpoint: http://localhost:8000/api/init-session")
    print(f"API docs: http://localhost:8000/docs")
    print("=" * 60)
    print("\n⚠️  Running in development mode - do NOT use in production!")
    print("For production, use a production server setup:")
    print("  uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4")
    print("=" * 60)
    
    # Development server
    uvicorn.run(app, host="0.0.0.0", port=8000)
