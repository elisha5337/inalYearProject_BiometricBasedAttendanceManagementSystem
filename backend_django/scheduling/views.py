from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Shift, Assignment, Holiday
from accounts.models import User, Role, Department
import json
from datetime import datetime

# Unified Auth Helpers
from hu_attendance_system.auth_utils import require_auth, require_staff, is_admin, is_hr
from reporting.utils import log_audit_event

# --- Shift Management Views (CRUD) ---

@csrf_exempt
def shift_list_create(request):
    user, err = require_staff(request)
    if err: return err

    if request.method == 'GET':
        from django.db.models import Count
        shifts = Shift.objects.all().select_related('department').annotate(employees_count=Count('assignment'))
        data = [{
            'id': str(shift.id),
            'name': shift.name,
            'description': shift.description or '',
            'department': shift.department.name if shift.department else 'Unassigned',
            'department_id': str(shift.department.id) if shift.department else None,
            'start_time': shift.start_time.strftime('%I:%M %p'),
            'end_time': shift.end_time.strftime('%I:%M %p'),
            'grace_period': f"{shift.grace_period} mins",
            'work_days': shift.work_days,
            'employeesCount': shift.employees_count
        } for shift in shifts]
        return JsonResponse({'success': True, 'shifts': data})

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            if not data.get('name') or not data.get('start_time') or not data.get('end_time'):
                return JsonResponse({'error': 'Missing required fields'}, status=400)

            department = Department.objects.get(id=data.get('department_id')) if data.get('department_id') else None
            
            shift = Shift.objects.create(
                name=data['name'],
                description=data.get('description'),
                department=department,
                start_time=data['start_time'],
                end_time=data['end_time'],
                grace_period=int(data.get('grace_period', 15)),
                work_days=data.get('work_days', 'Mon - Fri')
            )

            log_audit_event('SHIFT_CREATED', f'Created shift "{shift.name}".', user=user, request=request)
            return JsonResponse({'success': True, 'message': 'Shift created successfully', 'shift_id': str(shift.id)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def shift_detail(request, shift_id):
    user, err = require_staff(request)
    if err: return err
    try:
        shift = Shift.objects.get(pk=shift_id)
    except Shift.DoesNotExist:
        return JsonResponse({'error': 'Shift not found'}, status=404)

    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            if 'name' in data: shift.name = data['name']
            if 'description' in data: shift.description = data['description']
            if 'start_time' in data: shift.start_time = data['start_time']
            if 'end_time' in data: shift.end_time = data['end_time']
            if 'grace_period' in data: shift.grace_period = int(data['grace_period'])
            if 'work_days' in data: shift.work_days = data['work_days']
            if 'department_id' in data:
                shift.department = Department.objects.get(id=data['department_id']) if data['department_id'] else None

            shift.save()
            log_audit_event('SHIFT_UPDATED', f'Updated shift "{shift.name}".', user=user, request=request)
            return JsonResponse({'success': True, 'message': 'Shift updated successfully'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    if request.method == 'DELETE':
        shift.delete()
        log_audit_event('SHIFT_DELETED', f'Deleted shift ID: {shift_id}.', user=user, request=request)
        return JsonResponse({'success': True, 'message': 'Shift deleted successfully'}, status=200)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

# --- Assignment Management Views ---

@csrf_exempt
def assignment_list_create(request):
    user, err = require_staff(request)
    if err: return err

    if request.method == 'GET':
        assignments = Assignment.objects.all().select_related('user', 'shift').order_by('-from_date')
        data = [{
            'id': str(assignment.id),
            'employeeName': assignment.user.get_full_name() or assignment.user.username,
            'userName': assignment.user.username,
            'shiftName': assignment.shift.name,
            'from_date': assignment.from_date,
            'to_date': assignment.to_date,
            'assigned_by': assignment.assigned_by.get_full_name() or assignment.assigned_by.username if assignment.assigned_by else 'System',
        } for assignment in assignments]
        return JsonResponse({'success': True, 'assignments': data})

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            employee = User.objects.get(id=data['user_id'])
            shift = Shift.objects.get(id=data['shift_id'])
            
            assignment = Assignment.objects.create(
                user=employee,
                shift=shift,
                from_date=data['from_date'],
                to_date=data.get('to_date'),
                assigned_by=user
            )
            log_audit_event('ASSIGNMENT_CREATED', f'Assigned {employee.username} to {shift.name}.', user=user, request=request)
            return JsonResponse({'success': True, 'message': 'Assignment created successfully', 'assignment_id': str(assignment.id)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def assignment_detail(request, assignment_id):
    """Restored view to handle deletion of individual assignments."""
    user, err = require_staff(request)
    if err: return err
    try:
        assignment = Assignment.objects.get(pk=assignment_id)
        details = f"Removed assignment for {assignment.user.username} from {assignment.shift.name}."
        assignment.delete()
        log_audit_event('ASSIGNMENT_DELETED', details, user=user, request=request)
        return JsonResponse({'success': True, 'message': 'Assignment removed successfully'})
    except Assignment.DoesNotExist:
        return JsonResponse({'error': 'Assignment not found'}, status=404)

# --- Holiday Management Views (New) ---

@csrf_exempt
def holiday_list_create(request):
    """View to list and create institutional holidays."""
    user, err = require_staff(request)
    if err: return err

    if request.method == 'GET':
        holidays = Holiday.objects.all()
        data = [{
            'id': str(h.id),
            'name': h.name,
            'date': str(h.date),
            'is_recurring': h.is_recurring,
            'description': h.description or ''
        } for h in holidays]
        return JsonResponse({'success': True, 'holidays': data})

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            holiday = Holiday.objects.create(
                name=data['name'],
                date=data['date'],
                is_recurring=data.get('is_recurring', False),
                description=data.get('description', '')
            )
            log_audit_event('HOLIDAY_CREATED', f'Added holiday: {holiday.name} ({holiday.date})', user=user, request=request)
            return JsonResponse({'success': True, 'message': 'Holiday added successfully', 'id': str(holiday.id)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def delete_holiday(request, holiday_id):
    user, err = require_staff(request)
    if err: return err
    try:
        holiday = Holiday.objects.get(pk=holiday_id)
        name = holiday.name
        holiday.delete()
        log_audit_event('HOLIDAY_DELETED', f'Removed holiday: {name}', user=user, request=request)
        return JsonResponse({'success': True, 'message': 'Holiday removed'})
    except Holiday.DoesNotExist:
        return JsonResponse({'error': 'Holiday not found'}, status=404)

@csrf_exempt
def my_assignments(request):
    user, err = require_auth(request)
    if err: return err
    if request.method == 'GET':
        assignments = Assignment.objects.filter(user=user).select_related('shift')
        data = [{
            'id': str(assignment.id),
            'shift': assignment.shift.name,
            'time': f"{assignment.shift.start_time.strftime('%I:%M %p')} - {assignment.shift.end_time.strftime('%I:%M %p')}",
            'from_date': assignment.from_date,
            'to_date': assignment.to_date,
        } for assignment in assignments]
        return JsonResponse({'success': True, 'assignments': data})
    return JsonResponse({'error': 'Method not allowed'}, status=405)
