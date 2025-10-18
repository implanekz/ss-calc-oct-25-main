"""
Partner management endpoints for Ret1re Platform
Handles: create, read, update, delete partners (spouses, ex-spouses, deceased)
"""
from flask import Blueprint, request, jsonify
from supabase import Client
from config.supabase import get_supabase_client
import traceback

partners_bp = Blueprint('partners', __name__, url_prefix='/api/partners')
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
# GET /api/partners
# ============================================
@partners_bp.route('', methods=['GET'])
def get_partners():
    """
    Get all partners for current user
    Headers: Authorization: Bearer <token>
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        response = supabase.table('partners').select('*').eq('user_id', user_id).execute()
        
        return jsonify({
            'partners': response.data if response.data else []
        }), 200
        
    except Exception as e:
        print(f"Get partners error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================
# POST /api/partners
# ============================================
@partners_bp.route('', methods=['POST'])
def create_partner():
    """
    Create a new partner record
    Headers: Authorization: Bearer <token>
    Body: {
      relationshipType: string (spouse|ex_spouse|deceased_spouse),
      dateOfBirth?: string (YYYY-MM-DD),
      piaAtFra?: number,
      alreadyReceivingBenefits?: boolean,
      currentMonthlyBenefit?: number,
      filedAgeYears?: number,
      filedAgeMonths?: number,
      divorceDate?: string (YYYY-MM-DD),
      marriageLengthYears?: number,
      dateOfDeath?: string (YYYY-MM-DD)
    }
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        
        if not data.get('relationshipType'):
            return jsonify({'error': 'relationshipType required'}), 400
        
        relationship_type = data['relationshipType']
        if relationship_type not in ['spouse', 'ex_spouse', 'deceased_spouse']:
            return jsonify({'error': 'Invalid relationshipType'}), 400
        
        partner_data = {
            'user_id': user_id,
            'relationship_type': relationship_type,
            'date_of_birth': data.get('dateOfBirth'),
            'pia_at_fra': data.get('piaAtFra'),
            'already_receiving_benefits': data.get('alreadyReceivingBenefits', False),
            'current_monthly_benefit': data.get('currentMonthlyBenefit'),
            'filed_age_years': data.get('filedAgeYears'),
            'filed_age_months': data.get('filedAgeMonths'),
            'divorce_date': data.get('divorceDate'),
            'marriage_length_years': data.get('marriageLengthYears'),
            'date_of_death': data.get('dateOfDeath')
        }
        
        response = supabase.table('partners').insert(partner_data).execute()
        
        if not response.data:
            return jsonify({'error': 'Failed to create partner'}), 400
        
        return jsonify({
            'success': True,
            'partner': response.data[0]
        }), 201
        
    except Exception as e:
        print(f"Create partner error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ============================================
# PUT /api/partners/:id
# ============================================
@partners_bp.route('/<partner_id>', methods=['PUT'])
def update_partner(partner_id):
    """
    Update a partner record
    Headers: Authorization: Bearer <token>
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        
        # Build update object
        update_data = {}
        
        if 'relationshipType' in data:
            update_data['relationship_type'] = data['relationshipType']
        if 'dateOfBirth' in data:
            update_data['date_of_birth'] = data['dateOfBirth']
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
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        # Verify user owns this partner record
        partner_response = supabase.table('partners').select('user_id').eq('id', partner_id).single().execute()
        if not partner_response.data or partner_response.data['user_id'] != user_id:
            return jsonify({'error': 'Partner not found'}), 404
        
        response = supabase.table('partners').update(update_data).eq('id', partner_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Failed to update partner'}), 400
        
        return jsonify({
            'success': True,
            'partner': response.data[0]
        }), 200
        
    except Exception as e:
        print(f"Update partner error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================
# DELETE /api/partners/:id
# ============================================
@partners_bp.route('/<partner_id>', methods=['DELETE'])
def delete_partner(partner_id):
    """
    Delete a partner record
    Headers: Authorization: Bearer <token>
    """
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Verify user owns this partner record
        partner_response = supabase.table('partners').select('user_id').eq('id', partner_id).single().execute()
        if not partner_response.data or partner_response.data['user_id'] != user_id:
            return jsonify({'error': 'Partner not found'}), 404
        
        supabase.table('partners').delete().eq('id', partner_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Partner deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"Delete partner error: {str(e)}")
        return jsonify({'error': str(e)}), 500
