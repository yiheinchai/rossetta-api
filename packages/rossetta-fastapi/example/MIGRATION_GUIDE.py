#!/usr/bin/env python3
"""
Demonstration: Converting a standard FastAPI app to use Rossetta encryption
Shows the minimal changes needed - truly plug-and-play!
"""

print("=" * 70)
print("BEFORE: Standard FastAPI App (No Encryption)")
print("=" * 70)
print("""
from fastapi import FastAPI, Request

app = FastAPI()

@app.get("/api/users")
async def get_users():
    return {"users": [{"id": 1, "name": "Alice"}]}

@app.post("/api/users")
async def create_user(request: Request):
    data = await request.json()
    return {"id": 2, "name": data["name"]}
""")

print("\n" + "=" * 70)
print("AFTER: FastAPI App with Rossetta Encryption (Minimal Changes)")
print("=" * 70)
print("""
from fastapi import FastAPI, Request
from starlette.middleware.sessions import SessionMiddleware
from rossetta_fastapi import setup_rossetta

app = FastAPI()

# Add these 2 lines - that's it!
setup_rossetta(app)
app.add_middleware(SessionMiddleware, secret_key="your-secret")

# Routes remain UNCHANGED - encryption is automatic!
@app.get("/api/users")
async def get_users():
    return {"users": [{"id": 1, "name": "Alice"}]}  # Auto-encrypted!

@app.post("/api/users")
async def create_user(request: Request):
    data = request.state.decrypted_data  # Changed: was await request.json()
    return {"id": 2, "name": data["name"]}  # Auto-encrypted!
""")

print("\n" + "=" * 70)
print("CHANGES REQUIRED:")
print("=" * 70)
print("""
1. Import setup_rossetta and SessionMiddleware
2. Add setup_rossetta(app)
3. Add SessionMiddleware
4. Change request.json() to request.state.decrypted_data (for POST/PUT/DELETE)

That's it! All responses are automatically encrypted.
All requests are automatically decrypted.
The /api/init-session endpoint is created automatically.
""")

print("=" * 70)
print("WHAT YOU GET:")
print("=" * 70)
print("""
✅ Automatic AES-256-CBC encryption for all /api/* responses
✅ Automatic decryption for POST/PUT/DELETE requests
✅ HMAC-SHA256 signatures for request integrity
✅ Timestamp validation to prevent replay attacks
✅ Session-based key management (no hardcoded secrets)
✅ /api/init-session endpoint created automatically
✅ Perfect forward secrecy (unique keys per session)
✅ Zero manual encryption code needed
""")

print("=" * 70)
print("Ready for production! (with HTTPS, rate limiting, and auth)")
print("=" * 70)
