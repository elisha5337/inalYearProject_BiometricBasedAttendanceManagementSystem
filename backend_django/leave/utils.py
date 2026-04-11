import re
import logging
from typing import Any, List, Optional, Dict
from django.utils import timezone
from django.db.models import Q
from .models import Policy

logger = logging.getLogger(__name__)

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
        if department_id:
            dept_policy = Policy.objects.filter(
                name__iexact=name, 
                department_id=department_id, 
                is_active=True
            ).first()
            if dept_policy:
                return dept_policy

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

        delay = (check_in_time - shift_start_time).total_seconds() / 60.0
        if delay <= 0:
            return False

        grace_minutes = 0.0
        if grace_period_policy:
            grace_minutes = PolicyResolver.extract_numeric_value(grace_period_policy.value)

        return delay > grace_minutes

    @staticmethod
    def calculate_leave_balance(user, department_id=None) -> Dict[str, Any]:
        """
        Dynamically calculates remaining leave balances.
        Subtracts both APPROVED and PENDING requests to prevent over-requesting.
        """
        from .models import LeaveRequest
        
        # 1. Identify all active leave-related policies
        policies = Policy.objects.filter(
            category=Policy.PolicyType.LEAVE,
            is_active=True
        ).filter(
            Q(department_id=department_id) | Q(department__isnull=True)
        ).order_by('department')

        # Map policies
        policy_map = {}
        for p in policies:
            key = p.name.upper()
            if 'ANNUAL' in key: target_key = 'ANNUAL'
            elif 'SICK' in key or 'MEDICAL' in key: target_key = 'SICK'
            elif 'MATERNITY' in key: target_key = 'MATERNITY'
            elif 'PATERNITY' in key: target_key = 'PATERNITY'
            elif 'COMPASSIONATE' in key: target_key = 'COMPASSIONATE'
            else: target_key = key
            
            policy_map[target_key] = PolicyResolver.extract_numeric_value(p.value)

        # Fallbacks
        if 'ANNUAL' not in policy_map: policy_map['ANNUAL'] = 20.0
        if 'SICK' not in policy_map: policy_map['SICK'] = 12.0

        # 2. Sum up APPROVED and PENDING days per type
        # We subtract pending requests so the UI shows "Available" balance correctly
        active_leaves = LeaveRequest.objects.filter(
            user=user, 
            status__in=[LeaveRequest.LeaveStatus.APPROVED, LeaveRequest.LeaveStatus.PENDING]
        )
        
        taken_map = {k: 0.0 for k in policy_map.keys()}
        
        for r in active_leaves:
            days = (r.end_date - r.start_date).days + 1
            l_type = r.leave_type
            if l_type in taken_map:
                taken_map[l_type] += float(days)
            else:
                taken_map[l_type] = float(days)

        # 3. Compile final balances
        balances = {}
        for l_type, quota in policy_map.items():
            taken = taken_map.get(l_type, 0.0)
            balances[l_type.lower()] = max(0.0, quota - taken)

        return {
            **balances,
            'total_quota': {k.lower(): v for k, v in policy_map.items()}
        }

def get_policy_rules(policy_name: str, department_id: Optional[str] = None) -> List[str]:
    """Helper to get rules list directly."""
    policy = PolicyResolver.get_active_policy(policy_name, department_id)
    if policy and isinstance(policy.rules, list):
        return policy.rules
    return []
