# MongoDB Database Connection and Models
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from bson import ObjectId

from config import settings


# MongoDB Connection
class MongoDB:
    client = None  # AsyncIOMotorClient instance
    db = None


mongo = MongoDB()


async def connect_to_mongo():
    """Connect to MongoDB on startup"""
    print(f"🔌 Connecting to MongoDB at {settings.MONGODB_URI}...")
    mongo.client = AsyncIOMotorClient(settings.MONGODB_URI)
    mongo.db = mongo.client[settings.MONGODB_DATABASE]
    
    # Create indexes
    await mongo.db.users.create_index("email", unique=True)
    await mongo.db.users.create_index("google_id", unique=True)
    await mongo.db.sessions.create_index("user_id")
    await mongo.db.sessions.create_index("created_at")
    
    print(f"✅ Connected to MongoDB database: {settings.MONGODB_DATABASE}")


async def close_mongo_connection():
    """Close MongoDB connection on shutdown"""
    if mongo.client:
        mongo.client.close()
        print("🔌 MongoDB connection closed")


def get_database():
    """Get database instance"""
    return mongo.db


# Pydantic Models for MongoDB Documents
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, field=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")


# User Model (Google OAuth)
class UserModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    google_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# Chat Session Model
class ChatSessionModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    title: str = "New Chat"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# Chat Message Model
class ChatMessageModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    session_id: str
    role: str  # 'user' or 'assistant'
    content: str
    code_output: Optional[str] = None
    workflow_data: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# Database Operations
class UserDB:
    """User database operations (Google OAuth)"""
    
    @staticmethod
    async def create_google_user(google_id: str, email: str, name: str, picture: str = None) -> dict:
        """Create a new user from Google OAuth"""
        db = get_database()
        
        user_doc = {
            "google_id": google_id,
            "email": email.lower(),
            "name": name,
            "picture": picture,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.users.insert_one(user_doc)
        user_doc["_id"] = str(result.inserted_id)
        return user_doc
    
    @staticmethod
    async def get_user_by_google_id(google_id: str) -> Optional[dict]:
        """Get user by Google ID"""
        db = get_database()
        user = await db.users.find_one({"google_id": google_id})
        if user:
            user["_id"] = str(user["_id"])
        return user
    
    @staticmethod
    async def get_user_by_email(email: str) -> Optional[dict]:
        """Get user by email"""
        db = get_database()
        user = await db.users.find_one({"email": email.lower()})
        if user:
            user["_id"] = str(user["_id"])
        return user
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[dict]:
        """Get user by ID"""
        db = get_database()
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user["_id"] = str(user["_id"])
        return user
    
    @staticmethod
    async def update_user(user_id: str, name: str = None, picture: str = None) -> None:
        """Update user profile"""
        db = get_database()
        update_data = {"updated_at": datetime.utcnow()}
        if name:
            update_data["name"] = name
        if picture:
            update_data["picture"] = picture
        
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )


class SessionDB:
    """Chat session database operations"""
    
    @staticmethod
    async def generate_title_from_chat(prompt: str) -> str:
        """Generate a brief title for a session based on the first user prompt using AI"""
        import httpx
        from config import key_pool
        
        try:
            api_key = key_pool.get_key()
            # Use Groq to generate a concise title
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {
                                "role": "system",
                                "content": "Generate a very brief title (3-6 words max) for a coding conversation based on the user's request. Just return the title, nothing else. No quotes or punctuation at the end."
                            },
                            {
                                "role": "user", 
                                "content": f"User's request: {prompt[:500]}"
                            }
                        ],
                        "temperature": 0.3,
                        "max_tokens": 30
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    title = data["choices"][0]["message"]["content"].strip()
                    # Clean up the title
                    title = title.strip('"').strip("'").strip()
                    return title[:50] if title else "New Chat"
        except Exception as e:
            print(f"Error generating title: {e}")
        
        # Fallback: Use first few words of prompt
        words = prompt.split()[:5]
        return " ".join(words)[:50] if words else "New Chat"
    
    @staticmethod
    async def create_session(user_id: str, title: str = "New Chat") -> dict:
        """Create a new chat session"""
        db = get_database()
        
        session_doc = {
            "user_id": user_id,
            "title": title,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.sessions.insert_one(session_doc)
        session_doc["_id"] = str(result.inserted_id)
        return session_doc
    
    @staticmethod
    async def get_user_sessions(user_id: str, limit: int = 20) -> List[dict]:
        """Get all sessions for a user"""
        db = get_database()
        
        cursor = db.sessions.find({"user_id": user_id}).sort("updated_at", -1).limit(limit)
        sessions = []
        async for session in cursor:
            session["_id"] = str(session["_id"])
            # Get message count
            msg_count = await db.messages.count_documents({"session_id": str(session["_id"]), "role": "user"})
            session["message_count"] = msg_count
            sessions.append(session)
        
        return sessions
    
    @staticmethod
    async def get_session(session_id: str) -> Optional[dict]:
        """Get a specific session"""
        db = get_database()
        session = await db.sessions.find_one({"_id": ObjectId(session_id)})
        if session:
            session["_id"] = str(session["_id"])
        return session
    
    @staticmethod
    async def update_session_title(session_id: str, title: str):
        """Update session title"""
        db = get_database()
        await db.sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"title": title, "updated_at": datetime.utcnow()}}
        )

    @staticmethod
    async def update_session_project_name(session_id: str, project_name: str):
        """Save the AI-generated project base name (e.g. 'todo-app') to the session"""
        db = get_database()
        await db.sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"project_name": project_name, "updated_at": datetime.utcnow()}}
        )
    
    @staticmethod
    async def delete_session(session_id: str):
        """Delete a session and its messages"""
        db = get_database()
        await db.messages.delete_many({"session_id": session_id})
        await db.sessions.delete_one({"_id": ObjectId(session_id)})


class MessageDB:
    """Chat message database operations"""
    
    @staticmethod
    async def add_message(session_id: str, role: str, content: str, 
                          code_output: str = None, workflow_data: dict = None) -> dict:
        """Add a message to a session"""
        db = get_database()
        
        message_doc = {
            "session_id": session_id,
            "role": role,
            "content": content,
            "code_output": code_output,
            "workflow_data": workflow_data,
            "created_at": datetime.utcnow()
        }
        
        result = await db.messages.insert_one(message_doc)
        message_doc["_id"] = str(result.inserted_id)
        
        # Update session timestamp
        await db.sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
        
        return message_doc
    
    @staticmethod
    async def get_session_messages(session_id: str) -> List[dict]:
        """Get all messages for a session"""
        db = get_database()
        
        cursor = db.messages.find({"session_id": session_id}).sort("created_at", 1)
        messages = []
        async for msg in cursor:
            msg["_id"] = str(msg["_id"])
            messages.append(msg)
        
        return messages
