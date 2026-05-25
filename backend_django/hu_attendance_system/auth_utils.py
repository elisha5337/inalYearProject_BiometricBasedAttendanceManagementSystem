from django.http import JsonResponse
from accounts.models import Role

def get_user_from_request(request):
    """
    Supports both JWT (Authorization: Bearer <token>) and cookie sessions.
    JWT takes priority — enables independent per-tab sessions.
    """
    # 1. Try JWT token from Authorization header
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ', 1)[1]
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from accounts.models import User
            decoded = AccessToken(token)
            return User.objects.get(id=decoded['user_id'])
        except Exception:
            return None

    # 2. Fall back to cookie session (legacy support)
    if request.user.is_authenticated:
        return request.user

    return None


def require_auth(request):
    user = get_user_from_request(request)
    if not user:
        return None, JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)
    return user, None


def is_admin(user):
    if not user: return False
    if user.is_superuser: return True
    return user.roles.filter(name=Role.ADMINISTRATOR).exists()


def is_hr(user):
    if not user: return False
    if is_admin(user): return True
    return user.roles.filter(name=Role.HR_OFFICER).exists()


def require_staff(request):
    user, auth_err = require_auth(request)
    if auth_err: return None, auth_err
    if not (is_admin(user) or is_hr(user)):
        return None, JsonResponse({'success': False, 'error': 'Permission denied. Staff access required.'}, status=403)
    return user, None
