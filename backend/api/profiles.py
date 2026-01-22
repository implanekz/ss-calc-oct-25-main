"""
Profile management endpoints for Ret1re Platform
Handles: get profile, update profile, get full profile with relations
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from supabase import Client
from config.supabase import get_supabase_client
import traceback
from datetime import datetime, timezone

router = APIRouter(prefix="/api/profiles", tags=["profiles"])
supabase: Client = get_supabase_client()

def get_user_id_from_token_sync(request: Request):
    """Extract and validate user ID from authorization token"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
        
        token = auth_header.split(' ')[1]
        user = supabase.auth.get_user(token)
        return user.user.id if user and user.user else None
    except Exception as e:
        print(f"Token extraction error: {e}")
        return None

# ============================================
# GET /api/profiles/me
# ============================================
@router.get("/me")
async def get_profile(request: Request):
    """
    Get current user's profile
    """
    try:
        user_id = get_user_id_from_token_sync(request)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        response = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return {"profile": response.data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get profile error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# GET /api/profiles/me/full
# ============================================
@router.get("/me/full")
async def get_full_profile(request: Request):
    """
    Get current user's profile with all relations (partner, children, preferences)
    Auto-creates profile if one doesn't exist (for users created via Supabase Auth directly)
    """
    try:
        user_id = get_user_id_from_token_sync(request)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Get main profile
        profile_response = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
        
        if not profile_response.data:
            # Profile not found - auto-create one with placeholder values
            # These will be updated during onboarding
            print(f"[profiles] Profile not found for user {user_id}, creating placeholder profile")
            
            try:
                create_response = supabase.table('profiles').insert({
                    'id': user_id,
                    'first_name': '',  # Will be set during onboarding
                    'last_name': '',   # Will be set during onboarding
                    'date_of_birth': '1970-01-01',  # Placeholder, will be updated
                    'relationship_status': 'single'  # Default, will be updated
                }).execute()
                
                if create_response.data:
                    profile = create_response.data[0]
                    print(f"[profiles] Created placeholder profile for user {user_id}")
                else:
                    raise HTTPException(status_code=500, detail="Failed to create profile")
            except Exception as create_error:
                print(f"[profiles] Error creating profile: {create_error}")
                raise HTTPException(status_code=500, detail=f"Failed to create profile: {str(create_error)}")
        else:
            profile = profile_response.data
        
        # Get partner(s)
        partners_response = supabase.table('partners').select('*').eq('user_id', user_id).execute()
        partners = partners_response.data if partners_response.data else []
        
        # Get children
        children_response = supabase.table('children').select('*').eq('user_id', user_id).execute()
        children = children_response.data if children_response.data else []
        
        # Get preferences (create if not exists)
        prefs_response = supabase.table('calculator_preferences').select('*').eq('user_id', user_id).single().execute()
        if not prefs_response.data:
            # Create default preferences
            try:
                prefs_create = supabase.table('calculator_preferences').insert({
                    'user_id': user_id,
                    'inflation_rate': 0.025
                }).execute()
                preferences = prefs_create.data[0] if prefs_create.data else {}
            except:
                preferences = {}
        else:
            preferences = prefs_response.data
        
        return {
            'profile': profile,
            'partners': partners,
            'children': children,
            'preferences': preferences
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get full profile error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# PUT /api/profiles/me
# ============================================
@router.put("/me")
async def update_profile(request: Request):
    """
    Update current user's profile (DOB cannot be changed)
    """
    try:
        user_id = get_user_id_from_token_sync(request)
        if not user_id:
             raise HTTPException(status_code=401, detail="Unauthorized")
        
        data = await request.json()
        
        # Build update object - only include provided fields
        update_data = {}
        
        if 'firstName' in data:
            update_data['first_name'] = data['firstName']
        if 'first_name' in data:
            update_data['first_name'] = data['first_name']
        if 'lastName' in data:
            update_data['last_name'] = data['lastName']
        if 'last_name' in data:
            update_data['last_name'] = data['last_name']
        if 'relationshipStatus' in data:
            update_data['relationship_status'] = data['relationshipStatus']
        if 'relationship_status' in data:
            update_data['relationship_status'] = data['relationship_status']
        if 'dateOfBirth' in data:
            update_data['date_of_birth'] = data['dateOfBirth']
        if 'date_of_birth' in data:
            update_data['date_of_birth'] = data['date_of_birth']
        if 'piaAtFra' in data:
            update_data['pia_at_fra'] = data['piaAtFra']
        if 'alreadyReceivingBenefits' in data:
            update_data['already_receiving_benefits'] = data['alreadyReceivingBenefits']
        if 'currentMonthlyBenefit' in data:
            update_data['current_monthly_benefit'] = data['currentMonthlyBenefit']
        if 'filedAgeYears' in data:
            update_data['filed_age_years'] = data['filedAgeYears']
        if 'filedAgeMonths' in data:
            update_data['filed_age_months'] = data['filedAgeMonths']
        if 'preferredClaimingAgeYears' in data:
            update_data['preferred_claiming_age_years'] = data['preferredClaimingAgeYears']
        if 'preferredClaimingAgeMonths' in data:
            update_data['preferred_claiming_age_months'] = data['preferredClaimingAgeMonths']
            
        # Extended History Fields
        if 'everDivorced' in data:
            update_data['ever_divorced'] = data['everDivorced']
        if 'ever_divorced' in data:
            update_data['ever_divorced'] = data['ever_divorced']
            
        if 'everWidowed' in data:
            update_data['ever_widowed'] = data['everWidowed']
        if 'ever_widowed' in data:
            update_data['ever_widowed'] = data['ever_widowed']
            
        if 'divorceCount' in data:
            update_data['divorce_count'] = data['divorceCount']
        if 'divorce_count' in data:
            update_data['divorce_count'] = data['divorce_count']
            
        if 'widowCount' in data:
            update_data['widow_count'] = data['widowCount']
        if 'widow_count' in data:
            update_data['widow_count'] = data['widow_count']
            
        # Disability Status
        if 'isDisabled' in data:
            update_data['is_disabled'] = data['isDisabled']
        if 'is_disabled' in data:
            update_data['is_disabled'] = data['is_disabled']
        
        # Note: dateOfBirth/date_of_birth is handled above with the other basic profile fields
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        print(f"DEBUG: update_profile for user_id: {user_id}")
        
        response = supabase.table('profiles').update(update_data).eq('id', user_id).execute()
        
        print(f"DEBUG: update response data: {response.data}")
        
        if not response.data:
            # Fallback: Try UPSERT if update failed (maybe profile missing?)
            print("DEBUG: Update returned empty, trying UPSERT")
            update_data['id'] = user_id
            response = supabase.table('profiles').upsert(update_data).execute()
            print(f"DEBUG: Upsert response data: {response.data}")
            
            if not response.data:
                 raise HTTPException(status_code=400, detail="Failed to update profile")
        
        return {
            'success': True,
            'profile': response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update profile error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# POST /api/profiles/me/onboarding-complete
# ============================================
@router.post("/me/onboarding-complete")
async def mark_onboarding_complete(request: Request):
    """
    Mark onboarding as completed for the user
    """
    try:
        user_id = get_user_id_from_token_sync(request)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        now = datetime.now(timezone.utc).isoformat()
        
        response = supabase.table('profiles').update({
            'onboarding_completed_at': now
        }).eq('id', user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to update profile")
        
        return {
            'success': True,
            'message': 'Onboarding marked complete'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Mark onboarding complete error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
