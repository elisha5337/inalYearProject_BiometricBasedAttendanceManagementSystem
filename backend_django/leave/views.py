from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import LeaveRequest, Policy
from accounts.models import User, Role
from reporting.utils import log_audit_event
import json
from datetime import datetime

# Unified Auth Helpers
from hu_attendance_system.auth_utils import require_auth, require_staff, is_admin, is_hr
from .utils import PolicyResolver

# --- Employee-Facing Views ---

@csrf_exempt
def submit_leave_request(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    requester, auth_err = require_auth(request)
    if auth_err: return auth_err

    try:
        if request.content_type and 'multipart/form-data' in request.content_type:
            data = request.POST
            attachment = request.FILES.get('attachment')
        else:
            data = json.loads(request.body)
            attachment = None

        # Allow staff (admin/HR) to submit on behalf of another user by supplying `userId`.
        target_user = requester
        if (is_admin(requester) or is_hr(requester)) and data.get('userId'):
            try:
                target_user = User.objects.get(id=data.get('userId'))
            except User.DoesNotExist:
                return JsonResponse({'error': 'Target user not found.'}, status=404)

        raw_leave_type = data.get('leaveType', data.get('leave_type', '')).upper().replace('_LEAVE', '').replace(' ', '')
        
        type_mapping = {
            'ANNUAL': LeaveRequest.LeaveType.ANNUAL,
            'SICK': LeaveRequest.LeaveType.SICK,
            'MATERNITY': LeaveRequest.LeaveType.MATERNITY,
            'PATERNITY': LeaveRequest.LeaveType.PATERNITY,
            'COMPASSIONATE': LeaveRequest.LeaveType.COMPASSIONATE,
            'UNPAID': LeaveRequest.LeaveType.UNPAID,
        }
        
        leave_type_enum = type_mapping.get(raw_leave_type, LeaveRequest.LeaveType.ANNUAL)
        start_date_str = data.get('startDate', data.get('start_date'))
        end_date_str = data.get('endDate', data.get('end_date'))
        reason = data.get('reason', '')
        
        if not all([start_date_str, end_date_str]):
            return JsonResponse({'error': 'Missing required fields (start_date, end_date)'}, status=400)

        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()

        if start_date > end_date:
            return JsonResponse({'error': 'Start date cannot be after end date'}, status=400)

        # --- LEAVE BALANCE GUARD ---
        requested_days = (end_date - start_date).days + 1
        
        employee_detail = getattr(target_user, 'employeedetail', None)
        dept_id = str(employee_detail.department.id) if employee_detail and employee_detail.department else None

        balance_info = PolicyResolver.calculate_leave_balance(target_user, dept_id)
        
        balance_key = leave_type_enum.lower()
        if balance_key in balance_info:
            remaining = balance_info[balance_key]
            if requested_days > remaining:
                return JsonResponse({
                    'success': False, 
                    'error': f'Insufficient Leave Balance. You requested {requested_days} days, but only have {int(remaining)} days remaining for {leave_type_enum.label}.'
                }, status=400)

        leave_request = LeaveRequest.objects.create(
            user=target_user,
            leave_type=leave_type_enum,
            start_date=start_date,
            end_date=end_date,
            reason=reason,
            attachment=attachment,
            status=LeaveRequest.LeaveStatus.PENDING
        )

        # Audit who created the request (requester may be different from target_user)
        creator = requester
        log_audit_event(
            'LEAVE_REQUEST_CREATED',
            f'Leave request {leave_request.leave_type} for {target_user.username} created by {creator.username}.',
            user=creator,
            request=request,
        )

        return JsonResponse({
            'success': True,
            'message': f'Leave request for {requested_days} day(s) submitted successfully.',
            'request_id': str(leave_request.id)
        }, status=201)

    except (json.JSONDecodeError, ValueError) as e:
        return JsonResponse({'error': f'Invalid data format: {str(e)}'}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)

@csrf_exempt
def view_my_leave_requests(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    user, auth_err = require_auth(request)
    if auth_err: return auth_err

    try:
        requests = LeaveRequest.objects.filter(user=user).order_by('-created_at')
        data = []
        for req in requests:
            duration = (req.end_date - req.start_date).days + 1
            data.append({
                'id': str(req.id),
                'leave_type': req.leave_type.lower(),
                'start_date': str(req.start_date),
                'end_date': str(req.end_date),
                'days': duration,
                'reason': req.reason,
                'rejection_reason': req.rejection_reason,
                'status': req.status.lower(),
                'attachment': request.build_absolute_uri(req.attachment.url) if req.attachment else None,
                'approved_by': req.approved_by.username if req.approved_by else None,
                'requested_at': req.created_at.isoformat()
            })

        employee_detail = getattr(user, 'employeedetail', None)
        dept_id = str(employee_detail.department.id) if employee_detail and employee_detail.department else None
        
        balance_info = PolicyResolver.calculate_leave_balance(user, dept_id)

        summary = {
            'annual_left': int(balance_info.get('annual', 0)),
            'sick_left': int(balance_info.get('sick', 0)),
            'pending_count': requests.filter(status=LeaveRequest.LeaveStatus.PENDING).count(),
            'approved_count': requests.filter(status=LeaveRequest.LeaveStatus.APPROVED).count(),
            'balances': balance_info
        }

        return JsonResponse({'success': True, 'leave_requests': data, 'summary': summary})

    except Exception as e:
        return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)

# --- HR Officer Views ---

@csrf_exempt
def list_all_leave_requests(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    user, auth_err = require_staff(request)
    if auth_err: return auth_err

    try:
        status_filter = request.GET.get('status')
        query = LeaveRequest.objects.all().select_related('user', 'user__employeedetail__department')
        
        if status_filter and status_filter.upper() in LeaveRequest.LeaveStatus.values:
            query = query.filter(status=status_filter.upper())

        requests = query.order_by('-created_at')
        
        data = []
        for req in requests:
            duration = (req.end_date - req.start_date).days + 1
            employee_detail = getattr(req.user, 'employeedetail', None)
            dept_name = employee_detail.department.name if employee_detail and employee_detail.department else 'Unassigned'
            dept_id = str(employee_detail.department.id) if employee_detail and employee_detail.department else None
            
            balance_info = PolicyResolver.calculate_leave_balance(req.user, dept_id)
            current_balance = balance_info.get(req.leave_type.lower(), 0)
            
            data.append({
                'id': str(req.id),
                'employee_name': req.user.get_full_name() or req.user.username,
                'username': req.user.username,
                'email': req.user.email,
                'department': dept_name,
                'leave_type': req.leave_type.lower(),
                'start_date': str(req.start_date),
                'end_date': str(req.end_date),
                'days': duration,
                'balance': int(current_balance),
                'reason': req.reason or 'No reason provided',
                'rejection_reason': req.rejection_reason,
                'status': req.status.lower(),
                'attachment': request.build_absolute_uri(req.attachment.url) if req.attachment else None,
                'requested_at': req.created_at.isoformat() if req.created_at else None,
            })
            
        return JsonResponse({'success': True, 'leave_requests': data})

    except Exception as e:
        return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)


@csrf_exempt
def cancel_leave_request(request, request_id):
    user, auth_err = require_auth(request)
    if auth_err: return auth_err
    try:
        leave_request = LeaveRequest.objects.get(pk=request_id, user=user)
    except LeaveRequest.DoesNotExist:
        return JsonResponse({'error': 'Leave request not found.'}, status=404)
    if leave_request.status != LeaveRequest.LeaveStatus.PENDING:
        return JsonResponse({'error': 'Only pending requests can be cancelled.'}, status=400)
    leave_request.status = LeaveRequest.LeaveStatus.CANCELLED
    leave_request.save()
    log_audit_event('LEAVE_CANCELLED', f'{user.username} cancelled their {leave_request.leave_type} leave request.', user=user, request=request)
    return JsonResponse({'success': True, 'message': 'Leave request cancelled.'})

@csrf_exempt
def manage_leave_request(request, request_id):
    user, auth_err = require_staff(request)
    if auth_err: return auth_err

    try:
        leave_request = LeaveRequest.objects.get(pk=request_id)
    except LeaveRequest.DoesNotExist:
        return JsonResponse({'error': 'Leave request not found'}, status=404)

    if request.method == 'GET':
        employee_detail = getattr(leave_request.user, 'employeedetail', None)
        dept_name = employee_detail.department.name if employee_detail and employee_detail.department else 'Unassigned'

        data = {
            'id': str(leave_request.id),
            'employee_name': leave_request.user.get_full_name() or leave_request.user.username,
            'username': leave_request.user.username,
            'email': leave_request.user.email,
            'department': dept_name,
            'leave_type': leave_request.leave_type.lower(),
            'start_date': str(leave_request.start_date),
            'end_date': str(leave_request.end_date),
            'reason': leave_request.reason,
            'rejection_reason': leave_request.rejection_reason,
            'attachment': request.build_absolute_uri(leave_request.attachment.url) if leave_request.attachment else None,
            'status': leave_request.status.lower(),
        }
        return JsonResponse({'success': True, 'leave_request': data})

    if request.method in ['PUT', 'POST']:
        if leave_request.status != LeaveRequest.LeaveStatus.PENDING:
            return JsonResponse({'error': 'This request has already been processed.'}, status=400)
            
        try:
            data = json.loads(request.body)
        except:
            data = request.POST

        new_status = data.get('status', '').upper()

        if new_status == LeaveRequest.LeaveStatus.APPROVED:
            leave_request.status = LeaveRequest.LeaveStatus.APPROVED
            leave_request.approved_by = user
            leave_request.save()
            
            log_audit_event(
                'LEAVE_APPROVED',
                f'Approved {leave_request.leave_type} for {leave_request.user.username} by {user.username}.',
                user=user,
                request=request
            )
            return JsonResponse({'success': True, 'message': 'Leave request approved.'})
        elif new_status == LeaveRequest.LeaveStatus.REJECTED:
            leave_request.status = LeaveRequest.LeaveStatus.REJECTED
            leave_request.approved_by = user
            leave_request.rejection_reason = (data.get('rejection_reason') or '').strip() or None
            leave_request.save()
            
            log_audit_event(
                'LEAVE_REJECTED',
                f'Rejected {leave_request.leave_type} for {leave_request.user.username} by {user.username}.',
                user=user,
                request=request
            )
            return JsonResponse({'success': True, 'message': 'Leave request rejected.'})
        else:
            return JsonResponse({'error': 'Invalid status provided. Must be "APPROVED" or "REJECTED".'}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


@csrf_exempt
def policy_list_create(request):
    user, auth_err = require_staff(request)
    if auth_err: return auth_err

    if request.method == 'GET':
        category_filter = request.GET.get('category')
        policies = Policy.objects.all()
        if category_filter:
            policies = policies.filter(category=category_filter.upper())
        data = [{
            'id': str(p.id),
            'name': p.name,
            'category': p.category,
            'urgency': p.urgency,
            'description': p.description,
            'value': p.value,
            'is_active': p.is_active,
            'rules': p.rules,
            'departmentId': str(p.department_id) if p.department_id else None,
        } for p in policies]
        return JsonResponse({'success': True, 'policies': data})

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            policy = Policy.objects.create(
                name=data['name'],
                category=data.get('category', Policy.PolicyType.ATTENDANCE),
                urgency=data.get('urgency', Policy.PolicyUrgency.MEDIUM),
                description=data.get('description', ''),
                value=data.get('value', '0'),
                is_active=data.get('is_active', True),
                rules=data.get('rules', {}),
                department_id=data.get('departmentId')
            )
            log_audit_event(
                'POLICY_CREATED',
                f'Created policy "{policy.name}" ({policy.category}) with value "{policy.value}".',
                user=user,
                request=request,
            )
            return JsonResponse({'success': True, 'message': 'Policy created', 'id': str(policy.id)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def policy_detail(request, policy_id):
    user, auth_err = require_staff(request)
    if auth_err: return auth_err

    try:
        policy = Policy.objects.get(pk=policy_id)
    except Policy.DoesNotExist:
        return JsonResponse({'error': 'Policy not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({
            'success': True,
            'policy': {
                'id': str(policy.id),
                'name': policy.name,
                'category': policy.category,
                'urgency': policy.urgency,
                'description': policy.description,
                'value': policy.value,
                'is_active': policy.is_active,
                'rules': policy.rules,
                'departmentId': str(policy.department_id) if policy.department_id else None,
            }
        })

    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            previous_snapshot = {
                'name': policy.name,
                'category': policy.category,
                'urgency': policy.urgency,
                'value': policy.value,
                'is_active': policy.is_active,
            }
            policy.name = data.get('name', policy.name)
            policy.category = data.get('category', policy.category)
            policy.urgency = data.get('urgency', policy.urgency)
            policy.description = data.get('description', policy.description)
            policy.value = data.get('value', policy.value)
            policy.is_active = data.get('is_active', policy.is_active)
            if 'rules' in data:
                policy.rules = data['rules']
            if 'departmentId' in data:
                policy.department_id = data['departmentId']
            policy.save()
            log_audit_event(
                'POLICY_UPDATED',
                (
                    f'Updated policy "{policy.name}". '
                    f'Previous state: {previous_snapshot}. '
                    f'Current state: '
                    f'{{"name": "{policy.name}", "category": "{policy.category}", '
                    f'"urgency": "{policy.urgency}", "value": "{policy.value}", '
                    f'"is_active": {policy.is_active}}}.'
                ),
                user=user,
                request=request,
            )
            return JsonResponse({'success': True, 'message': 'Policy updated'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    if request.method == 'DELETE':
        policy_name = policy.name
        policy_category = policy.category
        policy_value = policy.value
        policy.delete()
        log_audit_event(
            'POLICY_DELETED',
            f'Deleted policy "{policy_name}" ({policy_category}) with previous value "{policy_value}".',
            user=user,
            request=request,
        )
        return JsonResponse({'success': True, 'message': 'Policy deleted'}, status=200)

    return JsonResponse({'error': 'Method not allowed'}, status=405)
