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
        
        # Flatten calculator_states to top-level keys for frontend compatibility
        preferences = {
            'inflation_rate': response.data.get('inflation_rate'),
            'spouse_preferred_claiming_age_years': response.data.get('spouse_preferred_claiming_age_years'),
            'spouse_preferred_claiming_age_months': response.data.get('spouse_preferred_claiming_age_months')
        }
        
        # Add calculator states as top-level keys
        calculator_states = response.data.get('calculator_states') or {}
        if calculator_states:
            preferences.update(calculator_states)
        
        return jsonify({
            'preferences': preferences
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
      spousePreferredClaimingAgeMonths?: number,
      showMeTheMoney?: object,  // Calculator-specific state
      pia?: object,             // Calculator-specific state
      divorced?: object,        // Calculator-specific state
      widow?: object            // Calculator-specific state
    }
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        
        # Build update object for standard fields
        update_data = {}
        
        # Known preference fields (stored directly in columns)
        known_fields = {
            'inflationRate': 'inflation_rate',
            'spousePreferredClaimingAgeYears': 'spouse_preferred_claiming_age_years',
            'spousePreferredClaimingAgeMonths': 'spouse_preferred_claiming_age_months'
        }
        
        for frontend_key, db_key in known_fields.items():
            if frontend_key in data:
                update_data[db_key] = data[frontend_key]
        
        # Calculator state fields (stored in calculator_states JSONB)
        calculator_state_keys = ['showMeTheMoney', 'pia', 'divorced', 'widow']
        calculator_states_update = {}
        
        for key in calculator_state_keys:
            if key in data:
                # If value is None, we're clearing that calculator state
                calculator_states_update[key] = data[key]
        
        # If we have calculator states to update, fetch current states and merge
        if calculator_states_update:
            # Get current calculator_states
            current_response = supabase.table('calculator_preferences').select('calculator_states').eq('user_id', user_id).single().execute()
            current_states = current_response.data.get('calculator_states') or {} if current_response.data else {}
            
            # Merge new states with current states
            merged_states = {**current_states, **calculator_states_update}
            update_data['calculator_states'] = merged_states
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        response = supabase.table('calculator_preferences').update(update_data).eq('user_id', user_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Failed to update preferences'}), 400
        
        # Format response to match GET endpoint structure
        updated_prefs = response.data[0]
        preferences = {
            'inflation_rate': updated_prefs.get('inflation_rate'),
            'spouse_preferred_claiming_age_years': updated_prefs.get('spouse_preferred_claiming_age_years'),
            'spouse_preferred_claiming_age_months': updated_prefs.get('spouse_preferred_claiming_age_months')
        }
        
        # Add calculator states as top-level keys
        calculator_states = updated_prefs.get('calculator_states') or {}
        if calculator_states:
            preferences.update(calculator_states)
        
        return jsonify({
            'success': True,
            'preferences': preferences
        }), 200
        
    except Exception as e:
        print(f"Update preferences error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
