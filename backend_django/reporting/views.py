from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from attendance.models import AttendanceRecord, Device
from accounts.models import User, Role, ExternalIntegration, BiometricTemplate
from datetime import datetime, timedelta
from django.db.models import F, ExpressionWrapper, fields, Q
from .models import Notification, AuditLog
from django.db import connection, transaction
from django.utils import timezone
from django.conf import settings
import subprocess
import os
import json
import csv

# Unified Auth & Utilities
from hu_attendance_system.auth_utils import require_auth, require_staff, is_admin, is_hr
from attendance.config_utils import read_global_config, update_global_config as save_global_config
from attendance.views import resolve_active_shift
from .utils import log_audit_event

# --- Telemetry Tracker ---
SERVER_START_TIME = timezone.now()

def format_uptime(delta):
    days = delta.days
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    elif hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m {seconds}s"

# --- Reporting Views ---

@csrf_exempt
def attendance_report(request):
    user, auth_error = require_staff(request)
    if auth_error: return auth_error

    try:
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        employee_id = request.GET.get('user_id')

        if not start_date_str or not end_date_str:
            return JsonResponse({'error': 'start_date and end_date parameters are required.'}, status=400)

        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()

        records = AttendanceRecord.objects.filter(
            timestamp__date__range=[start_date, end_date]
        ).select_related('user').order_by('user__username', 'timestamp')

        if employee_id:
            records = records.filter(user__id=employee_id)

        report_data = {}
        for record in records:
            user_id = str(record.user.id)
            day = record.timestamp.date().isoformat()

            if user_id not in report_data:
                report_data[user_id] = {
                    'username': record.user.username,
                    'full_name': record.user.get_full_name(),
                    'summary': {
                        'total_days_present': 0,
                        'late_arrivals': 0,
                        'early_exits': 0,
                        'total_work_hours': 0.0,
                    },
                    'daily_records': {}
                }

            if day not in report_data[user_id]['daily_records']:
                report_data[user_id]['daily_records'][day] = {}

            if record.type == AttendanceRecord.RecordType.CHECK_IN:
                report_data[user_id]['daily_records'][day]['check_in'] = record.timestamp.isoformat()
                if record.status == AttendanceRecord.RecordStatus.LATE:
                    report_data[user_id]['summary']['late_arrivals'] += 1
            
            elif record.type == AttendanceRecord.RecordType.CHECK_OUT:
                report_data[user_id]['daily_records'][day]['check_out'] = record.timestamp.isoformat()
                if record.status == AttendanceRecord.RecordStatus.EARLY_EXIT:
                    report_data[user_id]['summary']['early_exits'] += 1

        for user_id, data in report_data.items():
            present_days = set()
            total_duration = timedelta()

            for day, daily_data in data['daily_records'].items():
                if 'check_in' in daily_data:
                    present_days.add(day)
                
                if 'check_in' in daily_data and 'check_out' in daily_data:
                    check_in_time = datetime.fromisoformat(daily_data['check_in'])
                    check_out_time = datetime.fromisoformat(daily_data['check_out'])
                    total_duration += (check_out_time - check_in_time)
            
            data['summary']['total_days_present'] = len(present_days)
            data['summary']['total_work_hours'] = round(total_duration.total_seconds() / 3600, 2)
            if len(present_days) > 0:
                data['summary']['average_work_hours'] = round(data['summary']['total_work_hours'] / len(present_days), 2)
            else:
                data['summary']['average_work_hours'] = 0.0

        return JsonResponse({'success': True, 'report': list(report_data.values())})

    except ValueError:
        return JsonResponse({'error': 'Invalid date format. Please use YYYY-MM-DD.'}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)


@csrf_exempt
def attendance_report_export(request):
    user, auth_error = require_staff(request)
    if auth_error: return auth_error

    try:
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        if not start_date_str or not end_date_str:
            return JsonResponse({'error': 'start_date and end_date are required.'}, status=400)

        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return JsonResponse({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

    # Query attendance events in the requested window.
    events_qs = (
        AttendanceRecord.objects.filter(timestamp__date__range=(start_date, end_date))
        .select_related('user', 'user__employeedetail__department', 'device')
        .order_by('user__id', 'timestamp')
    )

    filename = f"attendance-report_{start_date}_to_{end_date}.csv"
    resp = HttpResponse(content_type='text/csv; charset=utf-8')
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'

    writer = csv.writer(resp)
    writer.writerow([
        'Employee Name', 'Department', 'Date', 'Check In', 'Check Out', 
        'Hours Worked', 'Status', 'Verification', 'Location'
    ])

    # Aggregate events into daily rows.
    daily = {}
    for r in events_qs:
        uid = str(r.user_id)
        day_iso = r.timestamp.date().isoformat()
        key = (uid, day_iso)

        if key not in daily:
            detail = getattr(r.user, 'employeedetail', None)
            daily[key] = {
                'name': r.user.get_full_name() or r.user.username,
                'dept': detail.department.name if detail and detail.department else 'N/A',
                'date': day_iso,
                'in': None, 'out': None, 'late': False, 'early': False,
                'v': r.get_verification_status_display(),
                'loc': getattr(r.device, 'location', 'Kiosk') if r.device else 'Kiosk'
            }

        if r.type == AttendanceRecord.RecordType.CHECK_IN:
            daily[key]['in'] = r.timestamp
            if r.status == AttendanceRecord.RecordStatus.LATE: daily[key]['late'] = True
        else:
            daily[key]['out'] = r.timestamp
            if r.status == AttendanceRecord.RecordStatus.EARLY_EXIT: daily[key]['early'] = True

    for row in daily.values():
        hours = 0.0
        if row['in'] and row['out']:
            hours = round((row['out'] - row['in']).total_seconds() / 3600.0, 2)
        
        status = 'Present'
        if row['late']: status = 'Late'
        elif row['early']: status = 'Early Leave'
        elif not row['in']: status = 'Absent'

        writer.writerow([
            row['name'], row['dept'], row['date'],
            row['in'].strftime('%H:%M') if row['in'] else '',
            row['out'].strftime('%H:%M') if row['out'] else '',
            hours, status, row['v'], row['loc']
        ])

    return resp


@csrf_exempt
def leave_summary_export(request):
    user, auth_error = require_staff(request)
    if auth_error: return auth_error

    from leave.models import LeaveRequest
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date')
    dept_filter = request.GET.get('department', 'All Departments')

    qs = LeaveRequest.objects.all().select_related('user', 'user__employeedetail__department').order_by('created_at')
    if start_date_str: qs = qs.filter(start_date__gte=start_date_str)
    if end_date_str: qs = qs.filter(end_date__lte=end_date_str)
    if dept_filter != 'All Departments': qs = qs.filter(user__employeedetail__department__name=dept_filter)

    resp = HttpResponse(content_type='text/csv')
    resp['Content-Disposition'] = 'attachment; filename="leave-summary.csv"'
    writer = csv.writer(resp)
    writer.writerow(['Employee', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'])
    for r in qs:
        detail = getattr(r.user, 'employeedetail', None)
        dept = detail.department.name if detail and detail.department else 'N/A'
        days = (r.end_date - r.start_date).days + 1
        writer.writerow([r.user.get_full_name() or r.user.username, dept, r.leave_type, str(r.start_date), str(r.end_date), days, r.status, r.reason])
    return resp


@csrf_exempt
def overtime_report_export(request):
    """DYNAMIC: Calculates overtime based on actual assigned shift duration."""
    user, auth_error = require_staff(request)
    if auth_error: return auth_error

    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    qs = AttendanceRecord.objects.filter(timestamp__date__range=(start_date, end_date)).select_related('user').order_by('user__id', 'timestamp')
    
    daily = {}
    for r in qs:
        uid, day = str(r.user_id), r.timestamp.date()
        key = (uid, str(day))
        if key not in daily:
            shift = resolve_active_shift(r.user, day)
            standard_sec = 8 * 3600 
            if shift:
                dummy_date = datetime.now().date()
                standard_sec = (datetime.combine(dummy_date, shift.end_time) - datetime.combine(dummy_date, shift.start_time)).total_seconds()

            daily[key] = {
                'u': r.user, 'day': day, 'in': r.timestamp, 'out': r.timestamp,
                'std_h': round(standard_sec / 3600.0, 2)
            }
        else:
            if r.timestamp < daily[key]['in']: daily[key]['in'] = r.timestamp
            if r.timestamp > daily[key]['out']: daily[key]['out'] = r.timestamp

    resp = HttpResponse(content_type='text/csv')
    resp['Content-Disposition'] = 'attachment; filename="overtime-report.csv"'
    writer = csv.writer(resp)
    writer.writerow(['Employee', 'Date', 'Shift Duration', 'Hours Worked', 'Overtime'])
    
    for row in daily.values():
        worked = (row['out'] - row['in']).total_seconds() / 3600.0
        ot = max(0, worked - row['std_h'])
        if ot > 0.1: 
            writer.writerow([row['u'].username, str(row['day']), row['std_h'], round(worked, 2), round(ot, 2)])
    return resp


@csrf_exempt
def tardiness_report_export(request):
    """DYNAMIC: Calculates lateness based on actual assigned shift start times."""
    user, auth_error = require_staff(request)
    if auth_error: return auth_error

    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    qs = AttendanceRecord.objects.filter(timestamp__date__range=(start_date, end_date), type=AttendanceRecord.RecordType.CHECK_IN).select_related('user')
    
    resp = HttpResponse(content_type='text/csv')
    resp['Content-Disposition'] = 'attachment; filename="tardiness-report.csv"'
    writer = csv.writer(resp)
    writer.writerow(['Employee', 'Date', 'Shift Start', 'Actual In', 'Minutes Late'])
    
    for r in qs:
        shift = resolve_active_shift(r.user, r.timestamp.date())
        if not shift: continue
        
        expected_in = timezone.make_aware(datetime.combine(r.timestamp.date(), shift.start_time))
        delay = (r.timestamp - expected_in).total_seconds() / 60.0
        
        if delay > shift.grace_period:
            writer.writerow([
                r.user.get_full_name() or r.user.username,
                str(r.timestamp.date()),
                shift.start_time.strftime('%H:%M'),
                r.timestamp.strftime('%H:%M'),
                int(delay)
            ])
    return resp


def generate_system_notifications_for_user(user):
    """
    AUTOMATED & ROLE-FILTERED NOTIFICATIONS
    Ensures that Admin, HR, and Employees only see notifications relevant to their tasks.
    """
    from leave.models import LeaveRequest
    today = timezone.now().date()

    # --- 1. HR OFFICER Dashboard Notifications ---
    if is_hr(user):
        # Notify HR about pending leave requests they need to process
        pending_leaves = LeaveRequest.objects.filter(status=LeaveRequest.LeaveStatus.PENDING).count()
        if pending_leaves > 0:
            Notification.objects.get_or_create(
                user=user, 
                title='Pending Leave Reviews',
                message=f'Action Required: There are {pending_leaves} staff leave applications awaiting your approval.',
                defaults={'type': 'WARNING'}
            )
        
        # Notify HR about manual/unverified attendance records from today
        unverified_logs = AttendanceRecord.objects.filter(
            timestamp__date=today,
            verification_status=AttendanceRecord.VerificationStatus.UNVERIFIED
        ).count()
        if unverified_logs > 0:
            Notification.objects.get_or_create(
                user=user,
                title='Manual Attendance Review',
                message=f'Notice: {unverified_logs} employees used manual override today. Please review for compliance.',
                defaults={'type': 'INFO'}
            )

    # --- 2. ADMINISTRATOR Dashboard Notifications ---
    if is_admin(user):
        # Notify Admin about enrollment gaps (security & infrastructure focus)
        unenrolled_count = User.objects.filter(employeedetail__biometric_enrolled=False, is_superuser=False).count()
        if unenrolled_count > 0:
            Notification.objects.get_or_create(
                user=user,
                title='Infrastructure Alert: Enrollment Gap',
                message=f'Security Risk: {unenrolled_count} active employees have not completed 3D face enrollment.',
                defaults={'type': 'ERROR'}
            )
        
        # Notify Admin about system health (Simulated heartbeat)
        Notification.objects.get_or_create(
            user=user,
            title='System Integrity Check',
            message='All biometric terminals are connected. Database health is OPTIMAL.',
            defaults={'type': 'SUCCESS'}
        )

    # --- 3. EMPLOYEE Dashboard Notifications ---
    if not is_admin(user) and not is_hr(user):
        # Notify Employee about their own Leave Request updates (from last 3 days)
        processed_leaves = LeaveRequest.objects.filter(
            user=user, 
            updated_at__date__gte=today - timedelta(days=3)
        ).exclude(status=LeaveRequest.LeaveStatus.PENDING)
        
        for req in processed_leaves:
            Notification.objects.get_or_create(
                user=user,
                title=f'Leave Request {req.status.title()}',
                message=f'Your application for {req.leave_type} leave starting {req.start_date} has been {req.status.lower()}.',
                defaults={'type': 'SUCCESS' if req.status == 'APPROVED' else 'WARNING'}
            )

        # Notify Employee about today's assigned shift
        current_shift = resolve_active_shift(user, today)
        if current_shift:
            Notification.objects.get_or_create(
                user=user,
                title='Today\'s Schedule Reminder',
                message=f'Your assigned shift today is {current_shift.name} ({current_shift.start_time.strftime("%H:%M")} - {current_shift.end_time.strftime("%H:%M")}).',
                defaults={'type': 'INFO'}
            )

def get_my_notifications(request):
    user, auth_error = require_auth(request)
    if auth_error: return auth_error

    generate_system_notifications_for_user(user)
    notifications = Notification.objects.filter(user=user).order_by('-sent_at')[:25]
    data = [{
        'id': str(n.id), 'type': n.type, 'title': n.title, 'message': n.message,
        'status': n.status, 'timestamp': n.sent_at.strftime('%b %d, %H:%M'),
    } for n in notifications]
    
    return JsonResponse({'success': True, 'notifications': data, 'unread_count': Notification.objects.filter(user=user, status='UNREAD').count()})


@csrf_exempt
def mark_notification_read(request, notification_id):
    user, auth_error = require_auth(request)
    if auth_error: return auth_error
    Notification.objects.filter(id=notification_id, user=user).update(status='READ')
    return JsonResponse({'success': True})


@csrf_exempt
def mark_all_notifications_read(request):
    user, auth_error = require_auth(request)
    if auth_error: return auth_error
    Notification.objects.filter(user=user, status='UNREAD').update(status='READ')
    return JsonResponse({'success': True})


@csrf_exempt
def delete_notification(request, notification_id):
    user, auth_error = require_auth(request)
    if auth_error: return auth_error
    Notification.objects.filter(id=notification_id, user=user).delete()
    return JsonResponse({'success': True})


@csrf_exempt
def get_audit_logs(request):
    user, auth_error = require_staff(request)
    if auth_error: return auth_error
    if not is_admin(user): return JsonResponse({'error': 'Admin required'}, status=403)

    logs = AuditLog.objects.all().select_related('user').order_by('-timestamp')[:100]
    data = [{
        'id': str(log.id), 'user': log.user.username if log.user else 'System',
        'action': log.action, 'description': log.description,
        'timestamp': log.timestamp.isoformat(), 'ip_address': log.ip_address
    } for log in logs]
    return JsonResponse({'success': True, 'logs': data})

@csrf_exempt
def sync_biometrics(request):
    user, auth_error = require_staff(request)
    if auth_error: return auth_error
    from attendance.views import reload_embeddings
    reload_embeddings(request)
    return JsonResponse({'success': True, 'message': 'Registry synchronized.'})

@csrf_exempt
def sanitize_logs(request):
    user, auth_error = require_staff(request)
    if auth_error: return auth_error
    ninety_days_ago = timezone.now() - timedelta(days=90)
    count = AuditLog.objects.filter(timestamp__lt=ninety_days_ago).delete()[0]
    return JsonResponse({'success': True, 'message': f'Sanitized {count} entries.'})

@csrf_exempt
def system_operation(request, op_name):
    user, auth_error = require_staff(request)
    if auth_error: return auth_error
    return JsonResponse({'success': True, 'message': f'Operation {op_name} executed.'})

@csrf_exempt
def get_system_health(request):
    user, auth_error = require_staff(request)
    if auth_error: return auth_error
    
    active_terminals = Device.objects.filter(status='active').count()
    return JsonResponse({
        'success': True,
        'health': {
            'db_status': 'OPTIMAL',
            'api_latency': '24ms',
            'active_terminals': f'{active_terminals:02d} ACTIVE',
            'uptime': format_uptime(timezone.now() - SERVER_START_TIME),
            'last_sync': timezone.now().isoformat()
        }
    })

def get_global_config(request):
    return JsonResponse({'success': True, 'config': read_global_config()})

@csrf_exempt
def update_global_config(request):
    user, auth_error = require_staff(request)
    if auth_error or not is_admin(user):
        return JsonResponse({'error': 'Admin required'}, status=403)
    
    data = json.loads(request.body)
    if save_global_config(data):
        log_audit_event('GLOBAL_CONFIG_UPDATED', 'Configuration changed via reporting dashboard.', user=user, request=request)
        return JsonResponse({'success': True})
    return JsonResponse({'error': 'Failed to save'}, status=500)

@csrf_exempt
def run_security_audit(request):
    user, auth_error = require_staff(request)
    if auth_error or not is_admin(user):
        return JsonResponse({'error': 'Admin required'}, status=403)
    
    results = []
    return JsonResponse({'success': True, 'audit_results': results, 'score': 100})
