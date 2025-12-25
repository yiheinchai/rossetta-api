"""
Example FastAPI server with Rosetta middleware
"""

from fastapi import FastAPI
from rosetta_fastapi import RosettaMiddleware

app = FastAPI()

# Add Rosetta middleware for e2e encryption
app.add_middleware(RosettaMiddleware, secret_key="demo-secret-key-change-in-production")

@app.get("/")
def root():
    return {"message": "Welcome to Rosetta API Demo"}

@app.get("/api/data")
def get_data():
    return {
        "message": "This response is encrypted",
        "data": [1, 2, 3, 4, 5],
        "timestamp": "2024-01-01T00:00:00Z"
    }

@app.post("/api/echo")
def echo_data(data: dict):
    return {
        "echo": data,
        "message": "Data received and encrypted"
    }

@app.get("/api/user/{user_id}")
def get_user(user_id: int):
    return {
        "user_id": user_id,
        "name": f"User {user_id}",
        "email": f"user{user_id}@example.com"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
