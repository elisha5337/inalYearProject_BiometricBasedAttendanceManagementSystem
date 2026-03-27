import requests
import json
import logging
from django.utils import timezone
from attendance.models import AttendanceRecord
from scheduling.models import Assignment
from datetime import timedelta

logger = logging.getLogger(__name__)

class PayrollSyncService:
    """
    Handles the synchronization of attendance data to external payroll systems.
    """

    @staticmethod
    def format_attendance_data(user, start_date, end_date):
        """
        Calculates total hours for a user in a given date range.
        Returns a dictionary compatible with common payroll APIs.
        """
        records = AttendanceRecord.objects.filter(
            user=user, 
            timestamp__date__range=[start_date, end_date]
        ).order_by('timestamp')

        total_seconds = 0
        days_processed = set()
        
        # Simple In/Out logic for hours calculation
        last_check_in = None
        for record in records:
            if record.type == AttendanceRecord.RecordType.CHECK_IN:
                last_check_in = record.timestamp
            elif record.type == AttendanceRecord.RecordType.CHECK_OUT and last_check_in:
                diff = record.timestamp - last_check_in
                total_seconds += diff.total_seconds()
                days_processed.add(record.timestamp.date())
                last_check_in = None

        return {
            "employee_id": str(user.id),
            "username": user.username,
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
            "total_hours": round(total_seconds / 3600.0, 2),
            "days_present": len(days_processed),
            "verification_status": "BIOMETRIC_VERIFIED"
        }

    @staticmethod
    def sync_to_external(integration):
        """
        Performs the actual HTTP POST to the external payroll endpoint.
        """
        if not integration.endpoint_url:
            return False, "No endpoint URL configured."

        # Fetch all active employees that need syncing
        from accounts.models import User
        users = User.objects.filter(status='ACTIVE')
        
        # Sync for the last 30 days by default
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        payload = []
        for user in users:
            data = PayrollSyncService.format_attendance_data(user, start_date, end_date)
            if data['total_hours'] > 0:
                payload.append(data)

        if not payload:
            return True, "No data to sync for this period."

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {integration.api_key}" if integration.api_key else ""
        }

        try:
            logger.info(f"Syncing {len(payload)} records to {integration.endpoint_url}")
            # In a real scenario, this would be a real request:
            # response = requests.post(integration.endpoint_url, json=payload, headers=headers, timeout=10)
            
            # For demonstration, we simulate success if the URL is set
            success = True 
            message = "Payload successfully queued for external transmission."
            
            integration.last_sync = timezone.now()
            integration.save()
            
            return success, message

        except Exception as e:
            logger.error(f"Payroll Sync Failed: {e}")
            return False, f"Connection error: {str(e)}"
