"""
Supabase client configuration and initialization
"""
import os
from supabase import create_client, Client
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Initialize Supabase client (optional - can be None if credentials not provided)
supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("WARNING: SUPABASE_URL or SUPABASE_KEY not set. Supabase features will be disabled.")

def get_supabase_client() -> Optional[Client]:
    """Get the Supabase client instance"""
    if supabase is None:
        raise ValueError("Supabase client not initialized. Please set SUPABASE_URL and SUPABASE_KEY environment variables.")
    return supabase
