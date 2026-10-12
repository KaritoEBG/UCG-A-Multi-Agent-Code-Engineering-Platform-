# Google OAuth Authentication
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
import httpx

from config import settings
from database import UserDB

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer()


# JWT Configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 1 week


# Request/Response Models
class GoogleAuthRequest(BaseModel):
    """Google OAuth token from frontend"""
    credential: str  # Google ID token from frontend


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: str


# JWT Utilities
def create_access_token(user_id: str) -> str:
    """Create a JWT access token"""
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode = {
        "sub": user_id,
        "exp": expire
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[str]:
    """Decode JWT token and return user_id"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


async def verify_google_token(credential: str) -> dict:
    """Verify Google ID token and return user info"""
    try:
        # Verify with Google's API
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
            )
            
            if response.status_code != 200:
                error_detail = response.text
                print(f"❌ Google token verification failed: {response.status_code} - {error_detail}")
                raise HTTPException(status_code=401, detail=f"Invalid Google token: {error_detail}")
            
            google_user = response.json()
            
            print(f"✅ Google token verified for: {google_user.get('email')}")
            print(f"   Token audience (aud): {google_user.get('aud')}")
            print(f"   Expected client ID:   {settings.GOOGLE_CLIENT_ID}")
            
            # Verify the token is for our app
            if google_user.get("aud") != settings.GOOGLE_CLIENT_ID:
                print(f"❌ Audience mismatch! aud={google_user.get('aud')} != {settings.GOOGLE_CLIENT_ID}")
                raise HTTPException(status_code=401, detail="Token not issued for this app")
            
            return {
                "google_id": google_user["sub"],
                "email": google_user["email"],
                "name": google_user.get("name", google_user["email"].split("@")[0]),
                "picture": google_user.get("picture")
            }
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"❌ Google token verification error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to verify Google token: {str(e)}")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    user_id = decode_token(token)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = await UserDB.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))) -> Optional[dict]:
    """Dependency to get current user if authenticated, None otherwise"""
    if not credentials:
        return None
    
    user_id = decode_token(credentials.credentials)
    if not user_id:
        return None
    
    return await UserDB.get_user_by_id(user_id)


# Routes
@router.post("/google", response_model=TokenResponse)
async def google_auth(request: GoogleAuthRequest):
    """
    Authenticate with Google OAuth.
    Frontend sends the Google ID token (credential) received from Google Sign-In.
    """
    # Verify the Google token
    google_user = await verify_google_token(request.credential)
    
    # Check if user exists
    user = await UserDB.get_user_by_google_id(google_user["google_id"])
    
    if not user:
        # Create new user
        user = await UserDB.create_google_user(
            google_id=google_user["google_id"],
            email=google_user["email"],
            name=google_user["name"],
            picture=google_user.get("picture")
        )
    else:
        # Update user info (name/picture might have changed)
        await UserDB.update_user(
            user_id=user["_id"],
            name=google_user["name"],
            picture=google_user.get("picture")
        )
    
    # Generate our app's JWT token
    token = create_access_token(user["_id"])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["_id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "created_at": user["created_at"].isoformat()
        }
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return {
        "id": current_user["_id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "picture": current_user.get("picture"),
        "created_at": current_user["created_at"].isoformat()
    }


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout (frontend should discard the token)"""
    return {"message": "Logged out successfully"}
