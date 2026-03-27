import uuid
from django.db import models
from accounts.models import User, Department

# 10. Shifts Table
class Shift(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, db_column='departmentId')
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    grace_period = models.IntegerField(default=15) # In minutes
    work_days = models.CharField(max_length=100, default='Mon - Fri')

# 11. Assignments Table
class Assignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='userId')
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, db_column='shiftId')
    from_date = models.DateField()
    to_date = models.DateField(null=True, blank=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments_made', db_column='assignedBy')