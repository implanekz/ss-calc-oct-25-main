"""
Authentication endpoints for Social Security K.I.N.D. Platform
Handles: signup, login, logout, email verification, password reset
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from supabase import Client
from datetime import date
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.supabase import get_supabase_client
import traceback

# Create FastAPI router
router = APIRouter(prefix="/api/auth", tags=["auth"])

def get_supabase() -> Client:
    """Get Supabase client lazily"""
    return get_supabase_client()

# Pydantic models for request/response
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    firstName: str
    lastName: str
    dateOfBirth: date  # Changed to date type for automatic validation
    relationshipStatus: str
    
    @field_validator('dateOfBirth')
    @classmethod
    def validate_date_of_birth(cls, v):
        """Ensure date of birth is valid"""
        if v > date.today():
            raise ValueError('Date of birth cannot be in the future')
        if v.year < 1900:
            raise ValueError('Date of birth must be after 1900')
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr

class UpdatePasswordRequest(BaseModel):
    password: str = Field(..., min_length=6)

class AuthResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    user: Optional[dict] = None
    session: Optional[dict] = None

# ============================================
# POST /api/auth/signup
# ============================================
@router.post('/signup', response_model=AuthResponse)
async def signup(request: SignupRequest):
    """
    Create a new user account
    """
    try:
        supabase = get_supabase()
        
        # Validate relationship status
        if request.relationshipStatus not in ['single', 'married', 'divorced', 'widowed']:
            raise HTTPException(status_code=400, detail='Invalid relationship status')
        
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            'email': request.email,
            'password': request.password
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail='Failed to create user account')
        
        user_id = auth_response.user.id
        
        # Create profile in profiles table
        profile_response = supabase.table('profiles').insert({
            'id': user_id,
            'first_name': request.firstName,
            'last_name': request.lastName,
            'date_of_birth': request.dateOfBirth.isoformat(),  # Convert date to string
            'relationship_status': request.relationshipStatus
        }).execute()
        
        if not profile_response.data:
            raise HTTPException(status_code=400, detail='Failed to create user profile')
        
        # Create default calculator preferences
        supabase.table('calculator_preferences').insert({
            'user_id': user_id,
            'inflation_rate': 0.025
        }).execute()
        
        return AuthResponse(
            success=True,
            message='Account created successfully',
            user={
                'id': user_id,
                'email': auth_response.user.email
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# POST /api/auth/login
# ============================================
@router.post('/login', response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login user
    """
    try:
        supabase = get_supabase()
        auth_response = supabase.auth.sign_in_with_password({
            'email': request.email,
            'password': request.password
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=401, detail='Invalid email or password')
        
        return AuthResponse(
            success=True,
            user={
                'id': auth_response.user.id,
                'email': auth_response.user.email
            },
            session={
                'access_token': auth_response.session.access_token,
                'refresh_token': auth_response.session.refresh_token
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# POST /api/auth/logout
# ============================================
@router.post('/logout', response_model=AuthResponse)
async def logout(authorization: Optional[str] = Header(None)):
    """
    Logout user
    """
    try:
        supabase = get_supabase()
        if not authorization:
            raise HTTPException(status_code=401, detail='Authorization token required')
        
        # Extract token from "Bearer <token>" format
        token = authorization.split(' ')[1] if ' ' in authorization else authorization
        
        supabase.auth.sign_out()
        
        return AuthResponse(
            success=True,
            message='Logged out successfully'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Logout error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# POST /api/auth/reset-password
# ============================================
@router.post('/reset-password', response_model=AuthResponse)
async def reset_password(request: ResetPasswordRequest):
    """
    Request password reset
    """
    try:
        supabase = get_supabase()
        # Supabase will send password reset email
        response = supabase.auth.reset_password_for_email(request.email)
        
        return AuthResponse(
            success=True,
            message='Password reset email sent'
        )
        
    except Exception as e:
        print(f"Reset password error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# POST /api/auth/update-password
# ============================================
@router.post('/update-password', response_model=AuthResponse)
async def update_password(
    request: UpdatePasswordRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Update password (for authenticated users)
    """
    try:
        supabase = get_supabase()
        if not authorization:
            raise HTTPException(status_code=401, detail='Authorization token required')
        
        # Extract token
        token = authorization.split(' ')[1] if ' ' in authorization else authorization
        
        # Update password in Supabase Auth
        response = supabase.auth.update_user({
            'password': request.password
        })
        
        return AuthResponse(
            success=True,
            message='Password updated successfully'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update password error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# GET /api/auth/user
# ============================================
@router.get('/user')
async def get_user(authorization: Optional[str] = Header(None)):
    """
    Get current authenticated user
    """
    try:
        supabase = get_supabase()
        if not authorization:
            raise HTTPException(status_code=401, detail='Authorization token required')
        
        # Extract token
        token = authorization.split(' ')[1] if ' ' in authorization else authorization
        
        user = supabase.auth.get_user(token)
        
        if not user:
            raise HTTPException(status_code=404, detail='User not found')
        
        return {
            'user': {
                'id': user.id,
                'email': user.email,
                'user_metadata': user.user_metadata
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get user error: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))
