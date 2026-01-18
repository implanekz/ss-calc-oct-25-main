"""
Partner management endpoints for Ret1re Platform
Handles: create, read, update, delete partners (spouses, ex-spouses, deceased)
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from supabase import Client
from config.supabase import get_supabase_client
import traceback

router = APIRouter(prefix="/api/partners", tags=["partners"])
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
# GET /api/partners
# ============================================
@router.get("")
async def get_partners(request: Request):
    """
    Get all partners for current user
    """
    try:
        user_id = get_user_id_from_token_sync(request)
        if not user_id:
             raise HTTPException(status_code=401, detail="Unauthorized")
        
        response = supabase.table('partners').select('*').eq('user_id', user_id).execute()
        
        return {
            'partners': response.data if response.data else []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get partners error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# POST /api/partners
# ============================================
@router.post("")
async def create_partner(request: Request):
    """
    Create a new partner record
    """
    try:
        user_id = get_user_id_from_token_sync(request)
        if not user_id:
             raise HTTPException(status_code=401, detail="Unauthorized")
        
        data = await request.json()
        
        if not data.get('relationshipType'):
             raise HTTPException(status_code=400, detail="relationshipType required")
        
        relationship_type = data['relationshipType']
        if relationship_type not in ['spouse', 'ex_spouse', 'deceased_spouse']:
             raise HTTPException(status_code=400, detail="Invalid relationshipType")
        
        partner_data = {
            'user_id': user_id,
            'relationship_type': relationship_type,
            'date_of_birth': data.get('dateOfBirth'),
            'first_name': data.get('firstName'),
            'last_name': data.get('lastName'),
            'pia_at_fra': data.get('piaAtFra'),
            'already_receiving_benefits': data.get('alreadyReceivingBenefits', False),
            'current_monthly_benefit': data.get('currentMonthlyBenefit'),
            'filed_age_years': data.get('filedAgeYears'),
            'filed_age_months': data.get('filedAgeMonths'),
            'divorce_date': data.get('divorceDate'),
            'marriage_length_years': data.get('marriageLengthYears'),
            'date_of_death': data.get('dateOfDeath'),
            'email': data.get('email')
        }
        
        response = supabase.table('partners').insert(partner_data).execute()
        
        if not response.data:
             raise HTTPException(status_code=400, detail="Failed to create partner")
        
        return {
            'success': True,
            'partner': response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create partner error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# PUT /api/partners/:id
# ============================================
@router.put("/{partner_id}")
async def update_partner(partner_id: str, request: Request):
    """
    Update a partner record
    """
    try:
        user_id = get_user_id_from_token_sync(request)
        if not user_id:
             raise HTTPException(status_code=401, detail="Unauthorized")
        
        data = await request.json()
        
        # Build update object
        update_data = {}
        
        if 'relationshipType' in data:
            update_data['relationship_type'] = data['relationshipType']
        if 'dateOfBirth' in data:
            update_data['date_of_birth'] = data['dateOfBirth']
        if 'firstName' in data:
            update_data['first_name'] = data['firstName']
        if 'lastName' in data:
            update_data['last_name'] = data['lastName']
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
        if 'divorceDate' in data:
            update_data['divorce_date'] = data['divorceDate']
        if 'marriageLengthYears' in data:
            update_data['marriage_length_years'] = data['marriageLengthYears']
        if 'dateOfDeath' in data:
            update_data['date_of_death'] = data['dateOfDeath']
        if 'email' in data:
            update_data['email'] = data['email']
        
        if not update_data:
             raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # Verify user owns this partner record
        partner_response = supabase.table('partners').select('user_id').eq('id', partner_id).single().execute()
        if not partner_response.data or partner_response.data['user_id'] != user_id:
             raise HTTPException(status_code=404, detail="Partner not found")
        
        response = supabase.table('partners').update(update_data).eq('id', partner_id).execute()
        
        if not response.data:
             raise HTTPException(status_code=400, detail="Failed to update partner")
        
        return {
            'success': True,
            'partner': response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update partner error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# DELETE /api/partners/:id
# ============================================
@router.delete("/{partner_id}")
async def delete_partner(partner_id: str, request: Request):
    """
    Delete a partner record
    """
    try:
        user_id = get_user_id_from_token_sync(request)
        if not user_id:
             raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Verify user owns this partner record
        partner_response = supabase.table('partners').select('user_id').eq('id', partner_id).single().execute()
        if not partner_response.data or partner_response.data['user_id'] != user_id:
             raise HTTPException(status_code=404, detail="Partner not found")
        
        supabase.table('partners').delete().eq('id', partner_id).execute()
        
        return {
            'success': True,
            'message': 'Partner deleted successfully'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete partner error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
