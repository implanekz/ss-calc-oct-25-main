"""
Children management endpoints for Ret1re Platform
Handles: create, read, delete children records
"""
from flask import Blueprint, request, jsonify
from supabase import Client
from config.supabase import get_supabase_client
import traceback

children_bp = Blueprint('children', __name__, url_prefix='/api/children')
supabase: Client = get_supabase_client()

def get_user_id_from_token(request):
    """Extract and validate user ID from authorization token"""
    try:
        token = request.headers.get('Authorization', '').split(' ')[1] if 'Authorization' in request.headers else None
        if not token:
            return None
        user = supabase.auth.get_user(token)
        return user.user.id if user and user.user else None
    except Exception:
        return None

# ============================================
# GET /api/children
# ============================================
@children_bp.route('', methods=['GET'])
def get_children():
    """
    Get all children for current user
    Headers: Authorization: Bearer <token>
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        response = supabase.table('children').select('*').eq('user_id', user_id).execute()
        
        return jsonify({
            'children': response.data if response.data else []
        }), 200
        
    except Exception as e:
        print(f"Get children error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================
# POST /api/children
# ============================================
@children_bp.route('', methods=['POST'])
def create_child():
    """
    Create a new child record
    Headers: Authorization: Bearer <token>
    Body: {
      dateOfBirth: string (YYYY-MM-DD)
    }
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        
        if not data.get('dateOfBirth'):
            return jsonify({'error': 'dateOfBirth required'}), 400
        
        child_data = {
            'user_id': user_id,
            'date_of_birth': data['dateOfBirth']
        }
        
        response = supabase.table('children').insert(child_data).execute()
        
        if not response.data:
            return jsonify({'error': 'Failed to create child record'}), 400
        
        return jsonify({
            'success': True,
            'child': response.data[0]
        }), 201
        
    except Exception as e:
        print(f"Create child error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ============================================
# PUT /api/children/:id
# ============================================
@children_bp.route('/<child_id>', methods=['PUT'])
def update_child(child_id):
    """
    Update a child record
    Headers: Authorization: Bearer <token>
    Body: {
      dateOfBirth?: string (YYYY-MM-DD)
    }
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Verify user owns this child record
        child_response = supabase.table('children').select('user_id').eq('id', child_id).single().execute()
        if not child_response.data or child_response.data['user_id'] != user_id:
            return jsonify({'error': 'Child not found'}), 404
        
        data = request.get_json()
        
        update_data = {}
        if 'dateOfBirth' in data:
            update_data['date_of_birth'] = data['dateOfBirth']
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        response = supabase.table('children').update(update_data).eq('id', child_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Failed to update child'}), 400
        
        return jsonify({
            'success': True,
            'child': response.data[0]
        }), 200
        
    except Exception as e:
        print(f"Update child error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================
# DELETE /api/children/:id
# ============================================
@children_bp.route('/<child_id>', methods=['DELETE'])
def delete_child(child_id):
    """
    Delete a child record
    Headers: Authorization: Bearer <token>
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Verify user owns this child record
        child_response = supabase.table('children').select('user_id').eq('id', child_id).single().execute()
        if not child_response.data or child_response.data['user_id'] != user_id:
            return jsonify({'error': 'Child not found'}), 404
        
        supabase.table('children').delete().eq('id', child_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Child deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"Delete child error: {str(e)}")
        return jsonify({'error': str(e)}), 500
