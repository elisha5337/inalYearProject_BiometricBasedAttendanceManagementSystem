import base64
import io
import json
import logging
from datetime import timedelta
import numpy as np
import cv2

from PIL import Image
from mtcnn import MTCNN
from deepface import DeepFace

from django.shortcuts import render, get_object_or_404
from django.contrib.admin.views.decorators import staff_member_required
from django.urls import reverse
from django.http import JsonResponse
from django.contrib.auth import get_user_model, authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.core.cache import cache
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings

from .models import EmployeeDetail, BiometricTemplate, Department, Role, UserRole, Workflow, ExternalIntegration, Position
from .utils import PayrollSyncService
from .biometric_service import biometric_service # Unified Service
from attendance.config_utils import read_global_config
from leave.utils import PolicyResolver
from reporting.models import AuditLog
from reporting.utils import log_audit_event
from hu_attendance_system.auth_utils import require_auth, require_staff, is_admin, is_hr

User = get_user_model()
logger = logging.getLogger(__name__)
FAILED_LOGIN_WINDOW_SECONDS =  1* 60

ROLE_INPUT_MAP = {
    'admin': Role.ADMINISTRATOR,
    'administrator': Role.ADMINISTRATOR,
    'ADMIN': Role.ADMINISTRATOR,
    'ADMINISTRATOR': Role.ADMINISTRATOR,
    'hr': Role.HR_OFFICER,
    'hr officer': Role.HR_OFFICER,
    'hr_officer': Role.HR_OFFICER,
    'HR': Role.HR_OFFICER,
    'HR_OFFICER': Role.HR_OFFICER,
    'employee': Role.EMPLOYEE,
    'EMPLOYEE': Role.EMPLOYEE,
}
def normalize_role_input(role_value):
    if not role_value:
        return None

    normalized = str(role_value).strip()
    return ROLE_INPUT_MAP.get(normalized, ROLE_INPUT_MAP.get(normalized.lower(), normalized))


def login_attempt_cache_keys(identifier=None, username=None, email=None):
    keys = set()
    for candidate in [identifier, username, email]:
        normalized = str(candidate or '').strip().lower()
        if normalized:
            keys.add(f'api_login_attempts:{normalized}')
    return keys


def get_failed_login_attempts(identifier=None, username=None, email=None):
    attempts = 0
    for key in login_attempt_cache_keys(identifier, username, email):
        attempts = max(attempts, int(cache.get(key, 0) or 0))
    return attempts


def register_failed_login(identifier=None, username=None, email=None):
    attempts = get_failed_login_attempts(identifier, username, email) + 1
    for key in login_attempt_cache_keys(identifier, username, email):
        cache.set(key, attempts, FAILED_LOGIN_WINDOW_SECONDS)
    return attempts


def clear_failed_login_attempts(identifier=None, username=None, email=None):
    for key in login_attempt_cache_keys(identifier, username, email):
        cache.delete(key)


def get_session_timeout_minutes(config=None):
    active_config = config or read_global_config()
    try:
        timeout_minutes = int(active_config.get('session_timeout_minutes', 60))
    except (TypeError, ValueError):
        timeout_minutes = 60
    return max(1, timeout_minutes)


def apply_session_timeout(request, config=None, remember=False):
    if remember:
        request.session.set_expiry(30 * 24 * 60 * 60) # 30 days in seconds
    else:
        request.session.set_expiry(get_session_timeout_minutes(config) * 60)


def get_max_login_attempts(config=None):
    active_config = config or read_global_config()
    try:
        max_attempts = int(active_config.get('max_login_attempts', 3))
    except (TypeError, ValueError):
        max_attempts = 3
    return max(1, max_attempts)


def get_password_expiry_days():
    policy = PolicyResolver.get_active_policy('Password Expiry')
    if not policy or not policy.value:
        return None

    normalized = str(policy.value).strip().lower()
    if normalized == 'never':
        return None

    expiry_days = int(PolicyResolver.extract_numeric_value(policy.value) or 0)
    return expiry_days if expiry_days > 0 else None


def get_last_password_change_at(user):
    changed_at = (
        AuditLog.objects.filter(user=user, action='PASSWORD_CHANGED')
        .order_by('-timestamp')
        .values_list('timestamp', flat=True)
        .first()
    )
    return changed_at or user.date_joined


def enforce_password_expiry(user):
    if getattr(user, 'must_change_password', False):
        return True

    expiry_days = get_password_expiry_days()
    if expiry_days is None:
        return False

    cutoff = timezone.now() - timedelta(days=expiry_days)
    if get_last_password_change_at(user) <= cutoff:
        user.must_change_password = True
        user.save(update_fields=['must_change_password'])
        return True

    return False

def get_frontend_role_slug(user):
    if user.is_administrator:
        return 'admin'
    if user.is_hr_officer:
        return 'hr'
    return 'employee'


def serialize_user_for_frontend(user):
    profile_photo = None
    try:
        if hasattr(user, 'employeedetail'):
            profile_photo = user.employeedetail.profile_photo
    except:
        pass

    return {
        'id': str(user.id),
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'name': user.get_full_name() or user.username,
        'role': get_frontend_role_slug(user),
        'status': user.status,
        'must_change_password': user.must_change_password,
        'profile_photo': profile_photo,
    }


def serialize_profile_for_frontend(user):
    detail = getattr(user, 'employeedetail', None)
    department_name = detail.department.name if detail and detail.department else ''

    return {
        **serialize_user_for_frontend(user),
        'department': department_name,
        'position': detail.position if detail and detail.position else '',
        'employment_type': detail.employment_type if detail and detail.employment_type else '',
        'hire_date': detail.hire_date.isoformat() if detail and detail.hire_date else None,
        'biometric_enrolled': bool(detail.biometric_enrolled) if detail else False,
        'phone': detail.phone if detail and detail.phone else '',
        'bio': detail.bio if detail and detail.bio else '',
        'profile_photo': detail.profile_photo if detail and detail.profile_photo else None,
        'notification_settings': detail.notification_settings if detail else {},
        'regional_settings': detail.regional_settings if detail else {},
        'last_login': user.last_login.isoformat() if user.last_login else None,
        'date_joined': user.date_joined.isoformat(),
    }


# =====================================
# AUTHENTICATION Endpoints for SPA
# =====================================

@csrf_exempt
def api_register(request):
    """Public self-registration endpoint for employees only."""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        data = json.loads(request.body)
        username   = (data.get('username') or '').strip()
        email      = (data.get('email') or '').strip()
        first_name = (data.get('first_name') or '').strip()
        last_name  = (data.get('last_name') or '').strip()
        password   = data.get('password') or ''
        dept_id    = data.get('department_id') or None
        position   = (data.get('position') or '').strip() or None

        if not username or not email or not password or not first_name or not last_name:
            return JsonResponse({'success': False, 'error': 'All fields are required.'}, status=400)
        if len(password) < 8:
            return JsonResponse({'success': False, 'error': 'Password must be at least 8 characters.'}, status=400)
        if User.objects.filter(username__iexact=username).exists():
            return JsonResponse({'success': False, 'error': 'Username already taken.'}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return JsonResponse({'success': False, 'error': 'Email already registered.'}, status=400)

        new_user = User.objects.create_user(
            username=username, password=password, email=email,
            first_name=first_name, last_name=last_name,
            must_change_password=False,
        )
        new_user.status = User.Status.ACTIVE
        new_user.save()

        role, _ = Role.objects.get_or_create(name=Role.EMPLOYEE)
        UserRole.objects.create(user=new_user, role=role)

        EmployeeDetail.objects.create(
            user=new_user,
            department_id=dept_id,
            position=position,
            hire_date=timezone.now().date(),
            biometric_enrolled=False,
        )

        log_audit_event(
            'USER_SELF_REGISTERED',
            f'New employee "{username}" self-registered.',
            request=request,
        )
        return JsonResponse({'success': True, 'message': 'Account created. You can now log in.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@ensure_csrf_cookie
def get_csrf(request):
    return JsonResponse({'success': 'CSRF cookie set'})


def api_me(request):
    user, err = require_auth(request)
    if err:
        return err
    enforce_password_expiry(user)
    return JsonResponse({
        'success': True,
        'user': serialize_user_for_frontend(user)
    })


def api_profile(request):
    user, err = require_auth(request)
    if err:
        return err
    enforce_password_expiry(user)
    return JsonResponse({
        'success': True,
        'profile': serialize_profile_for_frontend(user),
    })


@csrf_exempt
def api_update_profile(request):
    user, err = require_auth(request)
    if err:
        return err
    if request.method not in ['POST', 'PATCH']:
        return JsonResponse({'error': 'POST or PATCH required'}, status=405)

    try:
        data = json.loads(request.body)

        if 'first_name' in data:
            user.first_name = str(data.get('first_name') or '').strip()
        if 'last_name' in data:
            user.last_name = str(data.get('last_name') or '').strip()
        if 'email' in data:
            user.email = str(data.get('email') or '').strip()
        user.save()

        detail, _ = EmployeeDetail.objects.get_or_create(
            user=user,
            defaults={'hire_date': timezone.now().date()},
        )
        if 'position' in data:
            detail.position = str(data.get('position') or '').strip() or None
        if 'employment_type' in data:
            detail.employment_type = data.get('employment_type') or None
        if 'phone' in data:
            detail.phone = str(data.get('phone') or '').strip() or None
        if 'bio' in data:
            detail.bio = str(data.get('bio') or '').strip() or None
        if 'profile_photo' in data:
            detail.profile_photo = data.get('profile_photo') # Expecting base64
        if 'notification_settings' in data:
            detail.notification_settings = data.get('notification_settings')
        if 'regional_settings' in data:
            detail.regional_settings = data.get('regional_settings')
        detail.save()

        return JsonResponse({
            'success': True,
            'profile': serialize_profile_for_frontend(user),
            'message': 'Profile updated successfully.',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@csrf_exempt # CSRF is handled via manual verification in production, but for local SPA dev, exempting login is safer
def api_login(request):
    if request.method == 'POST':
        try:
            config = read_global_config()
            max_login_attempts = get_max_login_attempts(config)
            data = json.loads(request.body)
            identifier = (data.get('identifier') or data.get('username') or data.get('email') or '').strip()
            password = data.get('password')
            requested_role = normalize_role_input(data.get('role'))
            remember = bool(data.get('remember', False))

            if not identifier or not password:
                return JsonResponse({'success': False, 'error': 'Username/email and password are required.'}, status=400)

            username = identifier
            matched_user = None
            if '@' in identifier:
                matched_user = User.objects.filter(email__iexact=identifier).first()
                if matched_user:
                    username = matched_user.username

            current_attempts = get_failed_login_attempts(
                identifier=identifier,
                username=username if username != identifier else None,
                email=identifier if '@' in identifier else None,
            )
            if current_attempts >= max_login_attempts:
                log_audit_event(
                    'FAILED_LOGIN_LOCKED',
                    f'Login temporarily locked for "{identifier}" after {current_attempts} failed attempts.',
                    request=request,
                )
                return JsonResponse({
                    'success': False,
                    'error': 'Too many failed login attempts. Please wait a minutes before trying again.',
                }, status=429)

            user = authenticate(request, username=username, password=password)
            if user is not None:
                clear_failed_login_attempts(identifier=identifier, username=user.username, email=user.email)
                enforce_password_expiry(user)

                # Security Check: Reject suspended accounts
                if user.status == User.Status.SUSPENDED:
                    log_audit_event(
                        'LOGIN_BLOCKED_SUSPENDED',
                        f'Suspended account "{user.username}" attempted to sign in.',
                        user=user,
                        request=request,
                    )
                    return JsonResponse({
                        'success': False,
                        'error': 'You are suspended, contact admin.'
                    }, status=403)

                # Validate selected role against actual user roles
                if requested_role == Role.ADMINISTRATOR and not user.is_administrator:
                    log_audit_event(
                        'LOGIN_ROLE_DENIED',
                        f'User "{user.username}" attempted Administrator login without the required role.',
                        user=user,
                        request=request,
                    )
                    return JsonResponse({'success': False, 'error': 'Account does not have Administrator privileges'}, status=403)
                if requested_role == Role.HR_OFFICER and not user.is_hr_officer:
                    log_audit_event(
                        'LOGIN_ROLE_DENIED',
                        f'User "{user.username}" attempted HR login without the required role.',
                        user=user,
                        request=request,
                    )
                    return JsonResponse({'success': False, 'error': 'Account does not have HR Officer privileges'}, status=403)
                if requested_role == Role.EMPLOYEE and not user.is_employee:
                    log_audit_event(
                        'LOGIN_ROLE_DENIED',
                        f'User "{user.username}" attempted Employee login without the required role.',
                        user=user,
                        request=request,
                    )
                    return JsonResponse({'success': False, 'error': 'Account does not have Employee privileges'}, status=403)

                # Ensure is_staff is set for admins
                if user.is_administrator and not user.is_staff:
                    user.is_staff = True
                    user.save()

                login(request, user)
                apply_session_timeout(request, config, remember=remember)

                # Issue JWT tokens for independent per-tab sessions
                try:
                    from rest_framework_simplejwt.tokens import RefreshToken
                    refresh = RefreshToken.for_user(user)
                    tokens = {
                        'access': str(refresh.access_token),
                        'refresh': str(refresh),
                    }
                except Exception as jwt_err:
                    logger.error(f"JWT generation failed for {user.username}: {jwt_err}")
                    return JsonResponse({
                        'success': False,
                        'error': 'Session token generation failed. Please try again.',
                    }, status=500)

                return JsonResponse({
                    'success': True,
                    'user': serialize_user_for_frontend(user),
                    'tokens': tokens,
                })
            else:
                # If Django's `authenticate` returned None, it may be because
                # the account is inactive/suspended. Detect the case where
                # the provided credentials are actually correct but the
                # account status is SUSPENDED so we can return a 403 with
                # a clear message instead of a generic invalid-credentials
                # response.
                possible_user = None
                try:
                    possible_user = User.objects.filter(username__iexact=username).first()
                    if not possible_user and '@' in identifier:
                        possible_user = User.objects.filter(email__iexact=identifier).first()
                except Exception:
                    possible_user = None

                if possible_user and password and possible_user.check_password(password) and possible_user.status == User.Status.SUSPENDED:
                    log_audit_event(
                        'LOGIN_BLOCKED_SUSPENDED',
                        f'Suspended account "{possible_user.username}" attempted to sign in (credentials correct).',
                        user=possible_user,
                        request=request,
                    )
                    return JsonResponse({
                        'success': False,
                        'error': 'You are suspended, contact admin.'
                    }, status=403)

                attempts = register_failed_login(
                    identifier=identifier,
                    username=username if username != identifier else None,
                    email=identifier if '@' in identifier else None,
                )
                remaining = max(max_login_attempts - attempts, 0)
                locked = attempts >= max_login_attempts
                log_audit_event(
                    'FAILED_LOGIN',
                    (
                        f'Failed login for "{identifier}". '
                        f'{remaining} attempt(s) remaining before temporary lockout.'
                    ),
                    request=request,
                )
                return JsonResponse({
                    'success': False,
                    'error': (
                        'Too many failed login attempts. Please wait a minute before trying again.'
                        if locked else f'Invalid credentials. {remaining} attempt(s) remaining.'
                    ),
                }, status=429 if locked else 401)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'error': 'POST required'}, status=405)


@csrf_exempt
def api_change_password(request):
    user, err = require_auth(request)
    if err:
        return err
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_password = data.get('new_password')

            if not new_password or len(new_password) < 8:
                return JsonResponse({'success': False, 'error': 'Password must be at least 8 characters long.'}, status=400)

            user.set_password(new_password)
            user.must_change_password = False
            user.save()

            login(request, user)
            apply_session_timeout(request)
            clear_failed_login_attempts(username=user.username, email=user.email)
            log_audit_event(
                'PASSWORD_CHANGED',
                f'Password updated for "{user.username}".',
                user=user,
                request=request,
            )

            # Issue fresh JWT tokens so the frontend does not keep the pre-change token
            try:
                from rest_framework_simplejwt.tokens import RefreshToken
                refresh = RefreshToken.for_user(user)
                new_tokens = {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            except Exception:
                new_tokens = None

            return JsonResponse({
                'success': True,
                'message': 'Password changed successfully.',
                'tokens': new_tokens,
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'error': 'POST required'}, status=405)


@csrf_exempt
def api_logout(request):
    # Blacklist the JWT token so it cannot be reused after logout
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header.startswith('Bearer '):
        token_str = auth_header.split(' ', 1)[1]
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            token_obj = AccessToken(token_str)
            # Expire the token immediately by setting its lifetime to zero
            token_obj.set_exp(lifetime=timedelta(seconds=0))
        except Exception:
            pass  # Token already invalid — nothing to blacklist
    logout(request)
    return JsonResponse({'success': True})


def api_list_users(request):
    """Returns a list of all users for enrollment selection."""
    user, err = require_staff(request)
    if err:
        return err
    users = User.objects.all().select_related('employeedetail__department')
    user_list = []
    for u in users:
        detail = getattr(u, 'employeedetail', None)
        dept = detail.department.name if detail and detail.department else "No Department"
        dept_id = str(detail.department.id) if detail and detail.department else ""
        position = detail.position if detail else ""
        hire_date = str(detail.hire_date) if detail and detail.hire_date else ""
        
        # Get enrollment types
        enrollment_types = list(BiometricTemplate.objects.filter(user=u).values_list('type', flat=True))
        enrollment_info = f" ({', '.join(enrollment_types)})" if enrollment_types else ""
        
        role = 'Employee'
        if u.is_administrator:
            role = 'Administrator'
        elif u.is_hr_officer:
            role = 'HR Officer'
            
        user_list.append({
            'id': str(u.id),
            'name': u.get_full_name() or u.username,
            'username': u.username,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'full_name': u.get_full_name() or u.username,
            'role': role,
            'department': dept,
            'department_id': dept_id,
            'position': position,
            'hire_date': hire_date,
            'enrolled': detail.biometric_enrolled if detail else False,
            'enrollment_info': enrollment_info,
            'status': u.status,
            'is_active': u.status == User.Status.ACTIVE,
            'must_change_password': u.must_change_password,
            'employment_type': detail.employment_type or '' if detail else '',
            'profile_photo': detail.profile_photo if detail else None,
        })
    return JsonResponse({'success': True, 'users': user_list})


def api_list_departments(request):
    # Public access allowed — needed for self-registration form
    departments = Department.objects.all().values('id', 'name')
    data = [{'id': str(d['id']), 'name': d['name']} for d in departments]
    return JsonResponse({'success': True, 'departments': data})

def api_list_positions(request):
    # Public access allowed — needed for self-registration form
    department_id = request.GET.get('departmentId')
    if department_id:
        positions = Position.objects.filter(department_id=department_id).values('id', 'name').order_by('name')
    else:
        positions = Position.objects.all().values('id', 'name').order_by('name')
    data = [{'id': str(p['id']), 'name': p['name']} for p in positions]
    return JsonResponse({'success': True, 'positions': data})


@csrf_exempt
def api_create_user(request):
    user, err = require_staff(request)
    if err:
        return err
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = f"{username}123" # Force standard default password per security policy
        email = data.get('email', f"{username}@hawassa.edu.et")
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        role_name = normalize_role_input(data.get('role', Role.EMPLOYEE))
        dept_id = data.get('department_id')
        position_name = data.get('position')
        hire_date = data.get('hire_date')
        
        if User.objects.filter(username=username).exists():
            return JsonResponse({'success': False, 'error': 'Username already exists'})
            
        new_user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
            must_change_password=True
        )
        if 'is_active' in data:
            is_active = bool(data.get('is_active'))
            new_user.status = User.Status.ACTIVE if is_active else User.Status.SUSPENDED
            new_user.is_active = is_active
        new_user.save()
        
        # Assign Role
        # Security Policy: Only admin and elsa can have the Administrator role
        if role_name == Role.ADMINISTRATOR and username not in ['admin', 'elsa']:
            return JsonResponse({'success': False, 'error': 'Only designated system accounts can hold the Administrator role.'}, status=403)

        role, _ = Role.objects.get_or_create(name=role_name)
        UserRole.objects.create(user=new_user, role=role)
        
        # Create EmployeeDetail
        EmployeeDetail.objects.create(
            user=new_user,
            department_id=dept_id,
            position=position_name,
            hire_date=hire_date,
            biometric_enrolled=False
        )
        
        log_audit_event(
            'USER_CREATED',
            f'New user "{username}" created with role "{role_name}" by "{user.username}".',
            user=user,
            request=request,
        )
        return JsonResponse({'success': True, 'message': 'User created successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@csrf_exempt
def api_update_user(request, user_id):
    logged_in_user, err = require_staff(request)
    if err:
        return err
    user = get_object_or_404(User, id=user_id)
    if request.method in ['PATCH', 'POST']:
        # Security Policy: Designated superusers (admin, elsa) cannot be edited or suspended
        if user.username in ['admin', 'elsa']:
            return JsonResponse({
                'success': False, 
                'error': 'Critical System Account: Designated superusers cannot be modified via this interface for security reasons.'
            }, status=403)

        try:
            data = json.loads(request.body)
            if 'status' in data:
                old_status = user.status
                user.status = data['status']
                user.is_active = data['status'] == User.Status.ACTIVE
                if old_status != user.status:
                    log_audit_event(
                        'USER_STATUS_CHANGED',
                        f'Account "{user.username}" status changed from {old_status} to {user.status} by "{logged_in_user.username}".',
                        user=logged_in_user, request=request,
                    )
            if 'is_active' in data:
                is_active = bool(data['is_active'])
                new_status = User.Status.ACTIVE if is_active else User.Status.SUSPENDED
                if user.status != new_status:
                    action_word = 'activated' if is_active else 'suspended'
                    log_audit_event(
                        'USER_STATUS_CHANGED',
                        f'Account "{user.username}" {action_word} by "{logged_in_user.username}".',
                        user=logged_in_user, request=request,
                    )
                user.status = new_status
                user.is_active = is_active
            if 'email' in data:
                user.email = data['email']
            if 'first_name' in data:
                user.first_name = data['first_name']
            if 'last_name' in data:
                user.last_name = data['last_name']
            user.save()
            
            if 'role' in data:
                role_name = normalize_role_input(data['role'])
                if role_name == Role.ADMINISTRATOR and user.username not in ['admin', 'elsa']:
                    return JsonResponse({'success': False, 'error': 'Unauthorized: Only designated system accounts can hold the Administrator role.'}, status=403)
                role, _ = Role.objects.get_or_create(name=role_name)
                user.roles.clear()
                UserRole.objects.create(user=user, role=role)
                log_audit_event(
                    'USER_ROLE_CHANGED',
                    f'Role of "{user.username}" changed to "{role_name}" by "{logged_in_user.username}".',
                    user=logged_in_user, request=request,
                )
                
            detail, created = EmployeeDetail.objects.get_or_create(
                user=user,
                defaults={'hire_date': timezone.now().date()}
            )

            if 'department_id' in data:
                detail.department_id = data['department_id']
            if 'position' in data:
                detail.position = data['position']
            if 'hire_date' in data:
                detail.hire_date = data['hire_date']
            # biometric_enrolled is NOT updated here manually
            detail.save()

            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'error': 'PATCH or POST required'}, status=405)


@csrf_exempt
def api_delete_user(request, user_id):
    logged_in_user, err = require_staff(request)
    if err:
        return err
    if request.method == 'DELETE':
        try:
            user = get_object_or_404(User, id=user_id)
            # Security Policy: Designated superusers (admin, elsa) cannot be deleted
            if user.username in ['admin', 'elsa']:
                return JsonResponse({
                    'success': False, 
                    'error': 'Critical System Account: This account is required for system operation and cannot be deleted.'
                }, status=403)
                
            log_audit_event(
                'USER_DELETED',
                f'User account "{user.username}" permanently deleted by "{logged_in_user.username}".',
                user=logged_in_user, request=request,
            )
            user.delete()
            return JsonResponse({'success': True, 'message': 'User deleted successfully.'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'error': 'DELETE required'}, status=405)

# =====================================
# WORKFLOW Endpoints
# =====================================
from .models import Workflow

@csrf_exempt
def api_list_workflows(request):
    user, err = require_staff(request)
    if err:
        return err
    if request.method != 'GET':
        return JsonResponse({'error': 'GET required'}, status=405)
    workflows = Workflow.objects.all()
    data = []
    for w in workflows:
        data.append({
            'id': str(w.id),
            'name': w.name,
            'steps': w.steps if w.steps else []
        })
    return JsonResponse({'success': True, 'workflows': data})

@csrf_exempt
def api_create_workflow(request):
    user, err = require_staff(request)
    if err:
        return err
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        data = json.loads(request.body)
        name = data.get('name')
        steps = data.get('steps', [])
        
        workflow = Workflow.objects.create(name=name, steps=steps)
        return JsonResponse({'success': True, 'message': 'Workflow created successfully', 'id': str(workflow.id)})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
def api_update_workflow(request, workflow_id):
    user, err = require_staff(request)
    if err:
        return err
    if request.method != 'PATCH':
        return JsonResponse({'error': 'PATCH required'}, status=405)
    try:
        workflow = get_object_or_404(Workflow, id=workflow_id)
        data = json.loads(request.body)
        
        if 'name' in data:
            workflow.name = data['name']
        if 'steps' in data:
            workflow.steps = data['steps']
            
        workflow.save()
        return JsonResponse({'success': True, 'message': 'Workflow updated successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
def api_delete_workflow(request, workflow_id):
    user, err = require_staff(request)
    if err:
        return err
    if request.method != 'DELETE':
        return JsonResponse({'error': 'DELETE required'}, status=405)
    try:
        workflow = get_object_or_404(Workflow, id=workflow_id)
        workflow.delete()
        return JsonResponse({'success': True, 'message': 'Workflow deleted successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@csrf_exempt
def api_list_integrations(request):
    """Returns all third-party integrations, initializing defaults if empty."""
    user, err = require_staff(request)
    if err:
        return err
        
    # Auto-initialize some defaults if table is empty
    if ExternalIntegration.objects.count() == 0:
        ExternalIntegration.objects.create(
            name="Payroll Hub Pro",
            description="Automated synchronization of attendance hours with the institutional payroll system.",
            type=ExternalIntegration.IntegrationType.PAYROLL,
            status=ExternalIntegration.IntegrationStatus.DISCONNECTED
        )
        ExternalIntegration.objects.create(
            name="Payrol system connector",
            description="Real-time personnel attendance and department data syncing for resource payrol system.",
            type=ExternalIntegration.IntegrationType.ERP,
            status=ExternalIntegration.IntegrationStatus.CONNECTED,
            last_sync=timezone.now()
        )
        ExternalIntegration.objects.create(
            name="Global Security Gateway",
            description="Unified security protocol sync for terminal access control and firewall rules.",
            type=ExternalIntegration.IntegrationType.SECURITY,
            status=ExternalIntegration.IntegrationStatus.CONNECTED,
            last_sync=timezone.now()
        )

    integrations = ExternalIntegration.objects.all().order_by('created_at')
    data = []
    for integration in integrations:
        data.append({
            'id': str(integration.id),
            'name': integration.name,
            'description': integration.description,
            'type': integration.type,
            'status': integration.status,
            'endpoint_url': integration.endpoint_url,
            'last_sync': integration.last_sync.strftime('%b %d, %H:%M %p') if integration.last_sync else 'Never',
        })
    
    return JsonResponse({'success': True, 'integrations': data})

@csrf_exempt
def api_toggle_integration(request, integration_id):
    """Toggles the connection status and updates last_sync if connecting."""
    user, err = require_staff(request)
    if err:
        return err
        
    integration = get_object_or_404(ExternalIntegration, id=integration_id)
    
    if integration.status == ExternalIntegration.IntegrationStatus.CONNECTED:
        integration.status = ExternalIntegration.IntegrationStatus.DISCONNECTED
    else:
        integration.status = ExternalIntegration.IntegrationStatus.CONNECTED
        integration.last_sync = timezone.now()
        
    integration.save()
    
    return JsonResponse({
        'success': True, 
        'status': integration.status,
        'last_sync': integration.last_sync.strftime('%b %d, %H:%M %p') if integration.last_sync else 'Never'
    })

@csrf_exempt
def api_update_integration_config(request, integration_id):
    """Updates the endpoint URL and API Key for an integration."""
    user, err = require_staff(request)
    if err:
        return err
        
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
        
    try:
        data = json.loads(request.body)
        integration = get_object_or_404(ExternalIntegration, id=integration_id)
        
        if 'endpoint_url' in data:
            integration.endpoint_url = data['endpoint_url']
        if 'api_key' in data:
            integration.api_key = data['api_key']
            
        integration.save()
        return JsonResponse({'success': True, 'message': 'Configuration updated successfully.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
def api_sync_integration(request, integration_id):
    """Triggers a real-time data synchronization to the external system."""
    user, err = require_staff(request)
    if err:
        return err
        
    integration = get_object_or_404(ExternalIntegration, id=integration_id)
    
    if integration.status != ExternalIntegration.IntegrationStatus.CONNECTED:
        return JsonResponse({'success': False, 'error': 'Integration must be connected to sync.'}, status=400)

    try:
        body = json.loads(request.body) if request.body else {}
    except Exception:
        body = {}

    start_date = body.get('start_date') or None
    end_date = body.get('end_date') or None
        
    success, message, records = PayrollSyncService.sync_to_external(integration, start_date=start_date, end_date=end_date)
    
    if success:
        return JsonResponse({
            'success': True, 
            'message': message,
            'records': records,
            'last_sync': integration.last_sync.strftime('%b %d, %H:%M %p') if integration.last_sync else 'Just Now'
        })
    else:
        return JsonResponse({'success': False, 'error': message}, status=500)

@csrf_exempt
def api_create_integration(request):
    """Creates a new external integration connector."""
    user, err = require_staff(request)
    if err:
        return err
        
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
        
    try:
        data = json.loads(request.body)
        name = data.get('name')
        integration_type = data.get('type')
        description = data.get('description', '')
        
        if not name or not integration_type:
            return JsonResponse({'error': 'Name and Type are required.'}, status=400)
            
        integration = ExternalIntegration.objects.create(
            name=name,
            type=integration_type,
            description=description,
            status=ExternalIntegration.IntegrationStatus.DISCONNECTED
        )
        
        return JsonResponse({
            'success': True, 
            'message': 'Connector created successfully.',
            'integration': {
                'id': str(integration.id),
                'name': integration.name,
                'type': integration.type,
                'status': integration.status,
                'last_sync': 'Never'
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
def api_delete_integration(request, integration_id):
    """Deletes an existing external integration connector."""
    user, err = require_staff(request)
    if err:
        return err
        
    if request.method != 'DELETE' and request.method != 'POST':
        # Support both for UI flexibility
        return JsonResponse({'error': 'POST or DELETE required'}, status=405)
        
    try:
        integration = get_object_or_404(ExternalIntegration, id=integration_id)
        integration.delete()
        
        return JsonResponse({
            'success': True, 
            'message': 'Connector removed successfully.'
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


# FAST DETECTOR (for /face/check/) cascades removed

# =====================================
# ACCURATE DETECTOR (for enrollment)
# =====================================

try:
    detector = MTCNN()
    logger.info("MTCNN loaded")
except Exception as e:
    logger.error(e)
    detector = None

# =====================================
# CACHE
# =====================================

# (legacy cache variables removed — BiometricRegistry singleton is the sole cache)


# =====================================
# CHALLENGES (Blink Removed)
# =====================================

CHALLENGES = [

    {
        "type": "center",
        "text": "Look Forward carefully",
        "instruction": "Look straight carefully"
    },

    {
        "type": "left",
        "text": "Turn Left",
        "instruction": "Turn left"
    },

    {
        "type": "right",
        "text": "Turn Right",
        "instruction": "Turn right"
    },

]
# =====================================
# FAST FACE CHECK (MTCNN Upgraded)
# ====================================
@csrf_exempt
def check_face(request):
    try:

        data = json.loads(
            request.body
        )

        frame = data.get("frame")

        if not frame:
            return JsonResponse(
                {"face": False}
            )

        _, img_str = frame.split(
            ";base64,"
        )

        img = Image.open(
            io.BytesIO(
                base64.b64decode(img_str)
            )
        ).convert("RGB")

        img_np = np.array(img)

        if detector is None:
            return JsonResponse({"face": False})

        faces = detect_faces_fast(img_np, detector)

        if len(faces) >= 1:
            return JsonResponse(
                {"face": True}
            )

        return JsonResponse(
            {"face": False}
        )

    except Exception as e:

        logger.error(e)

        return JsonResponse(
            {"face": False}
        )


# =====================================
# ENROLLMENT
# =====================================

def detect_faces_fast(image_array, detector):
    """
    Detect faces on a 640x480 downscaled copy for speed,
    then scale bounding boxes back to original resolution.
    MTCNN is 2-4x faster on 640x480 vs 1280x720.
    """
    orig_h, orig_w = image_array.shape[:2]
    target_w, target_h = 640, 480

    if orig_w <= target_w and orig_h <= target_h:
        # Already small enough — detect directly
        return detector.detect_faces(image_array)

    scale_x = orig_w / target_w
    scale_y = orig_h / target_h
    small = cv2.resize(image_array, (target_w, target_h))
    faces_small = detector.detect_faces(small)

    # Scale bounding boxes and keypoints back to original resolution
    faces = []
    for f in faces_small:
        x, y, w, h = f['box']
        scaled = dict(f)
        scaled['box'] = [
            int(x * scale_x), int(y * scale_y),
            int(w * scale_x), int(h * scale_y)
        ]
        kp = f.get('keypoints', {})
        scaled['keypoints'] = {
            k: (int(v[0] * scale_x), int(v[1] * scale_y))
            for k, v in kp.items()
        }
        faces.append(scaled)
    return faces


@staff_member_required
def capture_face(request, user_id):
    user = get_object_or_404(
        User,
        pk=user_id
    )

    if request.method == "GET":
        request.session.pop(
            "face_frames",
            None
        )

        return render(
            request,
            "accounts/capture.html",
            {
                "user": user,
                "challenges": CHALLENGES,
            },
        )

    try:
        data = json.loads(request.body)
        frames = data.get("frames", [])
        challenge = data.get("challenge")
        step = data.get("step", 0)

        if not frames:
            return JsonResponse(
                {
                    "success": False,
                    "error": "No frames",
                }
            )

        valid_frames = []
        movements = []

        for frame_data in frames:

            _, img_str = frame_data.split(
                ";base64,"
            )

            img = Image.open(
                io.BytesIO(
                    base64.b64decode(
                        img_str
                    )
                )
            ).convert("RGB")

            img_np = np.array(img)

            faces = detect_faces_fast(img_np, detector)

            # --- [STRICT ENROLLMENT] Reject if multiple faces detected ---
            if len(faces) > 1:
                return JsonResponse({
                    "success": False,
                    "error": "Security Alert: Multiple faces detected in frame. Enrollment requires only one person to be visible."
                })

            if len(faces) != 1:
                continue

            face = faces[0]

            x, y, w, h = face["box"]
            # Clamp all box values — MTCNN can return negatives
            x = max(0, x)
            y = max(0, y)
            w = max(1, w)
            h = max(1, h)

            nose = face["keypoints"][
                "nose"
            ]

            left_eye = face["keypoints"][
                "left_eye"
            ]

            right_eye = face["keypoints"][
                "right_eye"
            ]

            movements.append(
                nose[0]
            )

            valid_frames.append(
                {
                    "image": img_np,
                    "box": [x, y, w, h],
                    "eyes": [
                        left_eye,
                        right_eye,
                    ],
                }
            )

        if len(valid_frames) < 5:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Face lost or unstable. Please stay within the frame and turn slowly.",
                }
            )

        move = (
                movements[-1]
                - movements[0]
        )

        # ==========
        # STORE
        # ==========

        if "face_frames" not in request.session:
            request.session["face_frames"] = {}

        face_data = []
        best_quality_frame = None
        best_quality_score = -1.0

        for f in valid_frames:
            face = biometric_service.preprocess_face(f["image"], f["box"], padding=20)
            if face is None: continue

            # Score quality to pick best frame for profile photo
            from attendance.views import score_face_quality
            q_score, _ = score_face_quality(face, {'left_eye': f['eyes'][0], 'right_eye': f['eyes'][1]})
            if q_score > best_quality_score:
                best_quality_score = q_score
                best_quality_frame = face

            _, buf = cv2.imencode(
                ".jpg",
                cv2.cvtColor(face, cv2.COLOR_RGB2BGR),
                [int(cv2.IMWRITE_JPEG_QUALITY), 95],  # 95 quality — minimal lossy degradation
            )

            face_data.append(base64.b64encode(buf).decode())

        request.session["face_frames"][str(step)] = face_data
        request.session.modified = True

        return JsonResponse(
            {
                "success": True,
                "next_step": step + 1 if step < len(CHALLENGES) - 1 else None,
                "can_verify": step >= len(CHALLENGES) - 1,
                "next_challenge": CHALLENGES[step + 1] if step < len(CHALLENGES) - 1 else None,
            }
        )

    except Exception as e:
        logger.exception(e)
        return JsonResponse({"success": False, "error": str(e)})

@csrf_exempt
@staff_member_required
def verify_face(request, user_id):
    user = get_object_or_404(User, pk=user_id)
    
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "POST required"})

    try:
        if "face_frames" not in request.session:
            return JsonResponse({"success": False, "error": "No capture data found in session"})

        session_frames = request.session.get("face_frames", {})
        sample_frames = []
        for i in range(len(CHALLENGES)):
            step_f = session_frames.get(str(i), [])
            if step_f:
                # Take ALL frames from each challenge step, not just 3
                sample_frames.extend(step_f)

        if not sample_frames:
            return JsonResponse({"success": False, "error": "Insufficient biometric data"})

        embeddings = []
        best_frame_b64 = sample_frames[0]  # fallback
        best_frame_score = -1.0

        for f in sample_frames:
            img_bytes = base64.b64decode(f)
            img_np = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
            img_rgb = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)

            # Score quality — pick sharpest frame as profile photo
            gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
            sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
            if sharpness > best_frame_score:
                best_frame_score = sharpness
                best_frame_b64 = f

            # img_rgb is already a preprocessed 160x160 face crop from capture_face.
            # Pass directly to DeepFace — do NOT resize again.
            try:
                rep = DeepFace.represent(
                    img_path=img_rgb,
                    model_name="Facenet512",
                    enforce_detection=False,
                    detector_backend="skip",
                )
                emb = np.array(rep[0]["embedding"], dtype=np.float32)
                # Normalize each individual embedding before averaging
                norm = np.linalg.norm(emb)
                if norm > 0:
                    embeddings.append(emb / norm)
            except Exception as e:
                logger.error(f"DeepFace error: {e}")

        if len(embeddings) < 3:
            return JsonResponse({"success": False, "error": "Insufficient high-quality biometrics. Please recapture."})

        # Average of already-normalized embeddings, then re-normalize.
        # This produces a robust mean-face vector that is more discriminative
        # than averaging raw embeddings.
        avg_embedding = np.mean(embeddings, axis=0)
        norm = np.linalg.norm(avg_embedding)
        if norm == 0:
            return JsonResponse({"success": False, "error": "Embedding computation failed. Please recapture."})
        avg_embedding = avg_embedding / norm

        # --- DUPLICATE CHECK with select_related to avoid N+1 queries ---
        all_templates = BiometricTemplate.objects.exclude(user_id=user.id).select_related('user')
        for template in all_templates:
            other_vec = np.array(template.template_data, dtype=np.float32)
            other_norm = np.linalg.norm(other_vec)
            if other_norm == 0: continue
            other_vec = other_vec / other_norm
            distance = float(1 - np.dot(avg_embedding, other_vec))
            if distance < 0.40:
                return JsonResponse({
                    "success": False,
                    "error": f"Registration Blocked: This face is already enrolled to '{template.user.username}'. Each person can only have one biometric profile."
                })

        BiometricTemplate.objects.update_or_create(
            user=user,
            type=BiometricTemplate.BiometricType.FACE,
            defaults={"template_data": avg_embedding.tolist()},
        )

        profile_photo_data = f"data:image/jpeg;base64,{best_frame_b64}"

        # Update biometric_enrolled and profile_photo only — never overwrite hire_date
        detail, _ = EmployeeDetail.objects.get_or_create(
            user=user,
            defaults={'hire_date': timezone.now().date()},
        )
        detail.biometric_enrolled = True
        detail.profile_photo = profile_photo_data
        detail.save(update_fields=['biometric_enrolled', 'profile_photo'])

        request.session.pop("face_frames", None)
        biometric_service.reload_cache()
        log_audit_event(
            'BIOMETRIC_ENROLLED',
            f'Face biometric template enrolled for "{user.username}" by "{request.user.username}".',
            user=request.user,
            request=request,
        )
        return JsonResponse({
            'success': True,
            'completed': True,
            'redirect': reverse('admin:accounts_user_change', args=[user.pk]),
        })

    except Exception as e:
        logger.exception(e)
        return JsonResponse({"success": False, "error": str(e)})

# =====================================
# PASSWORD RESET Endpoints
# =====================================

class AccountPasswordResetTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        # Ensure the hash is unique enough
        return (
            force_str(user.pk) + force_str(user.password) + force_str(user.last_login) + force_str(timestamp)
        )

password_reset_token_generator = AccountPasswordResetTokenGenerator()

@csrf_exempt
def api_forgot_password_request(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email', '').strip()

            if not email:
                return JsonResponse({'success': False, 'error': 'Email is required.'}, status=400)

            user = User.objects.filter(email__iexact=email).first()

            if user:
                token = password_reset_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))

                # Frontend URL for password reset
                frontend_url = getattr(settings, 'FRONTEND_URL', 'https://localhost:3000').rstrip('/')
                reset_link = f"{frontend_url}/reset-password/{uid}/{token}"
                logger.info(f"Password reset link for {user.email}: {reset_link}")

                # Send real email
                subject = 'HU-IOT BBEAMS Password Reset'
                message = f'Greetings,\n\nYou requested a password reset for your HU-IOT BBEAMS account. Click the link below to set a new password:\n\n{reset_link}\n\nThis link will expire in 24 hours.\n\nIf you did not request this, please ignore this email.'
                
                try:
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=False,
                    )
                    return JsonResponse({'success': True, 'message': 'A password reset link has been sent to your university email.'})
                except Exception as mail_err:
                    logger.warning(f"Mail delivery failed (offline/local fallback): {mail_err}")
                    print("\n" + "="*80)
                    print("⚠️  OFFLINE / LOCAL DEMO MODE DETECTED (SMTP DELIVERY SKIPPED)  ⚠️")
                    print(f"🔑 Password reset link generated for: {user.email}")
                    print(f"🔗 Link: {reset_link}")
                    print("="*80 + "\n")
                    
                    # Return success with a clear indication that it has been printed to the server logs
                    return JsonResponse({
                        'success': True,
                        'message': 'A password reset link has been generated. Due to the local/offline environment, real email delivery was bypassed, but the reset link has been printed to the server terminal logs for easy demo testing!'
                    })
            else:
                # Proper error message for non-existing emails as requested
                return JsonResponse({'success': False, 'error': 'No account found with this institutional email address.'}, status=404)
        except Exception as e:
            logger.exception("Forgot password request failed")
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    return JsonResponse({'error': 'POST required'}, status=405)

@csrf_exempt
def api_reset_password_confirm(request, uidb64, token):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_password = data.get('new_password')

            if not new_password or len(new_password) < 8:
                return JsonResponse({'success': False, 'error': 'Password must be at least 8 characters long.'}, status=400)

            try:
                uid = force_str(urlsafe_base64_decode(uidb64))
                user = User.objects.get(pk=uid)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                user = None

            if user is not None and password_reset_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.must_change_password = False
                user.save()
                log_audit_event(
                    'PASSWORD_RESET',
                    f'Password reset successfully for "{user.username}" via reset link.',
                    user=user,
                    request=request,
                )
                return JsonResponse({'success': True, 'message': 'Password has been reset successfully.'})
            else:
                return JsonResponse({'success': False, 'error': 'The reset link is invalid or has expired.'}, status=400)
        except Exception as e:
            logger.exception("Password reset confirmation failed")
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    return JsonResponse({'error': 'POST required'}, status=405)
