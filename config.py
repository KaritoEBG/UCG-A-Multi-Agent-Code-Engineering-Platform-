# Configuration management with environment variables
import os
import time
import threading
from dotenv import load_dotenv

# Load .env file

load_dotenv()


class GroqKeyPool:
    """Thread-safe round-robin API key pool with rate-limit tracking.
    
    Parses comma-separated keys from GROQ_API_KEY env var 
    and rotates through them on each get_key() call.
    Keys that hit rate limits are temporarily blacklisted for 60s.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        raw = os.getenv("GROQ_API_KEY", "")
        # Split on comma, strip whitespace, remove empty strings
        self._keys = [k.strip() for k in raw.split(",") if k.strip()]
        self._index = 0
        self._rate_limited = {}  # key -> timestamp when limit expires
        self._cooldown = 60  # seconds to blacklist a rate-limited key
        self._lock = threading.Lock()
        self._initialized = True
        
        print(f"🔑 GroqKeyPool initialized with {len(self._keys)} API keys")
    
    @property
    def total_keys(self):
        return len(self._keys)
    
    def get_key(self) -> str:
        """Get the next available API key (round-robin, skipping rate-limited keys)."""
        with self._lock:
            if not self._keys:
                return ""
            
            now = time.time()
            # Try every key once before giving up
            for _ in range(len(self._keys)):
                key = self._keys[self._index % len(self._keys)]
                self._index = (self._index + 1) % len(self._keys)
                
                # Check if this key is rate-limited
                if key in self._rate_limited:
                    if now < self._rate_limited[key]:
                        continue  # Still in cooldown, skip
                    else:
                        del self._rate_limited[key]  # Cooldown expired
                
                return key
            
            # All keys are rate-limited — return the one that expires soonest
            soonest_key = min(self._rate_limited, key=self._rate_limited.get)
            print(f"⚠️ All {len(self._keys)} keys are rate-limited! Using soonest-to-expire key.")
            return soonest_key
    
    def mark_rate_limited(self, key: str):
        """Mark a key as rate-limited (blacklisted for cooldown period)."""
        with self._lock:
            self._rate_limited[key] = time.time() + self._cooldown
            active = len(self._keys) - len(self._rate_limited)
            print(f"🚫 Key ...{key[-8:]} rate-limited for {self._cooldown}s ({active}/{len(self._keys)} keys available)")
    
    def get_status(self) -> dict:
        """Get pool status for monitoring."""
        now = time.time()
        with self._lock:
            active_limited = {k: v for k, v in self._rate_limited.items() if now < v}
            return {
                "total_keys": len(self._keys),
                "available_keys": len(self._keys) - len(active_limited),
                "rate_limited_keys": len(active_limited),
                "current_index": self._index,
            }


# Singleton instance
key_pool = GroqKeyPool()


class Settings:
    """Application settings loaded from environment variables"""
    
    # API Keys for AI Agents — first key for backward compatibility
    GROQ_API_KEY: str = key_pool.get_key() if key_pool.total_keys > 0 else ""
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    QWEN_API_KEY: str = os.getenv("QWEN_API_KEY", "")
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    # MongoDB
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DATABASE: str = os.getenv("MONGODB_DATABASE", "uber_code_generator")
    
    # Server
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "jwt-secret-key")
    PORT: int = int(os.getenv("PORT", "5000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # AI Model Configuration
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    MISTRAL_MODEL: str = "mistral-large-latest"
    QWEN_MODEL: str = " "
    
    @classmethod
    def get_api_key(cls, provider: str) -> str:
        """Get API key for a specific provider"""
        keys = {
            "groq": key_pool.get_key(),  # Rotated key
            "mistral": cls.MISTRAL_API_KEY,
            "qwen": cls.QWEN_API_KEY,
        }
        return keys.get(provider.lower(), "")
    
    @classmethod
    def is_valid_key(cls, key: str) -> bool:
        """Check if an API key is valid (non-empty and reasonable length)"""
        return bool(key) and len(key) > 10 and key != "your-groq-api-key-here"


settings = Settings()

