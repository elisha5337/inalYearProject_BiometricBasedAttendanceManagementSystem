import re
from typing import Any, List, Optional
from django.utils import timezone
from .models import Policy

class PolicyResolver:
    """
    Centralized utility to fetch and resolve policies for individuals, 
    departments, or the entire organization.
    """

    @staticmethod
    def get_active_policy(name: str, department_id: Optional[str] = None) -> Optional[Policy]:
        """
        Fetches an active policy by name.
        Checks for department-specific policy first, then falls back to global (null department).
        """
        # 1. Try Department-Specific Policy
        if department_id:
            dept_policy = Policy.objects.filter(
                name__iexact=name, 
                department_id=department_id, 
                is_active=True
            ).first()
            if dept_policy:
                return dept_policy

        # 2. Fallback to Global Policy
        global_policy = Policy.objects.filter(
            name__iexact=name, 
            department__isnull=True, 
            is_active=True
        ).first()
        
        return global_policy

    @staticmethod
    def extract_numeric_value(policy_value: str) -> float:
        """
        Extracts the first numeric value from a string (e.g., '15 Mins' -> 15.0).
        Returns 0.0 if no numeric found.
        """
        if not policy_value:
            return 0.0
        
        match = re.search(r"(\d+(\.\d+)?)", str(policy_value))
        if match:
            return float(match.group(1))
        return 0.0

    @staticmethod
    def is_late(check_in_time: timezone.datetime, shift_start_time: timezone.datetime, grace_period_policy: Optional[Policy] = None) -> bool:
        """
        Determines if a check-in is late, accounting for an optional Grace Period policy.
        """
        if not check_in_time or not shift_start_time:
            return False

        # Calculate base delay in minutes
        delay = (check_in_time - shift_start_time).total_seconds() / 60.0

        if delay <= 0:
            return False

        # Apply Grace Period if policy exists
        grace_minutes = 0.0
        if grace_period_policy:
            grace_minutes = PolicyResolver.extract_numeric_value(grace_period_policy.value)

        return delay > grace_minutes

    @staticmethod
    def calculate_leave_balance(user, department_id=None):
        """
        Calculates remaining leave for a user based on active policies and approved requests.
        """
        from .models import LeaveRequest
        
        # 1. Fetch Allowances
        annual_policy = PolicyResolver.get_active_policy('Annual Leave', department_id)
        medical_policy = PolicyResolver.get_active_policy('Medical/Sick Leave', department_id)
        
        annual_quota = PolicyResolver.extract_numeric_value(annual_policy.value) if annual_policy else 20.0
        sick_quota = PolicyResolver.extract_numeric_value(medical_policy.value) if medical_policy else 12.0
        
        # 2. Sum up approved days
        approved_leaves = LeaveRequest.objects.filter(
            user=user, 
            status=LeaveRequest.LeaveStatus.APPROVED
        )
        
        annual_taken = 0.0
        sick_taken = 0.0
        
        for r in approved_leaves:
            days = (r.end_date - r.start_date).days + 1
            if r.leave_type == LeaveRequest.LeaveType.ANNUAL:
                annual_taken += days
            elif r.leave_type == LeaveRequest.LeaveType.SICK:
                sick_taken += days
                
        return {
            'annual': max(0.0, annual_quota - annual_taken),
            'sick': max(0.0, sick_quota - sick_taken),
            'total_quota': {
                'annual': annual_quota,
                'sick': sick_quota
            }
        }

def get_policy_rules(policy_name: str, department_id: Optional[str] = None) -> List[str]:
    """Helper to get rules list directly."""
    policy = PolicyResolver.get_active_policy(policy_name, department_id)
    if policy and isinstance(policy.rules, list):
        return policy.rules
    return []
