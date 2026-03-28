import logging
import base64
import numpy as np
import io
import json
import cv2
from PIL import Image
from deepface import DeepFace
from scipy.spatial.distance import cosine
from datetime import datetime
from datetime import timedelta
from django.db.models import Max, Q

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.utils.text import slugify
from django.contrib.auth import get_user_model, authenticate

from mtcnn import MTCNN
# Internal model imports
from accounts.models import BiometricTemplate, User, EmployeeDetail
from scheduling.models import Assignment
from .models import AttendanceRecord, Device
from leave.models import LeaveRequest, Policy
from leave.utils import PolicyResolver
from scheduling.models import Shift
from reporting.utils import log_audit_event

# --- Logging Configuration ---
# Standard logger for this module
logger = logging.getLogger(__name__)


def require_authenticated_user(request):
    if request.user.is_authenticated:
        return request.user, None
    return None, JsonResponse({'error': 'Authentication required'}, status=401)


def get_employee_detail(user):
    try:
        return user.employeedetail
    except EmployeeDetail.DoesNotExist:
        return None


def infer_device_type(device):
    serial = (device.device_serial or '').upper()
    name = (device.name or '').lower()

    if serial.startswith('HANDHELD') or 'handheld' in name or 'mobile' in name:
        return 'Handheld'
    if serial.startswith('DESKTOP') or 'desktop' in name or 'office' in name:
        return 'Desktop'
    return 'Kiosk'


def build_device_serial(device_type, name):
    prefix = (device_type or 'Kiosk').strip().upper().replace(' ', '_')
    suffix = slugify(name or 'device').upper().replace('-', '_')[:20] or 'DEVICE'
    return f'{prefix}-{suffix}'


def normalize_device_status(device, latest_sync):
    raw_status = (device.status or '').strip().lower()

    if raw_status == 'maintenance':
        return 'maintenance'
    if raw_status in ['offline', 'inactive']:
        return 'offline'
    if raw_status in ['online', 'active']:
        return 'online'

    if latest_sync and latest_sync >= timezone.now() - timedelta(hours=12):
        return 'online'
    return 'offline'


def serialize_device(device, latest_sync=None):
    return {
        'id': str(device.id),
        'name': device.name,
        'type': infer_device_type(device),
        'location': device.location or '',
        'status': normalize_device_status(device, latest_sync),
        'last_sync': latest_sync.isoformat() if latest_sync else None,
        'ip_address': device.ip_address,
        'port': device.port,
        'device_serial': device.device_serial,
        'battery': None,
    }

# --- Initialization ---
try:
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    if face_cascade.empty():
        logger.error("Haar Cascade classifier is empty. Face detection will fail.")
except Exception as e:
    logger.error(f"Could not load Haar Cascade classifier: {e}")
    face_cascade = None

# --- In-Memory Embedding Cache ---
known_embeddings_matrix = None
known_user_info = []


def load_known_embeddings():
    global known_embeddings_matrix, known_user_info

    try:
        templates = list(BiometricTemplate.objects.filter(
            type=BiometricTemplate.BiometricType.FACE,
            user__status=User.Status.ACTIVE # Exclude suspended users
        ).select_related('user'))

        if not templates:
            known_embeddings_matrix = None
            known_user_info = []
            logger.warning("Cache Refresh: No active face embeddings found in database.")
            return

        known_user_info = [{
            'user_id': str(template.user.id),
            'username': template.user.username
        } for template in templates]

        embeddings = [np.array(template.template_data) for template in templates]
        matrix = np.array(embeddings)

        # Normalize the matrix for faster cosine similarity calculation
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        known_embeddings_matrix = matrix / norms

        logger.info(f"Cache Refresh: Loaded {len(known_user_info)} ACTIVE face embeddings into memory.")
    except Exception as e:
        logger.error(f"Failed to load embeddings into memory: {e}")


# Initial load
load_known_embeddings()


@csrf_exempt
def reload_embeddings(request):
    load_known_embeddings()
    return JsonResponse({'status': 'success', 'message': f'Reloaded {len(known_user_info)} embeddings.'})


# --- Face Recognition Logic ---
def extract_embedding(image_rgb):
    try:
        # Standardize the process: resize, then generate embedding
        resized_image = cv2.resize(image_rgb, (160, 160))
        embedding_objs = DeepFace.represent(
            img_path=resized_image, 
            model_name='Facenet512',
            enforce_detection=False, # Skip detection as we are passing a cropped face
            detector_backend='skip'
        )
        return embedding_objs[0]['embedding']
    except Exception as e:
        logger.error(f"DeepFace embedding extraction error: {e}")
        return None


def is_live_face(face_img):
    """
    Heuristic liveness check using OpenCV variance of Laplacian.
    """
    try:
        if face_img.shape[2] == 3:
            gray = cv2.cvtColor(face_img, cv2.COLOR_RGB2GRAY)
        else:
            gray = face_img

        variance = cv2.Laplacian(gray, cv2.CV_64F).var()

        # Lowered threshold to 5.0 to be more permissive for various webcams
        if variance < 5.0:
            return False, f"Low texture variance: {variance:.1f}"

        return True, "Passed"
    except Exception as e:
        logger.warning(f"Liveness heuristic skipped due to error: {e}")
        return True, "Skipped"


def find_best_match(query_embedding, threshold=0.6): # Lowered threshold
    if known_embeddings_matrix is None:
        return None, float('inf')

    query_norm = np.linalg.norm(query_embedding)
    if query_norm == 0:
        return None, float('inf')

    query_embedding_normalized = query_embedding / query_norm
    similarities = np.dot(known_embeddings_matrix, query_embedding_normalized)
    distances = np.atleast_1d(1 - similarities)

    best_match_index = np.argmin(distances)
    min_distance = float(distances[best_match_index])

    if min_distance < threshold:
        return known_user_info[best_match_index], min_distance

    return None, min_distance


from .config_utils import read_global_config

def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def resolve_numeric_policy_value(name, fallback, department_id=None):
    policy = PolicyResolver.get_active_policy(name, department_id)
    if not policy:
        return fallback, None

    numeric_value = PolicyResolver.extract_numeric_value(policy.value)
    if numeric_value <= 0:
        return fallback, policy

    return numeric_value, policy


def resolve_verification_threshold(department_id=None, strict_mode=False):
    sensitivity_value, sensitivity_policy = resolve_numeric_policy_value(
        'Verification Sensitivity',
        75.0,
        department_id,
    )
    sensitivity = clamp(float(sensitivity_value), 0.0, 100.0)

    # Higher sensitivity means a tighter acceptance distance for face matching.
    threshold = 0.9 - ((sensitivity / 100.0) * 0.3)
    if strict_mode:
        threshold -= 0.05

    return clamp(threshold, 0.5, 0.9), sensitivity, sensitivity_policy

# --- Main Attendance API View ---
@csrf_exempt
def mark_attendance(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        config = read_global_config()
        is_strict = bool(config.get('strict_mode', False))
        biometric_lock_active = bool(config.get('biometric_lock_active', True))
        is_realtime = config.get('real_time_validation', True)

        data = json.loads(request.body)
        image_data = data.get('image')
        is_manual = data.get('is_manual', False)
        
        # Initialize core variables
        user = None
        current_status_flag = AttendanceRecord.VerificationStatus.VERIFIED
        match = None
        distance = 0.0

        if is_manual:
            username = data.get('userId') # Username passed here
            password = data.get('password')
            
            if not username or not password:
                return JsonResponse({'error': 'Username and password required for manual entry.'}, status=400)
            
            authenticated_user = authenticate(username=username, password=password)
            if authenticated_user:
                user = authenticated_user
                current_status_flag = AttendanceRecord.VerificationStatus.UNVERIFIED # Flag as manual bypass
            else:
                return JsonResponse({'error': 'Invalid manual credentials.'}, status=401)
        else:
            if not image_data:
                return JsonResponse({'error': 'No image data provided'}, status=400)

            # Decode image
            try:
                format, imgstr = image_data.split(';base64,')
                image_content = base64.b64decode(imgstr)
                image = Image.open(io.BytesIO(image_content)).convert('RGB')
                image_array = np.array(image)
            except Exception as e:
                logger.error(f"Image decoding failed: {e}")
                return JsonResponse({'error': 'Invalid image format'}, status=400)

            if face_cascade is None:
                logger.critical("Attendance API: Face detector is not initialized.")
                return JsonResponse({'error': 'System misconfiguration'}, status=500)

            # Detect face for initial presence check
            gray_image = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
            faces = face_cascade.detectMultiScale(
                gray_image, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80)
            )

            if len(faces) == 0:
                logger.warning("Attendance Failed: No face detected in request.")
                return JsonResponse({'error': 'Face not found in guide. Please align correctly.'}, status=400)
            
            x, y, w, h = faces[0]
            face_img = image_array[y:y + h, x:x + w]

            # 1. Liveness Check (Heuristic)
            is_live, liveness_msg = is_live_face(face_img)
            if not is_live and biometric_lock_active:
                logger.error(f"Security Alert: Heuristic Spoof Detection. {liveness_msg}")
                return JsonResponse({'error': 'Biometric verification failed (Liveness).'}, status=403)

            # 2. Recognition Logic based on Configuration
            if is_realtime:
                # Full Real-time DeepFace Validation
                live_embedding = extract_embedding(face_img)
                if live_embedding is None:
                    return JsonResponse({'error': 'Biometric processing failed. Try better lighting.'}, status=500)

                threshold, sensitivity, _ = resolve_verification_threshold(strict_mode=is_strict)
                match, distance = find_best_match(np.array(live_embedding), threshold=threshold)
                
                if not match:
                    return JsonResponse({'error': 'Identity not recognized. Please ensure you are enrolled or use manual access.'}, status=401)
                else:
                    user = User.objects.get(id=match['user_id'])
                    current_status_flag = AttendanceRecord.VerificationStatus.VERIFIED
            else:
                # Deferred Processing Mode
                return JsonResponse({'error': 'Real-time validation is required for terminal usage.'}, status=400)

        if not user:
            return JsonResponse({'error': 'Identity identification failed.'}, status=401)

        # 3. Security Check: Reject suspended accounts
        if user.status == User.Status.SUSPENDED:
            logger.warning(f"Security Alert: Suspended user {user.username} (ID: {user.id}) attempted verification.")
            return JsonResponse({
                'error': 'Attendance rejected. Your account is currently suspended. Please contact HR.'
            }, status=403)

        # --- Attendance Logic ---
        now = timezone.now()
        today = now.date()

        # 1. Cooldown Check
        last_record = AttendanceRecord.objects.filter(user=user).order_by('-timestamp').first()
        if last_record:
            seconds_since_last = (now - last_record.timestamp).total_seconds()
            if seconds_since_last < 60:  # 1-minute cooldown
                return JsonResponse({
                    'error': 'Already marked recently. Please wait a moment.',
                    'already_marked': True
                }, status=429)

        # 2. Daily Logic: Determine if CHECK_IN or CHECK_OUT
        records_today = AttendanceRecord.objects.filter(user=user, timestamp__date=today).order_by('-timestamp')
        if not records_today.exists():
            record_type = AttendanceRecord.RecordType.CHECK_IN
        else:
            last_today = records_today.first()
            if last_today.type == AttendanceRecord.RecordType.CHECK_IN:
                record_type = AttendanceRecord.RecordType.CHECK_OUT
            else:
                record_type = AttendanceRecord.RecordType.CHECK_IN

        last_check_in_today = None
        if record_type == AttendanceRecord.RecordType.CHECK_OUT:
            last_check_in_today = (
                AttendanceRecord.objects.filter(
                    user=user,
                    timestamp__date=today,
                    type=AttendanceRecord.RecordType.CHECK_IN,
                )
                .order_by('-timestamp')
                .first()
            )
            if not last_check_in_today:
                return JsonResponse({'error': 'Valid check-in must exist before check-out.'}, status=400)

        # 3. Status Calculation (Late / Early)
        status = AttendanceRecord.RecordStatus.ON_TIME
        employee_detail = get_employee_detail(user)
        department_id = employee_detail.department_id if employee_detail else None
        late_threshold_exceeded = False
        policy_message_suffix = ''
        
        assignment = Assignment.objects.filter(
            user=user, from_date__lte=today
        ).filter(
            Q(to_date__isnull=True) | Q(to_date__gte=today)
        ).select_related('shift').first()

        if assignment:
            shift = assignment.shift
            shift_start_dt = timezone.make_aware(datetime.combine(today, shift.start_time))
            shift_end_dt = timezone.make_aware(datetime.combine(today, shift.end_time))

            if record_type == AttendanceRecord.RecordType.CHECK_IN:
                grace_policy = PolicyResolver.get_active_policy('Grace Period', department_id)
                late_threshold_minutes, _ = resolve_numeric_policy_value('Late Threshold', 60.0, department_id)
                delay_minutes = max(0.0, (now - shift_start_dt).total_seconds() / 60.0)
                
                if delay_minutes > late_threshold_minutes:
                    status = AttendanceRecord.RecordStatus.LATE
                    late_threshold_exceeded = True
                    policy_message_suffix = f' Late threshold exceeded ({int(round(delay_minutes))} min late).'
                elif PolicyResolver.is_late(now, shift_start_dt, grace_policy):
                    status = AttendanceRecord.RecordStatus.LATE
            
            elif record_type == AttendanceRecord.RecordType.CHECK_OUT:
                if now < shift_end_dt:
                    status = AttendanceRecord.RecordStatus.EARLY_EXIT

        new_record = AttendanceRecord.objects.create(
            user=user, 
            timestamp=now, 
            type=record_type, 
            status=status,
            verification_status=current_status_flag
        )

        if current_status_flag == AttendanceRecord.VerificationStatus.UNVERIFIED:
            log_audit_event(
                'ATTENDANCE_MANUAL_ENTRY',
                f'Manual attendance entry via credentials for "{user.username}". Flagged for review.',
                user=user,
                request=request,
            )

        # Gather profile info for the success screen
        profile_data = {
            'full_name': user.get_full_name() or user.username,
            'department': employee_detail.department.name if employee_detail and employee_detail.department else 'N/A',
            'position': employee_detail.position if employee_detail else 'N/A',
            'profile_photo': employee_detail.profile_photo if employee_detail else None,
        }

        return JsonResponse({
            'success': True,
            'type': record_type,
            'username': user.username,
            'status': status,
            'verification_status': new_record.verification_status,
            'message': f"Successfully {record_type.label.lower()}. {policy_message_suffix}",
            'timestamp': new_record.timestamp.isoformat(),
            'profile': profile_data
        })

    except Exception as e:
        logger.exception("Critical Error in mark_attendance view")
        return JsonResponse({'error': 'Internal server error processing data.'}, status=500)


def get_my_attendance_history(request):
    """
    Returns the latest 20 attendance records for the current user.
    """
    try:
        user, auth_error = require_authenticated_user(request)
        if auth_error:
            return auth_error

        records = AttendanceRecord.objects.filter(user=user).order_by('-timestamp')[:20]
        data = []
        for r in records:
            data.append({
                'id': str(r.id),
                'timestamp': r.timestamp.isoformat(),
                'type': r.get_type_display(),
                'type_code': r.type,
                'status': r.get_status_display(),
                'status_code': r.status,
                'date': r.timestamp.date().strftime('%b %d, %Y'),
                'time': r.timestamp.time().strftime('%H:%M %p')
            })
        return JsonResponse({'success': True, 'records': data})
    except Exception as e:
        logger.error(f"Error fetching attendance history: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def api_dashboard_stats(request):
    """
    Returns dashboard statistics based on the user's role.
    """
    user, auth_error = require_authenticated_user(request)
    if auth_error:
        return auth_error

    stats = {}

    try:
        if user.is_administrator:
            total_employees = User.objects.count()
            active_employees = User.objects.filter(status=User.Status.ACTIVE).count()
            suspended_employees = User.objects.filter(status=User.Status.SUSPENDED).count()
            stats = {
                'totalEmployees': total_employees,
                'activeEmployees': active_employees,
                'suspendedEmployees': suspended_employees,
                'faceEnrolled': EmployeeDetail.objects.filter(biometric_enrolled=True).count()
            }
        elif user.is_hr_officer:
            today = timezone.now().date()
            stats = {
                'totalEmployees': User.objects.count(),
                'presentToday': AttendanceRecord.objects.filter(timestamp__date=today, type=AttendanceRecord.RecordType.CHECK_IN).values('user').distinct().count(),
                'pendingLeaves': LeaveRequest.objects.filter(status='PENDING').count(),
                'activeShifts': Shift.objects.count()
            }
        else: # Employee
            now = timezone.now()
            start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            records = AttendanceRecord.objects.filter(user=user, timestamp__gte=start_of_month)
            
            total_seconds = 0
            days = records.values_list('timestamp__date', flat=True).distinct()
            for d in days:
                day_records = records.filter(timestamp__date=d).order_by('timestamp')
                last_in = None
                for r in day_records:
                    if r.type == AttendanceRecord.RecordType.CHECK_IN:
                        last_in = r.timestamp
                    elif r.type == AttendanceRecord.RecordType.CHECK_OUT and last_in:
                        total_seconds += (r.timestamp - last_in).total_seconds()
                        last_in = None
            
            stats = {
                'present_days': records.values('timestamp__date').distinct().count(),
                'late_count': records.filter(status=AttendanceRecord.RecordStatus.LATE).count(),
                'early_exit_count': records.filter(status=AttendanceRecord.RecordStatus.EARLY_EXIT).count(),
                'total_hours': float(round(total_seconds / 3600.0, 1)),
                'month_name': now.strftime('%B %Y')
            }
            
        return JsonResponse({'success': True, 'stats': stats})

    except Exception as e:
        logger.exception(f"Error fetching dashboard stats: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def api_list_all_attendance(request):
    """Lists attendance records for all users (Admin view)."""
    user, auth_error = require_authenticated_user(request)
    if auth_error:
        return auth_error

    if not user.is_staff:
        return JsonResponse({'error': 'Permission denied'}, status=403)
        
    try:
        records = AttendanceRecord.objects.all().select_related('user').order_by('-timestamp')[:100]
        data = []
        for r in records:
            data.append({
                'id': str(r.id),
                'username': r.user.username,
                'timestamp': r.timestamp.isoformat(),
                'type': r.get_type_display(),
                'status': r.get_status_display(),
                'verification': r.get_verification_status_display(),
                'date': r.timestamp.date().strftime('%b %d, %Y'),
                'time': r.timestamp.time().strftime('%H:%M %p')
            })
        return JsonResponse({'success': True, 'records': data})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
def api_list_hr_attendance_records(request):
    """
    Returns daily, per-employee attendance rows for HR tables.

    This endpoint is consumed by:
    `frontend-updated/src/lib/hrAttendance.ts` (ManageAttendance screen).
    """
    user, auth_error = require_authenticated_user(request)
    if auth_error:
        return auth_error

    if not (getattr(user, 'is_hr_officer', False) or getattr(user, 'is_administrator', False) or getattr(user, 'is_superuser', False)):
        return JsonResponse({'error': 'Permission denied'}, status=403)

    if request.method != 'GET':
        return JsonResponse({'error': 'GET required'}, status=405)

    # Date window for generating HR table rows (defaults to last 30 days).
    # This screen performs filtering client-side, but we still limit server output.
    try:
        today = timezone.now().date()
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')

        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        else:
            start_date = today - timedelta(days=30)

        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            end_date = today

        if start_date > end_date:
            return JsonResponse({'error': 'Invalid date range'}, status=400)
    except Exception:
        return JsonResponse({'error': 'Invalid date parameters. Use YYYY-MM-DD.'}, status=400)

    # Gather attendance events within the window.
    events_qs = (
        AttendanceRecord.objects.filter(timestamp__date__range=(start_date, end_date))
        .select_related('user', 'user__employeedetail__department', 'device')
        .order_by('user__id', 'timestamp')
    )

    user_ids = list(events_qs.values_list('user_id', flat=True).distinct())
    if not user_ids:
        return JsonResponse({'success': True, 'records': []})

    # Preload biometric template types so HR dashboard can display "method"
    # (Face ID / Fingerprint / Manual ID). This is derived from enrolled templates
    # and the verification_status returned for the attendance row.
    biometric_templates = (
        BiometricTemplate.objects.filter(
            user_id__in=user_ids,
            type__in=[BiometricTemplate.BiometricType.FACE, BiometricTemplate.BiometricType.FINGERPRINT],
        )
        .values_list('user_id', 'type')
    )
    biometric_types_by_user = {}
    for user_id, template_type in biometric_templates:
        uid = str(user_id)
        ttype = str(template_type)
        if uid not in biometric_types_by_user:
            biometric_types_by_user[uid] = set()
        biometric_types_by_user[uid].add(ttype)

    # Preload shift assignments overlapping the window for active lookup per day.
    assignments = (
        Assignment.objects.filter(user_id__in=user_ids, from_date__lte=end_date)
        .filter(Q(to_date__isnull=True) | Q(to_date__gte=start_date))
        .select_related('user', 'shift')
        .order_by('from_date')
    )

    assignments_by_user: dict[str, list[Assignment]] = {}
    for a in assignments:
        assignments_by_user.setdefault(str(a.user_id), []).append(a)

    def get_assignment_for_day(user_id: str, day):
        for a in assignments_by_user.get(user_id, []):
            if a.from_date <= day and (a.to_date is None or a.to_date >= day):
                return a.shift.name if a.shift else 'Standard Shift'
        return 'Standard Shift'

    # Aggregate to daily rows.
    # Key: (user_id, date_iso)
    daily: dict[tuple[str, str], dict] = {}

    def update_verification_rank(existing_rank: int, new_status: str) -> int:
        # Higher rank = worse severity.
        # Verified < Unverified < Pending
        if new_status == AttendanceRecord.VerificationStatus.PENDING:
            return 3 if existing_rank < 3 else existing_rank
        if new_status == AttendanceRecord.VerificationStatus.UNVERIFIED:
            return 2 if existing_rank < 2 else existing_rank
        return 1 if existing_rank < 1 else existing_rank

    for r in events_qs:
        uid = str(r.user_id)
        day_iso = r.timestamp.date().isoformat()
        key = (uid, day_iso)

        if key not in daily:
            employee_detail = getattr(r.user, 'employeedetail', None)
            department_name = (
                employee_detail.department.name
                if employee_detail and getattr(employee_detail, 'department', None)
                else 'Unassigned'
            )

            daily[key] = {
                'employee_name': r.user.get_full_name() or r.user.username,
                'employee_code': r.user.username,
                'department': department_name,
                'date': day_iso,
                'check_in_time': None,
                'check_out_time': None,
                'hours_worked': 0.0,
                'status': 'Present',
                'late': False,
                'early_exit': False,
                'verification_rank': 1,
                'verification_status': AttendanceRecord.VerificationStatus.VERIFIED,
                'location': getattr(r.device, 'location', '') if r.device else '',
                'assignment': get_assignment_for_day(uid, r.timestamp.date()),
            }

        row = daily[key]

        # Prefer first check-in and last check-out for the day.
        if r.type == AttendanceRecord.RecordType.CHECK_IN:
            if row['check_in_time'] is None or r.timestamp < row['check_in_time']:
                row['check_in_time'] = r.timestamp
            if r.status == AttendanceRecord.RecordStatus.LATE:
                row['late'] = True

        if r.type == AttendanceRecord.RecordType.CHECK_OUT:
            if row['check_out_time'] is None or r.timestamp > row['check_out_time']:
                row['check_out_time'] = r.timestamp
            if r.status == AttendanceRecord.RecordStatus.EARLY_EXIT:
                row['early_exit'] = True

        # Verification severity aggregation.
        row['verification_rank'] = update_verification_rank(row['verification_rank'], r.verification_status)

        # If any record has a device location, keep it.
        if r.device and getattr(r.device, 'location', None) and not row['location']:
            row['location'] = r.device.location

    # Finalize derived fields for JSON response.
    records = []
    seq_id = 1
    for (uid, day_iso), row in daily.items():
        check_in_dt = row['check_in_time']
        check_out_dt = row['check_out_time']

        if check_in_dt and check_out_dt and check_out_dt >= check_in_dt:
            hours = (check_out_dt - check_in_dt).total_seconds() / 3600.0
            row['hours_worked'] = round(hours, 2)

        if row['late']:
            row['status'] = 'Late'
        elif row['early_exit']:
            row['status'] = 'Present (Early Leave)'
        elif row['check_in_time'] is not None:
            row['status'] = 'Present'
        else:
            row['status'] = 'Absent'

        # Map verification rank to human-readable strings used by the frontend.
        if row['verification_rank'] == 3:
            row['verification_status'] = AttendanceRecord.VerificationStatus.PENDING
        elif row['verification_rank'] == 2:
            row['verification_status'] = AttendanceRecord.VerificationStatus.UNVERIFIED
        else:
            row['verification_status'] = AttendanceRecord.VerificationStatus.VERIFIED

        # Derive "method" label for HR dashboard UI.
        enrolled_types = biometric_types_by_user.get(uid, set())
        if row['verification_status'] == AttendanceRecord.VerificationStatus.UNVERIFIED:
            method = 'Manual ID'
        elif BiometricTemplate.BiometricType.FACE in enrolled_types:
            method = 'Face ID'
        elif BiometricTemplate.BiometricType.FINGERPRINT in enrolled_types:
            method = 'Fingerprint'
        else:
            method = 'Biometric'

        verification_string = {
            AttendanceRecord.VerificationStatus.VERIFIED: 'Verified',
            AttendanceRecord.VerificationStatus.UNVERIFIED: 'Unverified (Bypass)',
            AttendanceRecord.VerificationStatus.PENDING: 'Pending Validation',
        }.get(row['verification_status'], 'Verified')

        records.append(
            {
                'id': seq_id,
                'employee_name': row['employee_name'],
                'employee_code': row['employee_code'],
                'department': row['department'],
                'date': row['date'],
                'check_in_time': row['check_in_time'].isoformat() if row['check_in_time'] else None,
                'check_out_time': row['check_out_time'].isoformat() if row['check_out_time'] else None,
                'hours_worked': row['hours_worked'],
                'status': row['status'],
                'verification_status': verification_string,
                'location': row['location'] or 'Main Office',
                'assignment': row['assignment'],
                'method': method,
            }
        )
        seq_id += 1

    # Stable ordering: date desc, then employee name.
    records.sort(key=lambda r: (r['date'], r['employee_name']), reverse=True)

    return JsonResponse({'success': True, 'records': records})

@csrf_exempt
def api_update_attendance_verification(request, record_id):
    """Admin only: Manually overrides the verification status of an attendance record."""
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
        
    try:
        data = json.loads(request.body)
        new_status = data.get('status')
        # Check against model choices (VERIFIED, UNVERIFIED, PENDING)
        if not new_status:
            return JsonResponse({'error': 'Missing status'}, status=400)
            
        record = AttendanceRecord.objects.get(id=record_id)
        record.verification_status = new_status
        record.save()
        
        return JsonResponse({
            'success': True, 
            'message': f'Record marked as {record.get_verification_status_display()}.',
            'new_status': record.get_verification_status_display()
        })
    except AttendanceRecord.DoesNotExist:
        return JsonResponse({'error': 'Attendance record not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def api_delete_attendance_record(request, record_id):
    """Superuser only: Deletes an attendance record."""
    if not request.user.is_authenticated or not request.user.is_superuser:
        return JsonResponse({'error': 'Permission denied. Superuser required.'}, status=403)
        
    if request.method != 'DELETE':
        return JsonResponse({'error': 'DELETE required'}, status=405)
        
    try:
        record = AttendanceRecord.objects.get(id=record_id)
        record.delete()
        return JsonResponse({'success': True, 'message': 'Attendance record permanently removed.'})
    except AttendanceRecord.DoesNotExist:
        return JsonResponse({'error': 'Attendance record not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def api_device_list_create(request):
    user, auth_error = require_authenticated_user(request)
    if auth_error:
        return auth_error

    if not user.is_staff:
        return JsonResponse({'error': 'Permission denied'}, status=403)

    if request.method == 'GET':
        try:
            latest_sync_rows = (
                AttendanceRecord.objects.filter(device__isnull=False)
                .values('device')
                .annotate(latest=Max('timestamp'))
            )
            latest_sync_map = {
                str(row['device']): row['latest']
                for row in latest_sync_rows
            }

            devices = Device.objects.all().order_by('name')
            data = [
                serialize_device(device, latest_sync_map.get(str(device.id)))
                for device in devices
            ]
            return JsonResponse({'success': True, 'devices': data})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

    if request.method == 'POST':
        try:
            payload = json.loads(request.body)
            device_type = payload.get('type', 'Kiosk')
            name = payload.get('name')
            ip_address = payload.get('ip_address') or payload.get('ip')
            location = payload.get('location', '')
            port = int(payload.get('port', 8000))
            status = payload.get('status', 'active')

            if not name or not ip_address:
                return JsonResponse({'error': 'Name and IP address are required.'}, status=400)

            serial = payload.get('device_serial') or build_device_serial(device_type, name)

            device = Device.objects.create(
                device_serial=serial,
                name=name,
                ip_address=ip_address,
                port=port,
                location=location,
                status=status,
            )
            return JsonResponse({
                'success': True,
                'device': serialize_device(device),
                'message': 'Device registered successfully.',
            }, status=201)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    return JsonResponse({'error': 'GET or POST required'}, status=405)


@csrf_exempt
def api_device_detail(request, device_id):
    user, auth_error = require_authenticated_user(request)
    if auth_error:
        return auth_error

    if not user.is_staff:
        return JsonResponse({'error': 'Permission denied'}, status=403)

    try:
        device = Device.objects.get(id=device_id)
    except Device.DoesNotExist:
        return JsonResponse({'error': 'Device not found'}, status=404)

    if request.method in ['PUT', 'PATCH', 'POST']:
        try:
            payload = json.loads(request.body)
            device_type = payload.get('type', infer_device_type(device))

            if 'name' in payload:
                device.name = payload['name']
            if 'ip_address' in payload or 'ip' in payload:
                device.ip_address = payload.get('ip_address') or payload.get('ip')
            if 'location' in payload:
                device.location = payload.get('location') or ''
            if 'port' in payload:
                device.port = int(payload['port'])
            if 'status' in payload:
                device.status = payload['status']

            device.device_serial = payload.get('device_serial') or build_device_serial(device_type, device.name)
            device.save()
            return JsonResponse({
                'success': True,
                'device': serialize_device(device),
                'message': 'Device updated successfully.',
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    if request.method == 'DELETE':
        try:
            device.delete()
            return JsonResponse({'success': True, 'message': 'Device deleted successfully.'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    return JsonResponse({'error': 'PUT, PATCH, POST, or DELETE required'}, status=405)
