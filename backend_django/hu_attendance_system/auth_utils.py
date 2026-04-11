from django.http import JsonResponse
from accounts.models import Role

def get_user_from_request(request):
    """Unified helper to retrieve the authenticated user."""
    if request.user.is_authenticated:
        return request.user
    return None

def require_auth(request):
    """Unified decorator-like helper for API views."""
    user = get_user_from_request(request)
    if not user:
        return None, JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)
    return user, None

def is_admin(user):
    """Strict check for Administrator privileges."""
    if not user: return False
    if user.is_superuser: return True
    return user.roles.filter(name=Role.ADMINISTRATOR).exists()

def is_hr(user):
    """Strict check for HR Officer privileges."""
    if not user: return False
    # Admins often need HR access too
    if is_admin(user): return True 
    return user.roles.filter(name=Role.HR_OFFICER).exists()

def require_staff(request):
    """Helper for views restricted to Admin or HR."""
    user, auth_err = require_auth(request)
    if auth_err: return None, auth_err
    
    if not (is_admin(user) or is_hr(user)):
        return None, JsonResponse({'success': False, 'error': 'Permission denied. Staff access required.'}, status=403)
    
    return user, None
