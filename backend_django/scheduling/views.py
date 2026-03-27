from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Shift, Assignment
from accounts.models import User, Role, Department
import json
from datetime import datetime

# --- Permission Helpers (Should be moved to a central utility module) ---

def get_user_from_request(request):
    if request.user.is_authenticated:
        return request.user
    return None

# Forced reload at : 2026-03-27 10:20
def can_manage_scheduling(user):
    # Check if user has HR or Admin roles
    if not user: return False
    return user.is_hr_officer or user.is_administrator

# --- Shift Management Views (CRUD) ---

@csrf_exempt
def shift_list_create(request):
    user = get_user_from_request(request)
    if not can_manage_scheduling(user):
        return JsonResponse({'error': 'Permission denied'}, status=403)

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
            return JsonResponse({'success': True, 'message': 'Shift created successfully', 'shift_id': str(shift.id)}, status=201)
        except (KeyError, Department.DoesNotExist):
            return JsonResponse({'error': 'Invalid data provided'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def shift_detail(request, shift_id):
    user = get_user_from_request(request)
    if not can_manage_scheduling(user):
        return JsonResponse({'error': 'Permission denied'}, status=403)

    try:
        shift = Shift.objects.get(pk=shift_id)
    except Shift.DoesNotExist:
        return JsonResponse({'error': 'Shift not found'}, status=404)

    if request.method == 'GET':
        data = {
            'id': str(shift.id),
            'name': shift.name,
            'description': shift.description or '',
            'department_id': str(shift.department.id) if shift.department else None,
            'start_time': shift.start_time.strftime('%H:%M'),
            'end_time': shift.end_time.strftime('%H:%M'),
            'grace_period': shift.grace_period,
            'work_days': shift.work_days
        }
        return JsonResponse({'success': True, 'shift': data})

    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            shift.name = data.get('name', shift.name)
            shift.description = data.get('description', shift.description)
            shift.start_time = data.get('start_time', shift.start_time)
            shift.end_time = data.get('end_time', shift.end_time)
            shift.grace_period = int(data.get('grace_period', shift.grace_period))
            shift.work_days = data.get('work_days', shift.work_days)
            
            if 'department_id' in data:
                shift.department = Department.objects.get(id=data['department_id']) if data['department_id'] else None
            shift.save()
            return JsonResponse({'success': True, 'message': 'Shift updated successfully'})
        except (KeyError, Department.DoesNotExist):
            return JsonResponse({'error': 'Invalid data provided'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    if request.method == 'DELETE':
        shift.delete()
        return JsonResponse({'success': True, 'message': 'Shift deleted successfully'}, status=204)

# --- Assignment Management Views ---

@csrf_exempt
def assignment_list_create(request):
    user = get_user_from_request(request)
    if not can_manage_scheduling(user):
        return JsonResponse({'error': 'Permission denied'}, status=403)

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
            return JsonResponse({'success': True, 'message': 'Assignment created successfully', 'assignment_id': assignment.id}, status=201)
        except (KeyError, User.DoesNotExist, Shift.DoesNotExist):
            return JsonResponse({'error': 'Invalid data provided'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def assignment_detail(request, assignment_id):
    user = get_user_from_request(request)
    if not can_manage_scheduling(user):
        return JsonResponse({'error': 'Permission denied'}, status=403)

    try:
        assignment = Assignment.objects.get(pk=assignment_id)
    except Assignment.DoesNotExist:
        return JsonResponse({'error': 'Assignment not found'}, status=404)

    if request.method == 'DELETE':
        assignment.delete()
        return JsonResponse({'success': True, 'message': 'Assignment deleted successfully'}, status=204)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def my_assignments(request):
    user = get_user_from_request(request)
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
        
    if request.method == 'GET':
        assignments = Assignment.objects.filter(user=user).select_related('shift')
        data = [{
            'id': assignment.id,
            'shift': assignment.shift.name,
            'time': f"{assignment.shift.start_time.strftime('%I:%M %p')} - {assignment.shift.end_time.strftime('%I:%M %p')}",
            'from_date': assignment.from_date,
            'to_date': assignment.to_date,
        } for assignment in assignments]
        return JsonResponse({'success': True, 'assignments': data})
        
    return JsonResponse({'error': 'Method not allowed'}, status=405)
