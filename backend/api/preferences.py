"""
Calculator preferences endpoints for Ret1re Platform
Handles: get and update calculator preferences (auto-save functionality)
"""
from flask import Blueprint, request, jsonify
from supabase import Client
from config.supabase import get_supabase_client
import traceback

preferences_bp = Blueprint('preferences', __name__, url_prefix='/api/preferences')
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
# GET /api/preferences
# ============================================
@preferences_bp.route('', methods=['GET'])
def get_preferences():
    """
    Get calculator preferences for current user
    Headers: Authorization: Bearer <token>
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        response = supabase.table('calculator_preferences').select('*').eq('user_id', user_id).single().execute()
        
        if not response.data:
            return jsonify({'error': 'Preferences not found'}), 404
        
        return jsonify({
            'preferences': response.data
        }), 200
        
    except Exception as e:
        print(f"Get preferences error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================
# PUT /api/preferences
# ============================================
@preferences_bp.route('', methods=['PUT'])
def update_preferences():
    """
    Update calculator preferences (auto-save endpoint)
    Headers: Authorization: Bearer <token>
    Body: {
      inflationRate?: number,
      spousePreferredClaimingAgeYears?: number,
      spousePreferredClaimingAgeMonths?: number
    }
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        
        # Build update object
        update_data = {}
        
        if 'inflationRate' in data:
            update_data['inflation_rate'] = data['inflationRate']
        if 'spousePreferredClaimingAgeYears' in data:
            update_data['spouse_preferred_claiming_age_years'] = data['spousePreferredClaimingAgeYears']
        if 'spousePreferredClaimingAgeMonths' in data:
            update_data['spouse_preferred_claiming_age_months'] = data['spousePreferredClaimingAgeMonths']
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        response = supabase.table('calculator_preferences').update(update_data).eq('user_id', user_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Failed to update preferences'}), 400
        
        return jsonify({
            'success': True,
            'preferences': response.data[0]
        }), 200
        
    except Exception as e:
        print(f"Update preferences error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
