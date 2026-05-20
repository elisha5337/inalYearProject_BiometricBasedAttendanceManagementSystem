import uuid
from django.db import models
from accounts.models import User

# 8. Devices Table
class Device(models.Model):
    class DeviceType(models.TextChoices):
        KIOSK = 'Kiosk', 'Kiosk'
        HANDHELD = 'Handheld', 'Handheld'
        DESKTOP = 'Desktop', 'Desktop'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    device_serial = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=DeviceType.choices, default=DeviceType.KIOSK)
    ip_address = models.GenericIPAddressField(unique=True)
    port = models.IntegerField()
    location = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)

# 4. Attendance Records Table
class AttendanceRecord(models.Model):
    class RecordType(models.TextChoices):
        CHECK_IN = 'CHECK_IN', 'Check-in'
        CHECK_OUT = 'CHECK_OUT', 'Check-out'

    class RecordStatus(models.TextChoices):
        ON_TIME = 'ON_TIME', 'On-time'
        LATE = 'LATE', 'Late'
        EARLY_EXIT = 'EARLY_EXIT', 'Early-exit'
        OVERTIME = 'OVERTIME', 'Overtime'

    class VerificationStatus(models.TextChoices):
        VERIFIED = 'VERIFIED', 'Verified'
        UNVERIFIED = 'UNVERIFIED', 'Unverified (Bypass)'
        PENDING = 'PENDING', 'Pending Validation'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    
    # [INSTITUTIONAL INTEGRITY] 
    # Use SET_NULL instead of CASCADE to preserve history if a user is deleted
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, db_column='userId')
    
    # Store username/metadata as a string backup for deleted users
    employee_name_snapshot = models.CharField(max_length=255, null=True, blank=True, help_text="Permanent backup of name for audit.")
    
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, blank=True, db_column='deviceId')
    timestamp = models.DateTimeField()
    type = models.CharField(max_length=50, choices=RecordType.choices)
    status = models.CharField(max_length=50, choices=RecordStatus.choices)
    verification_status = models.CharField(
        max_length=50, 
        choices=VerificationStatus.choices, 
        default=VerificationStatus.VERIFIED
    )
    method = models.CharField(
        max_length=50,
        default='face',
        help_text="Method used: face, fingerprint, manual"
    )

    def save(self, *args, **kwargs):
        # Capture the name snapshot automatically on first save
        if self.user and not self.employee_name_snapshot:
            self.employee_name_snapshot = self.user.get_full_name() or self.user.username
        super().save(*args, **kwargs)

    def __str__(self):
        name = self.employee_name_snapshot or "Unknown User"
        return f"{name} - {self.get_type_display()} at {self.timestamp}"
