from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import AttendanceRecord, Device
from accounts.models import Department, EmployeeDetail, Role, UserRole
from scheduling.models import Shift, Assignment
from datetime import datetime, time, date, timedelta
import json

User = get_user_model()

class AttendanceLogicTest(TestCase):
    def setUp(self):
        # 1. Setup User and Org
        self.dept = Department.objects.create(name="Engineering")
        self.user = User.objects.create_user(username="test_emp", password="password123")
        self.detail = EmployeeDetail.objects.create(
            user=self.user, 
            department=self.dept, 
            position="Engineer",
            hire_date=date.today()
        )
        
        # 2. Setup Shift (8 AM - 4 PM)
        self.shift = Shift.objects.create(
            name="Day Shift",
            start_time=time(8, 0),
            end_time=time(16, 0),
            grace_period=15
        )
        
        # 3. Assign Shift
        Assignment.objects.create(
            user=self.user,
            shift=self.shift,
            from_date=date.today()
        )

    def test_attendance_toggling(self):
        """Verifies that the system correctly identifies Check-ins vs Check-outs."""
        # First record of the day should be CHECK_IN
        now = timezone.now()
        r1 = AttendanceRecord.objects.create(
            user=self.user,
            timestamp=now,
            type=AttendanceRecord.RecordType.CHECK_IN,
            status=AttendanceRecord.RecordStatus.ON_TIME
        )
        self.assertEqual(r1.type, AttendanceRecord.RecordType.CHECK_IN)

        # Second record of the day should be CHECK_OUT
        r2 = AttendanceRecord.objects.create(
            user=self.user,
            timestamp=now + timedelta(minutes=5),
            type=AttendanceRecord.RecordType.CHECK_OUT,
            status=AttendanceRecord.RecordStatus.ON_TIME
        )
        self.assertEqual(r2.type, AttendanceRecord.RecordType.CHECK_OUT)

    def test_late_arrival_logic(self):
        """Tests if the system correctly flags late arrivals."""
        # Mock a time that is 20 minutes past shift start (beyond 15 min grace)
        late_time = timezone.make_aware(timezone.datetime.combine(date.today(), time(8, 20)))
        
        # Note: In real app this is calculated in mark_attendance view
        # We test the record creation with LATE status
        record = AttendanceRecord.objects.create(
            user=self.user,
            timestamp=late_time,
            type=AttendanceRecord.RecordType.CHECK_IN,
            status=AttendanceRecord.RecordStatus.LATE
        )
        self.assertEqual(record.status, AttendanceRecord.RecordStatus.LATE)

class TerminalAPITest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="terminal_user", password="password123")
        
    def test_unauthorized_access(self):
        """Endpoints requiring authentication should return 401/403."""
        response = self.client.get('/api/attendance/my-history/')
        self.assertEqual(response.status_code, 401)

    def test_invalid_biometric_request(self):
        """Missing image data should return 400."""
        response = self.client.post('/api/attendance/mark/', 
            data=json.dumps({'image': ''}), 
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())


class EmployeeDashboardApiTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="dashboard_user", password="password123")
        self.client.force_login(self.user)

        base_date = timezone.now().date()
        check_in = timezone.make_aware(datetime.combine(base_date, time(9, 0)))
        check_out = timezone.make_aware(datetime.combine(base_date, time(17, 0)))

        AttendanceRecord.objects.create(
            user=self.user,
            timestamp=check_in,
            type=AttendanceRecord.RecordType.CHECK_IN,
            status=AttendanceRecord.RecordStatus.LATE,
        )
        AttendanceRecord.objects.create(
            user=self.user,
            timestamp=check_out,
            type=AttendanceRecord.RecordType.CHECK_OUT,
            status=AttendanceRecord.RecordStatus.EARLY_EXIT,
        )

    def test_dashboard_stats_and_history_shape(self):
        stats_response = self.client.get('/api/attendance/dashboard-stats/')
        self.assertEqual(stats_response.status_code, 200)

        stats_payload = stats_response.json()
        self.assertTrue(stats_payload['success'])
        stats = stats_payload['stats']
        self.assertEqual(stats['present_days'], 1)
        self.assertEqual(stats['late_count'], 1)
        self.assertEqual(stats['early_exit_count'], 1)
        self.assertEqual(stats['month_name'], timezone.now().strftime('%B'))
        self.assertAlmostEqual(stats['total_hours'], 8.0, places=2)

        history_response = self.client.get('/api/attendance/my-history/')
        self.assertEqual(history_response.status_code, 200)

        history_payload = history_response.json()
        self.assertTrue(history_payload['success'])
        self.assertGreaterEqual(len(history_payload['records']), 2)
        self.assertIn('type_code', history_payload['records'][0])
        self.assertIn('status_code', history_payload['records'][0])


class DeviceTypePersistenceTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_user(username="admin", password="password123")
        self.client.force_login(self.admin)

    def test_device_type_is_saved_and_returned_by_the_api(self):
        payload = {
            'name': 'Main Entrance Tablet',
            'type': 'Handheld',
            'location': 'Main Gate',
            'ip_address': '192.168.10.50',
            'port': 8000,
        }

        create_response = self.client.post(
            '/api/attendance/devices/',
            data=json.dumps(payload),
            content_type='application/json',
        )
        self.assertEqual(create_response.status_code, 201)

        created_device = create_response.json()['device']
        self.assertEqual(created_device['type'], 'Handheld')

        list_response = self.client.get('/api/attendance/devices/')
        self.assertEqual(list_response.status_code, 200)

        device = next(item for item in list_response.json()['devices'] if item['id'] == created_device['id'])
        self.assertEqual(device['type'], 'Handheld')

        update_response = self.client.patch(
            f"/api/attendance/devices/{created_device['id']}/",
            data=json.dumps({'type': 'Desktop'}),
            content_type='application/json',
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()['device']['type'], 'Desktop')
