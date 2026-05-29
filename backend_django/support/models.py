import uuid
from django.db import models
from accounts.models import User

class FAQCategory(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, default='HelpCircle', help_text="Lucide icon name")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = "FAQ Categories"
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

class FAQItem(models.Model):
    category = models.ForeignKey(FAQCategory, related_name='items', on_delete=models.CASCADE)
    question = models.CharField(max_length=255)
    answer = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'question']

    def __str__(self):
        return self.question

class Complaint(models.Model):
    class Recipient(models.TextChoices):
        HR = 'HR', 'HR'
        ADMIN = 'ADMIN', 'Admin'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        IN_REVIEW = 'IN_REVIEW', 'In Review'
        RESOLVED = 'RESOLVED', 'Resolved'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='userId')
    recipient = models.CharField(max_length=10, choices=Recipient.choices)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Complaint by {self.user.username} to {self.recipient}: {self.subject}"
