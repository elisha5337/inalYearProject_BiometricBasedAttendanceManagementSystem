import uuid
from django.db import models
from accounts.models import User

# 8. Devices Table
class Device(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    device_serial = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
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
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='userId')
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, blank=True, db_column='deviceId')
    timestamp = models.DateTimeField()
    type = models.CharField(max_length=50, choices=RecordType.choices)
    status = models.CharField(max_length=50, choices=RecordStatus.choices)
    verification_status = models.CharField(
        max_length=50, 
        choices=VerificationStatus.choices, 
        default=VerificationStatus.VERIFIED
    )