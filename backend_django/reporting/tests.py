from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase, Client

from leave.models import LeaveRequest

User = get_user_model()


class NotificationApiTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='notify_user', password='password123')
        self.client.force_login(self.user)

        LeaveRequest.objects.create(
            user=self.user,
            leave_type=LeaveRequest.LeaveType.ANNUAL,
            start_date=date.today(),
            end_date=date.today(),
            reason='Medical appointment',
            status=LeaveRequest.LeaveStatus.APPROVED,
        )

    def test_notifications_endpoint_handles_leave_updates(self):
        response = self.client.get('/api/reporting/my-notifications/')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload['success'])
        self.assertGreaterEqual(payload['unread_count'], 1)
        self.assertTrue(
            any(
                notification['title'] == 'Leave Request Approved'
                for notification in payload['notifications']
            )
        )
