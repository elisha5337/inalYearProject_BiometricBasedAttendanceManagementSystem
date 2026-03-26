from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .models import LeaveRequest, Policy
from accounts.models import User, Role
import json
from datetime import datetime

# --- Authentication & Permission Helpers ---

def get_user_from_request(request):
    # Placeholder for a real authentication system (e.g., JWT)
    if request.user.is_authenticated:
        return request.user
    return None

def is_admin(user):
    # Checks if the user is a superuser or has the 'Administrator' role.
    if user.is_superuser:
        return True
    try:
        admin_role = Role.objects.get(name='Administrator')
        return user.roles.filter(id=admin_role.id).exists()
    except Role.DoesNotExist:
        return False

# --- Employee-Facing Views ---

@csrf_exempt
def submit_leave_request(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    user = get_user_from_request(request)
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    try:
        data = json.loads(request.body)
        leave_type = data.get('leave_type')
        start_date_str = data.get('start_date')
        end_date_str = data.get('end_date')

        reason = data.get('reason', '')
        
        if not all([leave_type, start_date_str, end_date_str]):
            return JsonResponse({'error': 'Missing required fields'}, status=400)

        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()

        if start_date > end_date:
            return JsonResponse({'error': 'Start date cannot be after end date'}, status=400)

        leave_request = LeaveRequest.objects.create(
            user=user,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            reason=reason,
            status=LeaveRequest.LeaveStatus.PENDING
        )

        return JsonResponse({
            'success': True,
            'message': 'Leave request submitted successfully.',
            'request_id': leave_request.id
        }, status=201)

    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'error': 'Invalid data format'}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)

@csrf_exempt
def view_my_leave_requests(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    user = get_user_from_request(request)
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    try:
        requests = LeaveRequest.objects.filter(user=user).order_by('-start_date')
        data = [{
            'id': req.id,
            'leave_type': req.get_leave_type_display(),
            'start_date': req.start_date,
            'end_date': req.end_date,
            'reason': req.reason,
            'status': req.get_status_display(),
            'approved_by': req.approved_by.username if req.approved_by else None
        } for req in requests]

        # --- Calculate Dynamic Summary ---
        # Fetch allocations from Policy Table
        try:
            annual_policy = Policy.objects.filter(category='LEAVE', name__icontains='Annual').first()
            medical_policy = Policy.objects.filter(category='LEAVE', name__icontains='Medical').first()
            
            # Extract numbers from policy value (e.g. "20 Days" -> 20)
            def extract_quota(p, default):
                if not p or not p.value: return default
                import re
                nums = re.findall(r'\d+', p.value)
                return int(nums[0]) if nums else default

            ANNUAL_ALLOWANCE = extract_quota(annual_policy, 20)
            SICK_ALLOWANCE = extract_quota(medical_policy, 12)
        except:
            ANNUAL_ALLOWANCE = 20
            SICK_ALLOWANCE = 10
        
        annual_taken = 0
        sick_taken = 0
        for r in requests.filter(status=LeaveRequest.LeaveStatus.APPROVED):
            days = (r.end_date - r.start_date).days + 1
            if r.leave_type == LeaveRequest.LeaveType.ANNUAL:
                annual_taken += days
            elif r.leave_type == LeaveRequest.LeaveType.SICK:
                sick_taken += days

        summary = {
            'annual_left': max(0, ANNUAL_ALLOWANCE - annual_taken),
            'sick_left': max(0, SICK_ALLOWANCE - sick_taken),
            'pending_count': requests.filter(status=LeaveRequest.LeaveStatus.PENDING).count(),
            'approved_count': requests.filter(status=LeaveRequest.LeaveStatus.APPROVED).count()
        }

        return JsonResponse({'success': True, 'leave_requests': data, 'summary': summary})

    except Exception as e:
        return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)

# --- HR Officer Views ---

@csrf_exempt
def list_all_leave_requests(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    user = get_user_from_request(request)
    if not user or not is_admin(user):
        return JsonResponse({'error': 'Permission denied. Administrator role required.'}, status=403)

    try:
        # HR can filter by status (e.g., /?status=PENDING)
        status_filter = request.GET.get('status')
        query = LeaveRequest.objects.all()
        if status_filter and status_filter.upper() in LeaveRequest.LeaveStatus.values:
            query = query.filter(status=status_filter.upper())

        requests = query.order_by('start_date').select_related('user').defer('reason')
        data = [{'id': str(req.id),
            'employee_name': req.user.get_full_name() or req.user.username,
            'leave_type': req.get_leave_type_display(),
            'start_date': str(req.start_date),
            'end_date': str(req.end_date),
            'status': req.get_status_display(),
        } for req in requests]
        return JsonResponse({'success': True, 'leave_requests': data})

    except Exception as e:
        return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)


@csrf_exempt
def manage_leave_request(request, request_id):
    user = get_user_from_request(request)
    if not user or not is_admin(user):
        return JsonResponse({'error': 'Permission denied. Administrator role required.'}, status=403)

    try:
        leave_request = LeaveRequest.objects.get(pk=request_id)
    except LeaveRequest.DoesNotExist:
        return JsonResponse({'error': 'Leave request not found'}, status=404)

    if request.method == 'GET':
        data = {
            'id': leave_request.id,
            'employee_name': leave_request.user.get_full_name() or leave_request.user.username,
            'leave_type': leave_request.get_leave_type_display(),
            'start_date': leave_request.start_date,
            'end_date': leave_request.end_date,
            'status': leave_request.get_status_display(),
        }
        return JsonResponse({'success': True, 'leave_request': data})

    if request.method == 'PUT':
        if leave_request.status != LeaveRequest.LeaveStatus.PENDING:
            return JsonResponse({'error': 'This request has already been processed.'}, status=400)
            
        data = json.loads(request.body)
        new_status = data.get('status', '').upper()

        if new_status == LeaveRequest.LeaveStatus.APPROVED:
            leave_request.status = LeaveRequest.LeaveStatus.APPROVED
            leave_request.approved_by = user
            leave_request.save()
            # Here you might trigger a notification to the employee
            return JsonResponse({'success': True, 'message': 'Leave request approved.'})
        elif new_status == LeaveRequest.LeaveStatus.REJECTED:
            leave_request.status = LeaveRequest.LeaveStatus.REJECTED
            leave_request.approved_by = user
            leave_request.save()
            # Here you might trigger a notification to the employee
            return JsonResponse({'success': True, 'message': 'Leave request rejected.'})
        else:
            return JsonResponse({'error': 'Invalid status provided. Must be "APPROVED" or "REJECTED".'}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


@csrf_exempt
def policy_list_create(request):
    user = get_user_from_request(request)
    if not user or not is_admin(user):
        return JsonResponse({'error': 'Permission denied. Administrator role required.'}, status=403)

    if request.method == 'GET':
        category_filter = request.GET.get('category')
        policies = Policy.objects.all()
        if category_filter:
            policies = policies.filter(category=category_filter.upper())
        data = [{
            'id': p.id,
            'name': p.name,
            'category': p.category,
            'urgency': p.urgency,
            'description': p.description,
            'value': p.value,
            'is_active': p.is_active,
            'rules': p.rules,
            'departmentId': p.department_id,
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
            return JsonResponse({'success': True, 'message': 'Policy created', 'id': policy.id}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def policy_detail(request, policy_id):
    user = get_user_from_request(request)
    if not user or not is_admin(user):
        return JsonResponse({'error': 'Permission denied. Administrator role required.'}, status=403)

    try:
        policy = Policy.objects.get(pk=policy_id)
    except Policy.DoesNotExist:
        return JsonResponse({'error': 'Policy not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({
            'success': True,
            'policy': {
                'id': policy.id,
                'name': policy.name,
                'category': policy.category,
                'urgency': policy.urgency,
                'description': policy.description,
                'value': policy.value,
                'is_active': policy.is_active,
                'rules': policy.rules,
                'departmentId': policy.department_id,
            }
        })

    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
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
            return JsonResponse({'success': True, 'message': 'Policy updated'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    if request.method == 'DELETE':
        policy.delete()
        return JsonResponse({'success': True, 'message': 'Policy deleted'}, status=200)

    return JsonResponse({'error': 'Method not allowed'}, status=405)
