import uuid
from django.db import models
from django.core.exceptions import ValidationError
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

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.grace_period < 0:
            raise ValidationError({'grace_period': "Grace period cannot be negative."})
        if self.start_time and self.end_time and self.start_time == self.end_time:
            raise ValidationError("End time cannot be exactly the same as start time.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.start_time} - {self.end_time})"

# 11. Assignments Table
class Assignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='userId')
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, db_column='shiftId')
    from_date = models.DateField()
    to_date = models.DateField(null=True, blank=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments_made', db_column='assignedBy')

    def clean(self):
        """
        INSTITUTIONAL INTEGRITY CHECK:
        Prevents overlapping shift assignments for the same employee.
        """
        if self.to_date and self.from_date > self.to_date:
            raise ValidationError("Assignment Error: Start date cannot be after the end date.")

        existing_assignments = Assignment.objects.filter(user=self.user).exclude(id=self.id)
        
        for other in existing_assignments:
            if not other.to_date:
                if not self.to_date or self.to_date >= other.from_date:
                    raise ValidationError(f"Conflict: Employee is already assigned to shift '{other.shift.name}' indefinitely starting {other.from_date}.")
            elif not self.to_date:
                if self.from_date <= other.to_date:
                    raise ValidationError(f"Conflict: Infinite assignment overlaps with existing shift '{other.shift.name}' (ending {other.to_date}).")
            else:
                if (self.from_date <= other.to_date) and (self.to_date >= other.from_date):
                    raise ValidationError(f"Conflict: Selected dates overlap with an existing assignment for '{other.shift.name}' ({other.from_date} to {other.to_date}).")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Assignment: {self.user.username} -> {self.shift.name}"

# 25. Holiday Table (New for Defense)
class Holiday(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    name = models.CharField(max_length=255)
    date = models.DateField(unique=True)
    is_recurring = models.BooleanField(default=False, help_text="If true, this holiday repeats every year on this date.")
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.date})"

    class Meta:
        ordering = ['date']
