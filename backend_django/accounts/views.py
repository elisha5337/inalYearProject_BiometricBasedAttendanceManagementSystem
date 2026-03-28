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
from django.contrib.auth.decorators import login_required
from django.core.cache import cache

from django.utils import timezone
from .models import EmployeeDetail, BiometricTemplate, Department, Role, UserRole, Workflow, ExternalIntegration, Position
from .utils import PayrollSyncService
from attendance.config_utils import read_global_config
from leave.utils import PolicyResolver
from reporting.models import AuditLog
from reporting.utils import log_audit_event

User = get_user_model()
logger = logging.getLogger(__name__)
FAILED_LOGIN_WINDOW_SECONDS = 15 * 60

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
    return max(15, timeout_minutes)


def apply_session_timeout(request, config=None):
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

@ensure_csrf_cookie
def get_csrf(request):
    return JsonResponse({'success': 'CSRF cookie set'})


def api_me(request):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)

    enforce_password_expiry(request.user)
    return JsonResponse({
        'success': True,
        'user': serialize_user_for_frontend(request.user)
    })


@login_required
def api_profile(request):
    enforce_password_expiry(request.user)
    return JsonResponse({
        'success': True,
        'profile': serialize_profile_for_frontend(request.user),
    })


@csrf_exempt
@login_required
def api_update_profile(request):
    if request.method not in ['POST', 'PATCH']:
        return JsonResponse({'error': 'POST or PATCH required'}, status=405)

    try:
        data = json.loads(request.body)
        user = request.user

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


@csrf_exempt
def api_login(request):
    if request.method == 'POST':
        try:
            config = read_global_config()
            max_login_attempts = get_max_login_attempts(config)
            data = json.loads(request.body)
            identifier = (data.get('identifier') or data.get('username') or data.get('email') or '').strip()
            password = data.get('password')
            requested_role = normalize_role_input(data.get('role'))

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
                    'error': 'Too many failed login attempts. Please wait 15 minutes before trying again.',
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
                        'error': 'This account has been suspended. Please contact the administrator.'
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
                apply_session_timeout(request, config)
                log_audit_event(
                    'LOGIN_SUCCESS',
                    f'User "{user.username}" signed in as {requested_role or get_frontend_role_slug(user)}.',
                    user=user,
                    request=request,
                )

                return JsonResponse({
                    'success': True,
                    'user': serialize_user_for_frontend(user)
                })
            else:
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
                        'Too many failed login attempts. Please wait 15 minutes before trying again.'
                        if locked else f'Invalid credentials. {remaining} attempt(s) remaining.'
                    ),
                }, status=429 if locked else 401)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'error': 'POST required'}, status=405)


@csrf_exempt
@login_required
def api_change_password(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_password = data.get('new_password')
            
            if not new_password or len(new_password) < 8:
                return JsonResponse({'success': False, 'error': 'Password must be at least 8 characters long.'}, status=400)

            user = request.user
            user.set_password(new_password)
            user.must_change_password = False
            user.save()
            
            # Re-authenticate the user with the new password to keep them logged in
            login(request, user)
            apply_session_timeout(request)
            clear_failed_login_attempts(username=user.username, email=user.email)
            log_audit_event(
                'PASSWORD_CHANGED',
                f'Password updated for "{user.username}".',
                user=user,
                request=request,
            )

            return JsonResponse({'success': True, 'message': 'Password changed successfully.'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'error': 'POST required'}, status=405)


@csrf_exempt
def api_logout(request):
    user = request.user if request.user.is_authenticated else None
    if user:
        log_audit_event(
            'LOGOUT',
            f'User "{user.username}" signed out.',
            user=user,
            request=request,
        )
    logout(request)
    return JsonResponse({'success': True})


def api_list_users(request):
    """Returns a list of all users for enrollment selection."""
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
    departments = Department.objects.all().values('id', 'name')
    # Convert UUIDs to strings explicitly
    data = [{'id': str(d['id']), 'name': d['name']} for d in departments]
    return JsonResponse({'success': True, 'departments': data})

def api_list_positions(request):
    department_id = request.GET.get('departmentId')
    if department_id:
        positions = Position.objects.filter(department_id=department_id).values('id', 'name').order_by('name')
    else:
        positions = Position.objects.all().values('id', 'name').order_by('name')
    
    # Convert UUIDs to strings explicitly
    data = [{'id': str(p['id']), 'name': p['name']} for p in positions]
    return JsonResponse({'success': True, 'positions': data})


@csrf_exempt
def api_create_user(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password', 'password123') # Default password
        email = data.get('email', f"{username}@example.com")
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        role_name = normalize_role_input(data.get('role', Role.EMPLOYEE))
        dept_id = data.get('department_id')
        position_name = data.get('position')
        hire_date = data.get('hire_date')
        
        if User.objects.filter(username=username).exists():
            return JsonResponse({'success': False, 'error': 'Username already exists'})
            
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )
        user.must_change_password = True
        if 'is_active' in data:
            is_active = bool(data.get('is_active'))
            user.status = User.Status.ACTIVE if is_active else User.Status.SUSPENDED
            user.is_active = is_active
        user.save()
        
        # Assign Role
        # Security Policy: Only admin and elsa can have the Administrator role
        if role_name == Role.ADMINISTRATOR and username not in ['admin', 'elsa']:
            return JsonResponse({'success': False, 'error': 'Only designated system accounts can hold the Administrator role.'}, status=403)

        role, _ = Role.objects.get_or_create(name=role_name)
        UserRole.objects.create(user=user, role=role)
        
        # Create EmployeeDetail
        EmployeeDetail.objects.create(
            user=user,
            department_id=dept_id,
            position=position_name,
            hire_date=hire_date,
            biometric_enrolled=False
        )
        
        return JsonResponse({'success': True, 'message': 'User created successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@csrf_exempt
def api_update_user(request, user_id):
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
                user.status = data['status']
                user.is_active = data['status'] == User.Status.ACTIVE
            if 'is_active' in data:
                is_active = bool(data['is_active'])
                user.status = User.Status.ACTIVE if is_active else User.Status.SUSPENDED
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
                # Security Policy: Only admin and elsa can have the Administrator role
                if role_name == Role.ADMINISTRATOR and user.username not in ['admin', 'elsa']:
                    return JsonResponse({'success': False, 'error': 'Unauthorized: Only designated system accounts can hold the Administrator role.'}, status=403)

                role, _ = Role.objects.get_or_create(name=role_name)
                # Overwrite existing roles for this simplified model
                user.roles.clear()
                UserRole.objects.create(user=user, role=role)
                
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
@login_required
def api_delete_user(request, user_id):
    if request.method == 'DELETE':
        try:
            user = get_object_or_404(User, id=user_id)
            # Security Policy: Designated superusers (admin, elsa) cannot be deleted
            if user.username in ['admin', 'elsa']:
                return JsonResponse({
                    'success': False, 
                    'error': 'Critical System Account: This account is required for system operation and cannot be deleted.'
                }, status=403)
                
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
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'error': 'Unauthorized'}, status=403)
        
    # Auto-initialize some defaults if table is empty
    if ExternalIntegration.objects.count() == 0:
        ExternalIntegration.objects.create(
            name="Payroll Hub Pro",
            description="Automated synchronization of attendance hours with the institutional payroll system.",
            type=ExternalIntegration.IntegrationType.PAYROLL,
            status=ExternalIntegration.IntegrationStatus.DISCONNECTED
        )
        ExternalIntegration.objects.create(
            name="Cloud ERP Connector",
            description="Real-time personnel and department data syncing for resource planning.",
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
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'error': 'Unauthorized'}, status=403)
        
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
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'error': 'Unauthorized'}, status=403)
        
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
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'error': 'Unauthorized'}, status=403)
        
    integration = get_object_or_404(ExternalIntegration, id=integration_id)
    
    if integration.status != ExternalIntegration.IntegrationStatus.CONNECTED:
        return JsonResponse({'success': False, 'error': 'Integration must be connected to sync.'}, status=400)
        
    success, message = PayrollSyncService.sync_to_external(integration)
    
    if success:
        return JsonResponse({
            'success': True, 
            'message': message,
            'last_sync': integration.last_sync.strftime('%b %d, %H:%M %p') if integration.last_sync else 'Just Now'
        })
    else:
        return JsonResponse({'success': False, 'error': message}, status=500)

@csrf_exempt
def api_create_integration(request):
    """Creates a new external integration connector."""
    print(f"[DEBUG] api_create_integration: {request.method} {request.path} (User: {request.user})")
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'error': 'Unauthorized'}, status=403)
        
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
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'error': 'Unauthorized'}, status=403)
        
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


# FAST DETECTOR (for /face/check/)
# =====================================

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades +
    "haarcascade_frontalface_default.xml"
)
profile_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades +
    "haarcascade_profileface.xml"
)

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

known_embeddings = []
known_user_ids = []
known_usernames = []


def load_known_embeddings():
    global known_embeddings
    global known_user_ids
    global known_usernames

    templates = BiometricTemplate.objects.filter(
        type=BiometricTemplate.BiometricType.FACE
    ).select_related("user")

    known_embeddings = [
        np.array(t.template_data)
        for t in templates
    ]

    known_user_ids = [
        str(t.user.id)
        for t in templates
    ]

    known_usernames = [
        t.user.username
        for t in templates
    ]

    logger.info(
        f"Loaded {len(known_embeddings)} templates"
    )


# =====================================
# CHALLENGES (Blink Removed)
# =====================================

CHALLENGES = [

    {
        "type": "center",
        "text": "Look Forward",
        "instruction": "Look straight"
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
# FAST FACE CHECK (NO MTCNN)
# =====================================

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

        gray = cv2.cvtColor(
            img_np,
            cv2.COLOR_RGB2GRAY
        )

        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60),
        )

        if len(faces) == 0:
            faces = profile_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(60, 60),
            )

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

            faces = detector.detect_faces(
                img_np
            )

            if len(faces) != 1:
                continue

            face = faces[0]

            x, y, w, h = face["box"]

            x = max(0, x)
            y = max(0, y)

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
        # LIVENESS
        # ==========

        if challenge == "left" and move < 15:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Incomplete turn. Please turn your head clearly to the left.",
                }
            )

        if challenge == "right" and move > -15:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Incomplete turn. Please turn your head clearly to the right.",
                }
            )

        # ==========
        # STORE
        # ==========

        if "face_frames" not in request.session:
            request.session["face_frames"] = {}

        face_data = []

        for f in valid_frames:
            x, y, w, h = f["box"]
            face = f["image"][y:y + h, x:x + w]
            face = cv2.resize(face, (160, 160))

            _, buf = cv2.imencode(
                ".jpg",
                cv2.cvtColor(face, cv2.COLOR_RGB2BGR),
                [int(cv2.IMWRITE_JPEG_QUALITY), 80],
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
                sample_frames.extend(step_f[:3])

        if not sample_frames:
            return JsonResponse({"success": False, "error": "Insufficient biometric data"})

        embeddings = []
        for f in sample_frames:
            img_bytes = base64.b64decode(f)
            img_np = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
            img_rgb = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)

            try:
                rep = DeepFace.represent(
                    img_path=img_rgb,
                    model_name="Facenet512",
                    enforce_detection=False,
                    detector_backend="skip",
                )
                embeddings.append(rep[0]["embedding"])
            except Exception as e:
                logger.error(f"DeepFace error: {e}")

        if len(embeddings) < 5:
            return JsonResponse({"success": False, "error": "Insufficient high-quality biometrics. Please recapture."})

        avg_embedding = np.mean(embeddings, axis=0)

        # Check for duplicates against all other users
        existing_templates = BiometricTemplate.objects.exclude(user=user)
        for template in existing_templates:
            existing_embedding = np.array(template.template_data)
            
            # Cosine similarity calculation
            cosine_similarity = np.dot(avg_embedding, existing_embedding) / (np.linalg.norm(avg_embedding) * np.linalg.norm(existing_embedding))
            
            if cosine_similarity > 0.85: # Stricter threshold for duplicate check
                return JsonResponse({"success": False, "error": f"This face is already registered to another user ({template.user.username})."})

        BiometricTemplate.objects.update_or_create(
            user=user,
            type=BiometricTemplate.BiometricType.FACE,
            defaults={"template_data": avg_embedding.tolist()},
        )

        EmployeeDetail.objects.update_or_create(
            user=user,
            defaults={
                "biometric_enrolled": True,
                "hire_date": timezone.now().date() # Ensure a hire_date exists if creating
            },
        )

        request.session.pop("face_frames", None)
        load_known_embeddings()

        return JsonResponse({
            "success": True,
            "completed": True,
            "redirect": reverse("admin:accounts_user_change", args=[user.pk]),
        })

    except Exception as e:
        logger.exception(e)
        return JsonResponse({"success": False, "error": str(e)})
