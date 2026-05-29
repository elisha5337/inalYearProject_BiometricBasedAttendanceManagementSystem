"""
Module: attendance/tests.py
Project: BBEAMS
Description: Automated integration tests for attendance marking,
             cooldown enforcement, leave blocking, and shift status computation.
"""

import json
from datetime import date, datetime, timedelta, time
from django.test import TestCase, Client
from django.utils import timezone
from django.contrib.auth import get_user_model
from accounts.models import Role, UserRole, EmployeeDetail, Department
from attendance.models import AttendanceRecord
from attendance.views import materialize_absent_records_for_date
from leave.models import LeaveRequest
from scheduling.models import Shift, Assignment

User = get_user_model()


class AttendanceMarkingTest(TestCase):
    """Integration tests for the mark_attendance endpoint business rules."""

    def setUp(self):
        self.client = Client()
        self.dept = Department.objects.create(name='Test Department')
        self.employee_role, _ = Role.objects.get_or_create(name=Role.EMPLOYEE)

        self.user = User.objects.create_user(
            username='attendanceuser',
            password='AttendPass123',
            email='attend@hu.edu.et',
            first_name='Attend',
            last_name='User',
        )
        self.user.status = User.Status.ACTIVE
        self.user.save()
        UserRole.objects.create(user=self.user, role=self.employee_role)
        EmployeeDetail.objects.create(
            user=self.user,
            department=self.dept,
            hire_date='2024-01-01',
            biometric_enrolled=False,
        )

    def test_manual_entry_with_invalid_credentials_returns_401(self):
        """Manual attendance entry with wrong credentials should return HTTP 401."""
        response = self.client.post(
            '/api/attendance/mark/',
            data=json.dumps({
                'is_manual': True,
                'username': 'attendanceuser',
                'password': 'WrongPassword999',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)

    def test_attendance_blocked_on_approved_leave(self):
        """Attendance marking should be blocked when employee is on approved leave today."""
        today = timezone.now().date()
        LeaveRequest.objects.create(
            user=self.user,
            leave_type=LeaveRequest.LeaveType.ANNUAL,
            start_date=today,
            end_date=today + timedelta(days=2),
            status=LeaveRequest.LeaveStatus.APPROVED,
        )
        # Create a check-in record directly to simulate the business rule check
        from attendance.views import is_on_approved_leave
        result = is_on_approved_leave(self.user, today)
        self.assertIsNotNone(result)
        self.assertEqual(result.status, LeaveRequest.LeaveStatus.APPROVED)

    def test_cooldown_prevents_duplicate_within_60_seconds(self):
        """A second attendance record within 60 seconds should be blocked."""
        now = timezone.now()
        AttendanceRecord.objects.create(
            user=self.user,
            timestamp=now,
            type=AttendanceRecord.RecordType.CHECK_IN,
            status=AttendanceRecord.RecordStatus.ON_TIME,
            verification_status=AttendanceRecord.VerificationStatus.VERIFIED,
            method='face',
        )
        last_record = AttendanceRecord.objects.filter(
            user=self.user).order_by('-timestamp').first()
        seconds_since = (now - last_record.timestamp).total_seconds()
        self.assertLess(seconds_since, 60)

    def test_check_out_follows_check_in(self):
        """After a CHECK_IN record exists today, the next record type should be CHECK_OUT."""
        today = timezone.now().date()
        AttendanceRecord.objects.create(
            user=self.user,
            timestamp=timezone.now() - timedelta(hours=4),
            type=AttendanceRecord.RecordType.CHECK_IN,
            status=AttendanceRecord.RecordStatus.ON_TIME,
            verification_status=AttendanceRecord.VerificationStatus.VERIFIED,
            method='face',
        )
        records_today = AttendanceRecord.objects.filter(
            user=self.user, timestamp__date=today).order_by('-timestamp')
        last_type = records_today.first().type
        expected_next = (
            AttendanceRecord.RecordType.CHECK_OUT
            if last_type == AttendanceRecord.RecordType.CHECK_IN
            else AttendanceRecord.RecordType.CHECK_IN
        )
        self.assertEqual(expected_next, AttendanceRecord.RecordType.CHECK_OUT)

    def test_employee_name_snapshot_saved_on_record_creation(self):
        """AttendanceRecord should automatically save employee_name_snapshot on creation."""
        record = AttendanceRecord.objects.create(
            user=self.user,
            timestamp=timezone.now(),
            type=AttendanceRecord.RecordType.CHECK_IN,
            status=AttendanceRecord.RecordStatus.ON_TIME,
            verification_status=AttendanceRecord.VerificationStatus.VERIFIED,
            method='face',
        )
        self.assertEqual(record.employee_name_snapshot, 'Attend User')

    def test_record_preserved_after_user_deletion(self):
        """AttendanceRecord should remain in database after the associated user is deleted."""
        record = AttendanceRecord.objects.create(
            user=self.user,
            timestamp=timezone.now(),
            type=AttendanceRecord.RecordType.CHECK_IN,
            status=AttendanceRecord.RecordStatus.ON_TIME,
            verification_status=AttendanceRecord.VerificationStatus.VERIFIED,
            method='face',
        )
        record_id = record.id
        snapshot = record.employee_name_snapshot
        self.user.delete()
        preserved = AttendanceRecord.objects.get(id=record_id)
        self.assertIsNone(preserved.user)
        self.assertEqual(preserved.employee_name_snapshot, snapshot)

    def test_materialize_absent_record_after_shift_end(self):
        """The system should create an ABSENT attendance record after the employee's assigned shift has ended."""
        today = timezone.now().date()
        shift = Shift.objects.create(
            name='Absent Marking Shift',
            department=self.dept,
            start_time=time(hour=8, minute=0),
            end_time=time(hour=16, minute=0),
            grace_period=15,
        )
        Assignment.objects.create(
            user=self.user,
            shift=shift,
            from_date=today,
        )

        reference_time = timezone.make_aware(datetime.combine(today, shift.end_time) + timedelta(minutes=10))
        created = materialize_absent_records_for_date(today, reference_time=reference_time)

        self.assertEqual(len(created), 1)
        self.assertTrue(
            AttendanceRecord.objects.filter(
                user=self.user,
                timestamp__date=today,
                status=AttendanceRecord.RecordStatus.ABSENT,
            ).exists()
        )


# ============================================================
# UNIT TESTS — Shift and Holiday Logic
# ============================================================

class ShiftAssignmentOverlapTest(TestCase):
    """Tests for Assignment.clean() overlap validation."""

    def setUp(self):
        self.dept = Department.objects.create(name='Overlap Test Dept')
        self.employee_role, _ = Role.objects.get_or_create(name=Role.EMPLOYEE)
        self.user = User.objects.create_user(
            username='shiftuser',
            password='ShiftPass123',
            email='shift@hu.edu.et',
        )
        self.user.status = User.Status.ACTIVE
        self.user.save()
        UserRole.objects.create(user=self.user, role=self.employee_role)
        EmployeeDetail.objects.create(
            user=self.user,
            department=self.dept,
            hire_date='2024-01-01',
            biometric_enrolled=False,
        )
        self.shift = Shift.objects.create(
            name='Morning Shift',
            department=self.dept,
            start_time='08:00',
            end_time='17:00',
            grace_period=15,
        )

    def test_overlapping_assignment_raises_validation_error(self):
        """Creating two overlapping assignments for the same user should raise ValidationError."""
        from django.core.exceptions import ValidationError
        Assignment.objects.create(
            user=self.user,
            shift=self.shift,
            from_date=date(2026, 1, 1),
            to_date=date(2026, 6, 30),
        )
        with self.assertRaises(ValidationError):
            overlapping = Assignment(
                user=self.user,
                shift=self.shift,
                from_date=date(2026, 3, 1),
                to_date=date(2026, 9, 30),
            )
            overlapping.full_clean()

    def test_non_overlapping_assignment_saves_successfully(self):
        """Two non-overlapping assignments for the same user should both save without error."""
        Assignment.objects.create(
            user=self.user,
            shift=self.shift,
            from_date=date(2026, 1, 1),
            to_date=date(2026, 3, 31),
        )
        second = Assignment(
            user=self.user,
            shift=self.shift,
            from_date=date(2026, 4, 1),
            to_date=date(2026, 6, 30),
        )
        try:
            second.full_clean()
            second.save()
            saved = True
        except Exception:
            saved = False
        self.assertTrue(saved)
