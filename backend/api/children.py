"""
Children management endpoints for Ret1re Platform
Handles: create, read, delete children records
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from supabase import Client
from config.supabase import get_supabase_client
import traceback

router = APIRouter(prefix="/api/children", tags=["children"])
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
# GET /api/children
# ============================================
@router.get("")
async def get_children(request: Request):
    """
    Get all children for current user
    """
    try:
        user_id = get_user_id_from_token_sync(request)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        response = supabase.table('children').select('*').eq('user_id', user_id).execute()
        
        return {
            'children': response.data if response.data else []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get children error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# POST /api/children
# ============================================
@router.post("")
async def create_child(request: Request):
    """
    Create a new child record
    """
    try:
        user_id = get_user_id_from_token_sync(request)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        data = await request.json()
        
        if not data.get('dateOfBirth'):
            raise HTTPException(status_code=400, detail="dateOfBirth required")
        
        child_data = {
            'user_id': user_id,
            'date_of_birth': data['dateOfBirth'],
            'is_disabled': data.get('isDisabled', False)
        }
        
        response = supabase.table('children').insert(child_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create child record")
        
        return {
            'success': True,
            'child': response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create child error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# PUT /api/children/:id
# ============================================
@router.put("/{child_id}")
async def update_child(child_id: str, request: Request):
    """
    Update a child record
    """
    try:
        user_id = get_user_id_from_token_sync(request)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Verify user owns this child record
        child_response = supabase.table('children').select('user_id').eq('id', child_id).single().execute()
        if not child_response.data or child_response.data['user_id'] != user_id:
            raise HTTPException(status_code=404, detail="Child not found")
        
        data = await request.json()
        
        update_data = {}
        if 'dateOfBirth' in data:
            update_data['date_of_birth'] = data['dateOfBirth']
        
        if 'isDisabled' in data:
            update_data['is_disabled'] = data['isDisabled']
        if 'is_disabled' in data:
            update_data['is_disabled'] = data['is_disabled']
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        response = supabase.table('children').update(update_data).eq('id', child_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to update child")
        
        return {
            'success': True,
            'child': response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update child error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# DELETE /api/children/:id
# ============================================
@router.delete("/{child_id}")
async def delete_child(child_id: str, request: Request):
    """
    Delete a child record
    """
    try:
        user_id = get_user_id_from_token_sync(request)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Verify user owns this child record
        child_response = supabase.table('children').select('user_id').eq('id', child_id).single().execute()
        if not child_response.data or child_response.data['user_id'] != user_id:
            raise HTTPException(status_code=404, detail="Child not found")
        
        supabase.table('children').delete().eq('id', child_id).execute()
        
        return {
            'success': True,
            'message': 'Child deleted successfully'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete child error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
