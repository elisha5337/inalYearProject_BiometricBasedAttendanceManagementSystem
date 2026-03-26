import uuid
from django.db import models
from accounts.models import User, Department

# 6. Policies Table
class Policy(models.Model):
    class PolicyType(models.TextChoices):
        ATTENDANCE = 'ATTENDANCE', 'Attendance'
        BIOMETRIC = 'BIOMETRIC', 'Biometric Enrollment'
        NOTIFICATION = 'NOTIFICATION', 'Notification'
        LEAVE = 'LEAVE', 'Leave'
        HR_ADMIN = 'HR_ADMIN', 'HR Admin'
        PAY_BENEFITS = 'PAY_BENEFITS', 'Pay/Benefits'
        SAFETY = 'SAFETY', 'Safety'
        HEALTH_WELFARE = 'HEALTH_WELFARE', 'Health & Welfare'
        ETHICS = 'ETHICS', 'Ethics'

    class PolicyUrgency(models.TextChoices):
        EXTREME = 'EXTREME', 'Extreme/Immediate'
        CRITICAL = 'CRITICAL', 'Critical/Legal'
        HIGH = 'HIGH', 'High Priority'
        MEDIUM = 'MEDIUM', 'Standard/Medium'
        LOW = 'LOW', 'Low Priority'
        OPTIONAL = 'OPTIONAL', 'Optional/Benefit'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=PolicyType.choices, default=PolicyType.ATTENDANCE)
    urgency = models.CharField(max_length=50, choices=PolicyUrgency.choices, default=PolicyUrgency.MEDIUM)
    description = models.TextField(blank=True, null=True)
    value = models.CharField(max_length=255, default='0')
    is_active = models.BooleanField(default=True)
    rules = models.JSONField(default=dict)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, db_column='departmentId')

# 5. Leave Requests Table
class LeaveRequest(models.Model):
    class LeaveStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class LeaveType(models.TextChoices):
        ANNUAL = 'ANNUAL', 'Annual'
        SICK = 'SICK', 'Sick'
        MATERNITY = 'MATERNITY', 'Maternity'
        PATERNITY = 'PATERNITY', 'Paternity'
        COMPASSIONATE = 'COMPASSIONATE', 'Compassionate'
        UNPAID = 'UNPAID', 'Unpaid'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leave_requests', db_column='userId')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_leaves', db_column='approvedBy')
    applied_policy = models.ForeignKey(Policy, on_delete=models.SET_NULL, null=True, blank=True, db_column='appliedPolicyId')
    leave_type = models.CharField(max_length=50, choices=LeaveType.choices, default=LeaveType.ANNUAL)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, choices=LeaveStatus.choices, default=LeaveStatus.PENDING)