"""
Example FastAPI backend with rossetta-fastapi middleware
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import rossetta middleware
import sys
sys.path.insert(0, '/home/runner/work/rossetta-api/rossetta-api/packages/rossetta-fastapi')
from rossetta_fastapi import RossettaMiddleware

app = FastAPI(title="Rossetta API Example")

# Add CORS middleware for browser access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Rossetta middleware - single line for e2e encryption!
app.add_middleware(RossettaMiddleware)


class Message(BaseModel):
    message: str


class DataItem(BaseModel):
    id: int
    name: str
    value: str


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to Rossetta API Example"}


@app.get("/api/hello")
async def hello():
    """Simple GET endpoint"""
    return {"message": "Hello from encrypted API!"}


@app.get("/api/data")
async def get_data():
    """GET endpoint returning some data"""
    return {
        "items": [
            {"id": 1, "name": "Item 1", "value": "Value 1"},
            {"id": 2, "name": "Item 2", "value": "Value 2"},
            {"id": 3, "name": "Item 3", "value": "Value 3"},
        ]
    }


@app.post("/api/echo")
async def echo(message: Message):
    """POST endpoint that echoes back the message"""
    return {"echo": message.message, "encrypted": True}


@app.post("/api/submit")
async def submit_data(item: DataItem):
    """POST endpoint for submitting data"""
    return {
        "success": True,
        "received": item.dict(),
        "message": "Data received and processed securely"
    }


@app.get("/api/user/{user_id}")
async def get_user(user_id: int):
    """GET endpoint with path parameter"""
    return {
        "id": user_id,
        "username": f"user_{user_id}",
        "email": f"user{user_id}@example.com"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
