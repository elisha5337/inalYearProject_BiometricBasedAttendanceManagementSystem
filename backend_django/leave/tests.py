from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import LeaveRequest, Policy
from accounts.models import Department
from datetime import date, timedelta

User = get_user_model()

class LeaveManagementTest(TestCase):
    def setUp(self):
        # Setup basic data
        self.user = User.objects.create_user(username="leave_user", password="password123")
        self.dept = Department.objects.create(name="Test Dept")
        self.policy = Policy.objects.create(
            name="Annual Leave",
            category="LEAVE",
            value="20",
            department=self.dept
        )

    def test_leave_request_creation(self):
        """Checks if a leave request can be successfully created."""
        request = LeaveRequest.objects.create(
            user=self.user,
            leave_type=LeaveRequest.LeaveType.ANNUAL,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=5),
            reason="Vacation",
            status=LeaveRequest.LeaveStatus.PENDING
        )
        self.assertEqual(request.status, LeaveRequest.LeaveStatus.PENDING)
        self.assertEqual(str(request.user), "leave_user")

    def test_leave_status_choices(self):
        """Validates that only allowed status choices are used."""
        request = LeaveRequest.objects.create(
            user=self.user,
            start_date=date.today(),
            end_date=date.today(),
            status=LeaveRequest.LeaveStatus.APPROVED
        )
        self.assertEqual(request.status, "APPROVED")

class PolicyTest(TestCase):
    def test_policy_default_values(self):
        """Ensures policies are active by default."""
        p = Policy.objects.create(name="General Policy", value="10")
        self.assertTrue(p.is_active)
        self.assertEqual(p.category, "ATTENDANCE")
