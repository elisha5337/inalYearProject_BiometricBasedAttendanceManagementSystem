import uuid
from django.db import models
from accounts.models import User

# 15. Audit Logs Table
class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, db_column='userId')
    action = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)

# 16. Report Table
class Report(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    type = models.CharField(max_length=50)
    parameters = models.JSONField(null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

# 17. Notification Table
class Notification(models.Model):
    class NotifType(models.TextChoices):
        INFO = 'INFO', 'Info'
        SUCCESS = 'SUCCESS', 'Success'
        WARNING = 'WARNING', 'Warning'
        ERROR = 'ERROR', 'Error'

    class NotifStatus(models.TextChoices):
        UNREAD = 'UNREAD', 'Unread'
        READ = 'READ', 'Read'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='userId')
    type = models.CharField(max_length=50, choices=NotifType.choices, default=NotifType.INFO)
    title = models.CharField(max_length=255, default='System Notification')
    message = models.TextField()
    status = models.CharField(max_length=50, choices=NotifStatus.choices, default=NotifStatus.UNREAD)
    sent_at = models.DateTimeField(auto_now_add=True)