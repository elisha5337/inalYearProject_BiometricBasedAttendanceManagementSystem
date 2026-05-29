"""
Module: accounts/tests.py
Project: BBEAMS
Description: Automated unit and integration tests for authentication,
             user management, biometric registry, and role enforcement.
"""

import json
import numpy as np
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from accounts.models import Role, UserRole, EmployeeDetail, Department, BiometricTemplate
from accounts.biometric_service import BiometricRegistry
from leave.utils import PolicyResolver

User = get_user_model()


# ============================================================
# UNIT TESTS — BiometricRegistry
# ============================================================

class BiometricRegistryMatchTest(TestCase):
    """Tests for BiometricRegistry.find_match vectorized cosine matching."""

    def setUp(self):
        self.registry = BiometricRegistry()

    def test_identical_vector_returns_match(self):
        """An enrolled vector matched against itself should return distance near 0."""
        vec = np.random.rand(512).astype(np.float32)
        vec = vec / np.linalg.norm(vec)
        self.registry.embeddings_matrix = np.array([vec])
        self.registry.user_data = [{'id': 'test-uuid-001', 'username': 'testuser'}]
        match, distance = self.registry.find_match(vec.tolist(), threshold=0.50)
        self.assertIsNotNone(match)
        self.assertAlmostEqual(distance, 0.0, places=3)

    def test_orthogonal_vector_returns_no_match(self):
        """A vector orthogonal to all enrolled templates should return no match."""
        enrolled = np.zeros(512, dtype=np.float32)
        enrolled[0] = 1.0
        query = np.zeros(512, dtype=np.float32)
        query[1] = 1.0
        self.registry.embeddings_matrix = np.array([enrolled])
        self.registry.user_data = [{'id': 'test-uuid-002', 'username': 'otheruser'}]
        match, distance = self.registry.find_match(query.tolist(), threshold=0.50)
        self.assertIsNone(match)
        self.assertGreater(distance, 0.50)

    def test_empty_registry_returns_no_match(self):
        """An empty registry should return None and distance 1.0."""
        self.registry.embeddings_matrix = None
        self.registry.user_data = []
        match, distance = self.registry.find_match(
            np.random.rand(512).tolist(), threshold=0.50)
        self.assertIsNone(match)
        self.assertEqual(distance, 1.0)

    def test_zero_query_vector_returns_no_match(self):
        """A zero-norm query vector should be safely rejected."""
        vec = np.ones(512, dtype=np.float32)
        vec = vec / np.linalg.norm(vec)
        self.registry.embeddings_matrix = np.array([vec])
        self.registry.user_data = [{'id': 'test-uuid-003', 'username': 'zerotest'}]
        zero_vec = np.zeros(512).tolist()
        match, distance = self.registry.find_match(zero_vec, threshold=0.50)
        self.assertIsNone(match)


# ============================================================
# UNIT TESTS — PolicyResolver
# ============================================================

class PolicyResolverTest(TestCase):
    """Tests for PolicyResolver utility methods."""

    def test_extract_numeric_value_with_units(self):
        """Should extract the numeric portion from a string with units."""
        result = PolicyResolver.extract_numeric_value('15 Mins')
        self.assertEqual(result, 15.0)

    def test_extract_numeric_value_plain_number(self):
        """Should extract a plain numeric string correctly."""
        result = PolicyResolver.extract_numeric_value('20')
        self.assertEqual(result, 20.0)

    def test_extract_numeric_value_empty_string(self):
        """Should return 0.0 for an empty string."""
        result = PolicyResolver.extract_numeric_value('')
        self.assertEqual(result, 0.0)

    def test_extract_numeric_value_no_number(self):
        """Should return 0.0 when no numeric value is present."""
        result = PolicyResolver.extract_numeric_value('Never')
        self.assertEqual(result, 0.0)

    def test_extract_numeric_value_decimal(self):
        """Should correctly extract decimal values."""
        result = PolicyResolver.extract_numeric_value('2.5 hours')
        self.assertEqual(result, 2.5)


# ============================================================
# INTEGRATION TESTS — Authentication API
# ============================================================

class AuthenticationAPITest(TestCase):
    """Integration tests for login, registration, and logout endpoints."""

    def setUp(self):
        self.client = Client()
        self.dept = Department.objects.create(name='Software Engineering')
        self.employee_role, _ = Role.objects.get_or_create(name=Role.EMPLOYEE)

        # Create a standard active employee user
        self.user = User.objects.create_user(
            username='testemployee',
            password='TestPass123',
            email='testemployee@hu.edu.et',
            first_name='Test',
            last_name='Employee',
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

    def test_login_valid_credentials_returns_200_and_tokens(self):
        """Valid credentials with correct role should return HTTP 200 and JWT tokens."""
        response = self.client.post(
            '/accounts/api/login/',
            data=json.dumps({
                'identifier': 'testemployee',
                'password': 'TestPass123',
                'role': 'employee',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('tokens', data)
        self.assertIn('access', data['tokens'])

    def test_login_wrong_password_returns_401(self):
        """Wrong password should return HTTP 401 with error message."""
        response = self.client.post(
            '/accounts/api/login/',
            data=json.dumps({
                'identifier': 'testemployee',
                'password': 'WrongPassword',
                'role': 'employee',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)
        data = response.json()
        self.assertFalse(data['success'])

    def test_login_suspended_account_returns_403(self):
        """A suspended account should be blocked with HTTP 403."""
        self.user.status = User.Status.SUSPENDED
        self.user.save()
        response = self.client.post(
            '/accounts/api/login/',
            data=json.dumps({
                'identifier': 'testemployee',
                'password': 'TestPass123',
                'role': 'employee',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)

    def test_login_wrong_role_returns_403(self):
        """Attempting to log in with a role the user does not possess should return HTTP 403."""
        response = self.client.post(
            '/accounts/api/login/',
            data=json.dumps({
                'identifier': 'testemployee',
                'password': 'TestPass123',
                'role': 'admin',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)

    def test_login_missing_fields_returns_400(self):
        """Missing identifier or password should return HTTP 400."""
        response = self.client.post(
            '/accounts/api/login/',
            data=json.dumps({'identifier': '', 'password': ''}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_register_valid_payload_creates_employee(self):
        """Valid self-registration should create a user with Employee role only."""
        response = self.client.post(
            '/accounts/api/register/',
            data=json.dumps({
                'username': 'newstaff',
                'email': 'newstaff@hu.edu.et',
                'first_name': 'New',
                'last_name': 'Staff',
                'password': 'NewPass123',
                'department_id': str(self.dept.id),
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        new_user = User.objects.get(username='newstaff')
        self.assertTrue(new_user.is_employee)
        self.assertFalse(new_user.is_administrator)
        self.assertFalse(new_user.is_hr_officer)

    def test_register_duplicate_username_returns_400(self):
        """Registering with an already taken username should return HTTP 400."""
        response = self.client.post(
            '/accounts/api/register/',
            data=json.dumps({
                'username': 'testemployee',
                'email': 'another@hu.edu.et',
                'first_name': 'Another',
                'last_name': 'User',
                'password': 'AnotherPass123',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])

    def test_register_short_password_returns_400(self):
        """Password shorter than 8 characters should be rejected with HTTP 400."""
        response = self.client.post(
            '/accounts/api/register/',
            data=json.dumps({
                'username': 'shortpass',
                'email': 'shortpass@hu.edu.et',
                'first_name': 'Short',
                'last_name': 'Pass',
                'password': '123',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)


# ============================================================
# INTEGRATION TESTS — Role Enforcement
# ============================================================

class RoleEnforcementTest(TestCase):
    """Tests verifying that role-based access control is enforced on protected endpoints."""

    def setUp(self):
        self.client = Client()
        self.employee_role, _ = Role.objects.get_or_create(name=Role.EMPLOYEE)

        self.employee = User.objects.create_user(
            username='plainemployee',
            password='EmpPass123',
            email='emp@hu.edu.et',
        )
        self.employee.status = User.Status.ACTIVE
        self.employee.save()
        UserRole.objects.create(user=self.employee, role=self.employee_role)
        EmployeeDetail.objects.create(
            user=self.employee,
            hire_date='2024-01-01',
            biometric_enrolled=False,
        )

    def _get_employee_token(self):
        """Helper to log in as employee and retrieve JWT access token."""
        response = self.client.post(
            '/accounts/api/login/',
            data=json.dumps({
                'identifier': 'plainemployee',
                'password': 'EmpPass123',
                'role': 'employee',
            }),
            content_type='application/json',
        )
        return response.json().get('tokens', {}).get('access', '')

    def test_employee_cannot_access_hr_records(self):
        """An Employee-role JWT should be denied access to HR attendance records."""
        token = self._get_employee_token()
        response = self.client.get(
            '/api/attendance/hr-records/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 403)

    def test_employee_cannot_list_all_users(self):
        """An Employee-role JWT should be denied access to the user listing endpoint."""
        token = self._get_employee_token()
        response = self.client.get(
            '/accounts/api/users/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_request_returns_401(self):
        """A request with no token should return HTTP 401."""
        response = self.client.get('/accounts/api/me/')
        self.assertEqual(response.status_code, 401)
