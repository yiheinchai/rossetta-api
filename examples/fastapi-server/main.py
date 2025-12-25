"""
Example FastAPI application with Rossetta encryption middleware.

This demonstrates how to add end-to-end encryption to an existing FastAPI app
with just a single line of code (adding the middleware).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# Import Rossetta middleware
from rossetta_fastapi import RossettaMiddleware

# Create FastAPI app
app = FastAPI(title="Rossetta Example API", version="1.0.0")

# Add CORS middleware (for browser clients)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Rossetta encryption middleware - THAT'S IT!
# This single line enables E2E encryption for all endpoints
app.add_middleware(RossettaMiddleware)


# Data models
class User(BaseModel):
    id: Optional[int] = None
    name: str
    email: str
    age: Optional[int] = None


class CreateUserRequest(BaseModel):
    name: str
    email: str
    age: Optional[int] = None


# In-memory database
users_db: List[User] = [
    User(id=1, name="Alice Johnson", email="alice@example.com", age=30),
    User(id=2, name="Bob Smith", email="bob@example.com", age=25),
    User(id=3, name="Charlie Brown", email="charlie@example.com", age=35),
]
next_id = 4


# Routes - these work exactly as before, no changes needed!
@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Welcome to Rossetta Example API", "encrypted": True}


@app.get("/api/users")
async def get_users():
    """Get all users."""
    return {"users": users_db}


@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    """Get a specific user."""
    for user in users_db:
        if user.id == user_id:
            return user
    return {"error": "User not found"}, 404


@app.post("/api/users")
async def create_user(user: CreateUserRequest):
    """Create a new user."""
    global next_id
    
    new_user = User(
        id=next_id,
        name=user.name,
        email=user.email,
        age=user.age
    )
    users_db.append(new_user)
    next_id += 1
    
    return {
        "message": "User created successfully",
        "user": new_user
    }


@app.put("/api/users/{user_id}")
async def update_user(user_id: int, user: CreateUserRequest):
    """Update an existing user."""
    for i, existing_user in enumerate(users_db):
        if existing_user.id == user_id:
            updated_user = User(
                id=user_id,
                name=user.name,
                email=user.email,
                age=user.age
            )
            users_db[i] = updated_user
            return {
                "message": "User updated successfully",
                "user": updated_user
            }
    
    return {"error": "User not found"}, 404


@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int):
    """Delete a user."""
    for i, user in enumerate(users_db):
        if user.id == user_id:
            deleted_user = users_db.pop(i)
            return {
                "message": "User deleted successfully",
                "user": deleted_user
            }
    
    return {"error": "User not found"}, 404


if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("Starting Rossetta Example API Server")
    print("=" * 60)
    print("All API endpoints are now E2E encrypted!")
    print("Public key available at: /.well-known/rossetta-public-key")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
