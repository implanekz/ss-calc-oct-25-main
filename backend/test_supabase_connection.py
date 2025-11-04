#!/usr/bin/env python3
"""
Test script to verify Supabase connection with new API keys
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from config.supabase import get_supabase_client, SUPABASE_URL, SUPABASE_KEY

def test_connection():
    """Test the Supabase connection"""
    print("=" * 60)
    print("SUPABASE CONNECTION TEST")
    print("=" * 60)
    
    # Check environment variables
    print("\n1. Checking environment variables...")
    print(f"   SUPABASE_URL: {SUPABASE_URL}")
    if SUPABASE_KEY:
        # Show first 20 chars and last 10 chars for verification
        key_preview = f"{SUPABASE_KEY[:20]}...{SUPABASE_KEY[-10:]}"
        print(f"   SUPABASE_KEY: {key_preview}")
        print(f"   Key format: {'JWT (eyJ...)' if SUPABASE_KEY.startswith('eyJ') else 'Legacy format'}")
    else:
        print("   SUPABASE_KEY: NOT SET")
        return False
    
    # Test client initialization
    print("\n2. Testing Supabase client initialization...")
    try:
        client = get_supabase_client()
        print("   ✓ Client initialized successfully")
    except Exception as e:
        print(f"   ✗ Client initialization failed: {e}")
        return False
    
    # Test basic connection by listing tables
    print("\n3. Testing database connection...")
    try:
        # Try a simple query - list tables in public schema
        response = client.table('profiles').select('id').limit(1).execute()
        print("   ✓ Database connection successful")
        print(f"   Response status: Success")
        return True
    except Exception as e:
        error_msg = str(e)
        print(f"   ✗ Database query failed: {error_msg}")
        
        # Provide helpful error messages
        if "JWT" in error_msg or "token" in error_msg.lower():
            print("\n   Possible issue: Invalid JWT token")
            print("   - Verify the service_role key is correct")
            print("   - Check if the key has been regenerated in Supabase dashboard")
        elif "relation" in error_msg.lower() or "does not exist" in error_msg.lower():
            print("\n   Note: Connection works, but 'profiles' table doesn't exist yet")
            print("   This is normal if migrations haven't been run")
            return True  # Connection works, just no table yet
        
        return False

if __name__ == "__main__":
    print("\nStarting Supabase connection test...\n")
    
    success = test_connection()
    
    print("\n" + "=" * 60)
    if success:
        print("✓ CONNECTION TEST PASSED")
        print("Your Supabase configuration is working correctly!")
    else:
        print("✗ CONNECTION TEST FAILED")
        print("Please check your Supabase credentials in backend/.env")
    print("=" * 60 + "\n")
    
    sys.exit(0 if success else 1)
