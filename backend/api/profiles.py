"""
Profile management endpoints for Ret1re Platform
Handles: get profile, update profile, get full profile with relations
"""
from flask import Blueprint, request, jsonify
from supabase import Client
from config.supabase import get_supabase_client
import traceback

profiles_bp = Blueprint('profiles', __name__, url_prefix='/api/profiles')
supabase: Client = get_supabase_client()

def get_user_id_from_token(request):
    """Extract and validate user ID from authorization token"""
    try:
        token = request.headers.get('Authorization', '').split(' ')[1] if 'Authorization' in request.headers else None
        if not token:
            return None
        
        user = supabase.auth.get_user(token)
        return user.user.id if user and user.user else None
    except Exception as e:
        return None

# ============================================
# GET /api/profiles/me
# ============================================
@profiles_bp.route('/me', methods=['GET'])
def get_profile():
    """
    Get current user's profile
    Headers: Authorization: Bearer <token>
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        response = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
        
        if not response.data:
            return jsonify({'error': 'Profile not found'}), 404
        
        return jsonify({
            'profile': response.data
        }), 200
        
    except Exception as e:
        print(f"Get profile error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================
# GET /api/profiles/me/full
# ============================================
@profiles_bp.route('/me/full', methods=['GET'])
def get_full_profile():
    """
    Get current user's profile with all relations (partner, children, preferences)
    Headers: Authorization: Bearer <token>
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get main profile
        profile_response = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
        
        if not profile_response.data:
            return jsonify({'error': 'Profile not found'}), 404
        
        profile = profile_response.data
        
        # Get partner(s)
        partners_response = supabase.table('partners').select('*').eq('user_id', user_id).execute()
        partners = partners_response.data if partners_response.data else []
        
        # Get children
        children_response = supabase.table('children').select('*').eq('user_id', user_id).execute()
        children = children_response.data if children_response.data else []
        
        # Get preferences
        prefs_response = supabase.table('calculator_preferences').select('*').eq('user_id', user_id).single().execute()
        preferences = prefs_response.data if prefs_response.data else {}
        
        return jsonify({
            'profile': profile,
            'partners': partners,
            'children': children,
            'preferences': preferences
        }), 200
        
    except Exception as e:
        print(f"Get full profile error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================
# PUT /api/profiles/me
# ============================================
@profiles_bp.route('/me', methods=['PUT'])
def update_profile():
    """
    Update current user's profile (DOB cannot be changed)
    Headers: Authorization: Bearer <token>
    Body: {
      firstName?: string,
      lastName?: string,
      relationshipStatus?: string,
      piaAtFra?: number,
      alreadyReceivingBenefits?: boolean,
      currentMonthlyBenefit?: number,
      filedAgeYears?: number,
      filedAgeMonths?: number,
      preferredClaimingAgeYears?: number,
      preferredClaimingAgeMonths?: number
    }
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        
        # Build update object - only include provided fields
        update_data = {}
        
        if 'firstName' in data:
            update_data['first_name'] = data['firstName']
        if 'lastName' in data:
            update_data['last_name'] = data['lastName']
        if 'relationshipStatus' in data:
            update_data['relationship_status'] = data['relationshipStatus']
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
        
        # Prevent DOB from being changed
        if 'dateOfBirth' in data:
            return jsonify({'error': 'Date of birth cannot be changed'}), 400
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        response = supabase.table('profiles').update(update_data).eq('id', user_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Failed to update profile'}), 400
        
        return jsonify({
            'success': True,
            'profile': response.data[0]
        }), 200
        
    except Exception as e:
        print(f"Update profile error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ============================================
# POST /api/profiles/me/onboarding-complete
# ============================================
@profiles_bp.route('/me/onboarding-complete', methods=['POST'])
def mark_onboarding_complete():
    """
    Mark onboarding as completed for the user
    Headers: Authorization: Bearer <token>
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        
        response = supabase.table('profiles').update({
            'onboarding_completed_at': now
        }).eq('id', user_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Failed to update profile'}), 400
        
        return jsonify({
            'success': True,
            'message': 'Onboarding marked complete'
        }), 200
        
    except Exception as e:
        print(f"Mark onboarding complete error: {str(e)}")
        return jsonify({'error': str(e)}), 500
