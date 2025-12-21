"""
Simple Chat App - FastAPI Backend (No Encryption)
This is a basic chat app to test Rossetta packages on
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
import time

app = FastAPI()

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory message storage
messages: List[dict] = []

class Message(BaseModel):
    username: str
    text: str

@app.get("/api/messages")
async def get_messages():
    """Get all chat messages"""
    return {"messages": messages}

@app.post("/api/messages")
async def post_message(message: Message):
    """Post a new chat message"""
    new_message = {
        "id": len(messages) + 1,
        "username": message.username,
        "text": message.text,
        "timestamp": int(time.time() * 1000)
    }
    messages.append(new_message)
    return new_message

@app.delete("/api/messages")
async def clear_messages():
    """Clear all messages"""
    messages.clear()
    return {"success": True}

# Serve frontend
app.mount("/", StaticFiles(directory="../frontend", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
