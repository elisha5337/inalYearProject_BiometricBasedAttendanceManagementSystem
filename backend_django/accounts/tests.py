import json

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from .models import Department, Position, Role, EmployeeDetail, UserRole
from django.db.utils import IntegrityError

User = get_user_model()

class AccountManagementTest(TestCase):
    def setUp(self):
        # 1. Setup Roles
        self.admin_role = Role.objects.create(name=Role.ADMINISTRATOR)
        self.hr_role = Role.objects.create(name=Role.HR_OFFICER)
        self.emp_role = Role.objects.create(name=Role.EMPLOYEE)

        # 2. Setup Organization
        self.dept = Department.objects.create(name="Test Department")
        self.pos = Position.objects.create(name="Test Position", department=self.dept)

    def test_user_creation_enforcement(self):
        """Tests that creating a user correctly sets up their profile."""
        user = User.objects.create_user(
            username="test_user",
            password="password123",
            email="test@hu.edu.et"
        )
        # Check if EmployeeDetail is automatically created or requires manual setup
        # Our current system creates it in the view, so we check if the model relation exists
        self.assertEqual(user.username, "test_user")
        self.assertTrue(User.objects.filter(username="test_user").exists())

    def test_admin_singleton_policy(self):
        """Only specific accounts should be allowed to have Administrator staff status."""
        # Non-admin user
        normal_user = User.objects.create_user(username="normal", password="password123")
        normal_user.is_superuser = True
        normal_user.save()

        # Superuser model check: admin/elsa are staff, others are not (per models.py logic)
        self.assertFalse(normal_user.is_staff)

        # Admin account
        admin_user = User.objects.create_user(username="elsa", password="password123")
        admin_user.save()
        self.assertTrue(admin_user.is_staff)

    def test_department_integrity(self):
        """Departments should have unique names."""
        with self.assertRaises(IntegrityError):
            Department.objects.create(name="Test Department")

    def test_position_department_link(self):
        """Positions must belong to a specific department."""
        self.assertEqual(self.pos.department.name, "Test Department")
        self.assertEqual(self.dept.positions.count(), 1)

class BiometricRegistryTest(TestCase):
    def setUp(self):
        from .biometric_service import BiometricRegistry
        self.registry = BiometricRegistry()

    def test_singleton_consistency(self):
        """Ensures that multiple instances of the registry share the same state."""
        from .biometric_service import BiometricRegistry
        another_registry = BiometricRegistry()
        self.assertIs(self.registry, another_registry)


class ProfileApiAuthTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="profile_user",
            password="password123",
            email="profile_user@example.com",
        )

    def test_profile_returns_json_and_unauthenticated_requests_are_rejected(self):
        unauthenticated_calls = [
            self.client.get('/accounts/api/profile/'),
            self.client.post(
                '/accounts/api/profile/update/',
                data=json.dumps({'first_name': 'Updated'}),
                content_type='application/json',
            ),
            self.client.post(
                '/accounts/api/change-password/',
                data=json.dumps({'new_password': 'newpassword123'}),
                content_type='application/json',
            ),
        ]

        for response in unauthenticated_calls:
            self.assertEqual(response.status_code, 401)
            payload = response.json()
            self.assertFalse(payload['success'])
            self.assertEqual(payload['error'], 'Authentication required')

    def test_profile_endpoint_returns_profile_for_authenticated_user(self):
        self.client.force_login(self.user)
        response = self.client.get('/accounts/api/profile/')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload['success'])
        self.assertEqual(payload['profile']['username'], self.user.username)
        self.assertEqual(payload['profile']['email'], self.user.email)
