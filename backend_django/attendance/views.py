import logging
import base64
import numpy as np
import io
import json
import cv2
from PIL import Image
from deepface import DeepFace
from datetime import datetime, time
from datetime import timedelta
from django.db.models import Max, Q

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.utils.text import slugify
from django.contrib.auth import get_user_model, authenticate

# Internal model imports
from accounts.models import BiometricTemplate, User, EmployeeDetail
from accounts.biometric_service import biometric_service 
from scheduling.models import Assignment, Shift, Holiday
from .models import AttendanceRecord, Device
from leave.models import LeaveRequest, Policy
from leave.utils import PolicyResolver
from reporting.utils import log_audit_event

# Unified Auth Helpers
from hu_attendance_system.auth_utils import require_auth, require_staff, is_admin, is_hr

# Re-use MTCNN from accounts for parity
from accounts.views import detector as face_detector

logger = logging.getLogger(__name__)

def get_employee_detail(user):
    try:
        return user.employeedetail
    except EmployeeDetail.DoesNotExist:
        return None

def enhance_image_for_ai(image_array):
    """
    Applies Adaptive Histogram Equalization (CLAHE) to handle low-light
    environments at institutional kiosks.
    """
    try:
        # Convert to LAB to process Luminance channel only
        lab = cv2.cvtColor(image_array, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        l_enhanced = clahe.apply(l)
        
        # Merge back
        enhanced_img = cv2.merge((l_enhanced, a, b))
        return cv2.cvtColor(enhanced_img, cv2.COLOR_LAB2RGB)
    except Exception as e:
        logger.error(f"Enhancement error: {e}")
        return image_array

def resolve_numeric_policy_value(name, fallback, department_id=None):
    """Restored helper to fetch numeric values from institutional policies."""
    policy = PolicyResolver.get_active_policy(name, department_id)
    if not policy: return fallback, None
    val = PolicyResolver.extract_numeric_value(policy.value)
    return (val if val > 0 else fallback), policy

def is_live_face(face_img, landmarks=None):
    """
    Harden Liveness: Combines texture variance with eye-geometric symmetry.
    """
    try:
        # 1. Texture Check (Blocks Paper/Static Screen)
        gray = cv2.cvtColor(face_img, cv2.COLOR_RGB2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # 2. Geometry Check (Blocks distorted spoofs)
        if landmarks:
            l_eye = landmarks['left_eye']
            r_eye = landmarks['right_eye']
            dist = np.linalg.norm(np.array(l_eye) - np.array(r_eye))
            if dist < 25: 
                return False, "Scale failure"

        return (variance >= 4.0), f"{variance:.1f}"
    except Exception:
        return True, "Skipped"

def extract_embedding(image_rgb):
    try:
        resized_image = cv2.resize(image_rgb, (160, 160))
        embedding_objs = DeepFace.represent(
            img_path=resized_image, 
            model_name='Facenet512',
            enforce_detection=False,
            detector_backend='skip'
        )
        return embedding_objs[0]['embedding']
    except Exception as e:
        logger.error(f"DeepFace error: {e}")
        return None

from .config_utils import read_global_config

def resolve_verification_threshold(department_id=None, strict_mode=False):
    sensitivity_value, _ = resolve_numeric_policy_value('Verification Sensitivity', 75.0, department_id)
    sensitivity = max(0.0, min(100.0, float(sensitivity_value)))
    threshold = 0.9 - ((sensitivity / 100.0) * 0.3)
    if strict_mode: threshold -= 0.05
    return max(0.5, min(0.9, threshold))

def resolve_active_shift(user, date_obj):
    assignment = Assignment.objects.filter(
        user=user, 
        from_date__lte=date_obj
    ).filter(
        Q(to_date__isnull=True) | Q(to_date__gte=date_obj)
    ).select_related('shift').first()
    
    if assignment:
        return assignment.shift

    detail = get_employee_detail(user)
    if detail and detail.department:
        dept_shift = Shift.objects.filter(department=detail.department).first()
        if dept_shift:
            return dept_shift
    return None

def check_for_holiday(date_obj):
    holiday = Holiday.objects.filter(date=date_obj).first()
    if holiday: return holiday
    recurring = Holiday.objects.filter(is_recurring=True)
    for h in recurring:
        if h.date.month == date_obj.month and h.date.day == date_obj.day:
            return h
    return None

@csrf_exempt
def mark_attendance(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        config = read_global_config()
        is_strict = bool(config.get('strict_mode', False))
        biometric_lock_active = bool(config.get('biometric_lock_active', True))
        
        data = json.loads(request.body)
        image_data = data.get('image')
        is_manual = data.get('is_manual', False)
        
        user = None
        current_status_flag = AttendanceRecord.VerificationStatus.VERIFIED

        if is_manual:
            if not config.get('manual_entry_enabled', False):
                return JsonResponse({'error': 'Manual entry restricted.'}, status=403)
            
            username = data.get('username')
            password = data.get('password')
            if not username or not password:
                return JsonResponse({'error': 'Credentials required.'}, status=400)
            
            auth_user = authenticate(request, username=username, password=password)
            if auth_user:
                user = auth_user
                current_status_flag = AttendanceRecord.VerificationStatus.UNVERIFIED
            else:
                return JsonResponse({'error': 'Invalid manual credentials.'}, status=401)
        else:
            if not image_data:
                return JsonResponse({'error': 'Capture data missing.'}, status=400)

            try:
                _, imgstr = image_data.split(';base64,')
                image = Image.open(io.BytesIO(base64.b64decode(imgstr))).convert('RGB')
                image_array = np.array(image)
                image_array = enhance_image_for_ai(image_array)
            except Exception:
                return JsonResponse({'error': 'Format error.'}, status=400)

            try:
                faces = face_detector.detect_faces(image_array)
            except Exception:
                faces = []

            if not faces:
                image_array = cv2.convertScaleAbs(image_array, alpha=1.5, beta=20)
                faces = face_detector.detect_faces(image_array)

            if not faces:
                return JsonResponse({'error': 'Face not detected. Please align.'}, status=400)
            
            face_data = faces[0]
            x, y, w, h = face_data['box']
            face_img = image_array[max(0, y-20):y+h+20, max(0, x-20):x+w+20]
            landmarks = face_data['keypoints']

            is_live, l_score = is_live_face(face_img, landmarks)
            if not is_live and biometric_lock_active:
                return JsonResponse({'error': 'Security Alert: Liveness verification failed.'}, status=403)

            live_embedding = extract_embedding(face_img)
            if live_embedding is None:
                return JsonResponse({'error': 'Biometric quality too low.'}, status=500)

            threshold = resolve_verification_threshold(strict_mode=is_strict)
            match, distance = biometric_service.find_match(live_embedding, threshold=threshold)
            
            if not match:
                return JsonResponse({'error': 'Identity unrecognized.'}, status=401)
            
            user = User.objects.get(id=match['id'])
            current_status_flag = AttendanceRecord.VerificationStatus.VERIFIED

        if user.status == User.Status.SUSPENDED:
            return JsonResponse({'error': 'Account locked.'}, status=403)

        now = timezone.now()
        today = now.date()

        last_record = AttendanceRecord.objects.filter(user=user).order_by('-timestamp').first()
        if last_record and (now - last_record.timestamp).total_seconds() < 60:
            return JsonResponse({'error': 'Marked recently.', 'already_marked': True}, status=429)

        records_today = AttendanceRecord.objects.filter(user=user, timestamp__date=today).order_by('-timestamp')
        record_type = AttendanceRecord.RecordType.CHECK_OUT if (records_today.exists() and records_today.first().type == AttendanceRecord.RecordType.CHECK_IN) else AttendanceRecord.RecordType.CHECK_IN

        if record_type == AttendanceRecord.RecordType.CHECK_OUT and not AttendanceRecord.objects.filter(user=user, timestamp__date=today, type=AttendanceRecord.RecordType.CHECK_IN).exists():
            return JsonResponse({'error': 'Check-in required first.'}, status=400)

        status = AttendanceRecord.RecordStatus.ON_TIME
        employee_detail = get_employee_detail(user)
        active_shift = resolve_active_shift(user, today)
        holiday = check_for_holiday(today)

        policy_msg = ''
        if holiday:
            policy_msg = f' Happy {holiday.name}!'
            status = AttendanceRecord.RecordStatus.ON_TIME
        elif active_shift:
            start_dt = timezone.make_aware(datetime.combine(today, active_shift.start_time))
            end_dt = timezone.make_aware(datetime.combine(today, active_shift.end_time))

            if record_type == AttendanceRecord.RecordType.CHECK_IN:
                grace_mins = active_shift.grace_period
                if (now - start_dt).total_seconds() / 60.0 > grace_mins:
                    status = AttendanceRecord.RecordStatus.LATE
                    policy_msg = f' Late ({grace_mins}m grace).'
            else:
                if now < (end_dt - timedelta(minutes=5)):
                    status = AttendanceRecord.RecordStatus.EARLY_EXIT
                    policy_msg = ' Early exit.'
        else:
            status = AttendanceRecord.RecordStatus.ON_TIME
            policy_msg = ' (Notice: Unscheduled entry)'

        AttendanceRecord.objects.create(user=user, timestamp=now, type=record_type, status=status, verification_status=current_status_flag)

        return JsonResponse({
            'success': True,
            'type': record_type,
            'status': status,
            'message': f"Hello {user.get_full_name() or user.username}. Recorded successfully.{policy_msg}",
            'timestamp': now.isoformat(),
            'profile': {
                'full_name': user.get_full_name() or user.username,
                'department': employee_detail.department.name if employee_detail and employee_detail.department else 'N/A',
                'position': employee_detail.position if employee_detail else 'N/A',
                'profile_photo': employee_detail.profile_photo if employee_detail else None,
            }
        })

    except Exception:
        logger.exception("Attendance Error")
        return JsonResponse({'error': 'System error.'}, status=500)

def reload_embeddings(request):
    biometric_service.reload_cache()
    return JsonResponse({'success': True, 'message': 'Registry synchronized.'})

def get_my_attendance_history(request):
    user, err = require_auth(request)
    if err: return err
    records = AttendanceRecord.objects.filter(user=user).order_by('-timestamp')[:20]
    data = [{'id': str(r.id), 'timestamp': r.timestamp.isoformat(), 'type': r.get_type_display(), 'status': r.get_status_display(), 'date': r.timestamp.date().strftime('%b %d, %Y'), 'time': r.timestamp.time().strftime('%H:%M %p')} for r in records]
    return JsonResponse({'success': True, 'records': data})

def api_dashboard_stats(request):
    user, err = require_auth(request)
    if err: return err
    try:
        if is_admin(user):
            stats = {'totalEmployees': User.objects.count(), 'activeEmployees': User.objects.filter(status=User.Status.ACTIVE).count(), 'suspendedEmployees': User.objects.filter(status=User.Status.SUSPENDED).count(), 'faceEnrolled': EmployeeDetail.objects.filter(biometric_enrolled=True).count()}
        elif is_hr(user):
            stats = {'totalEmployees': User.objects.count(), 'presentToday': AttendanceRecord.objects.filter(timestamp__date=timezone.now().date(), type=AttendanceRecord.RecordType.CHECK_IN).values('user').distinct().count(), 'pendingLeaves': LeaveRequest.objects.filter(status='PENDING').count(), 'activeShifts': Shift.objects.count()}
        else:
            stats = {'present_days': AttendanceRecord.objects.filter(user=user, timestamp__month=timezone.now().month).values('timestamp__date').distinct().count()}
        return JsonResponse({'success': True, 'stats': stats})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def api_list_all_attendance(request):
    user, err = require_staff(request)
    if err: return err
    records = AttendanceRecord.objects.all().select_related('user').order_by('-timestamp')[:100]
    data = [{'id': str(r.id), 'username': r.user.username, 'timestamp': r.timestamp.isoformat(), 'type': r.get_type_display(), 'status': r.get_status_display(), 'verification': r.get_verification_status_display()} for r in records]
    return JsonResponse({'success': True, 'records': data})

@csrf_exempt
def api_list_hr_attendance_records(request):
    user, err = require_staff(request)
    if err: return err
    
    today = timezone.now().date()
    start_date = today - timedelta(days=30)
    events_qs = AttendanceRecord.objects.filter(timestamp__date__range=(start_date, today)).select_related('user', 'user__employeedetail__department', 'device').order_by('-timestamp')
    
    records = []
    for r in events_qs:
        detail = getattr(r.user, 'employeedetail', None)
        records.append({
            'id': str(r.id),
            'employee_name': r.user.get_full_name() or r.user.username,
            'employee_code': r.user.username,
            'department': detail.department.name if detail and detail.department else 'N/A',
            'date': r.timestamp.date().isoformat(),
            'check_in_time': r.timestamp.isoformat() if r.type == AttendanceRecord.RecordType.CHECK_IN else None,
            'check_out_time': r.timestamp.isoformat() if r.type == AttendanceRecord.RecordType.CHECK_OUT else None,
            'status': r.get_status_display(),
            'verification_status': r.get_verification_status_display(),
            'method': 'Biometric',
        })
    return JsonResponse({'success': True, 'records': records})

@csrf_exempt
def api_update_attendance_verification(request, record_id):
    user, err = require_staff(request)
    if err: return err
    from django.shortcuts import get_object_or_404
    record = get_object_or_404(AttendanceRecord, id=record_id)
    data = json.loads(request.body)
    new_status = data.get('status')
    if not new_status: return JsonResponse({'error': 'Status required'}, status=400)
    record.verification_status = new_status
    record.save()
    return JsonResponse({'success': True})

@csrf_exempt
def api_delete_attendance_record(request, record_id):
    user, err = require_auth(request)
    if err: return err
    if not is_admin(user): return JsonResponse({'error': 'Denied'}, status=403)
    AttendanceRecord.objects.filter(id=record_id).delete()
    return JsonResponse({'success': True})

@csrf_exempt
def api_device_list_create(request):
    user, err = require_staff(request)
    if err: return err
    if request.method == 'GET':
        devices = Device.objects.all()
        data = [{'id': str(d.id), 'name': d.name, 'type': 'Kiosk', 'status': 'online', 'ip_address': d.ip_address} for d in devices]
        return JsonResponse({'success': True, 'devices': data})
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def api_device_detail(request, device_id):
    return JsonResponse({'success': True})
