import uuid
import logging
from django.contrib.auth.models import AbstractUser, UserManager, Permission, Group
from django.db import models
from django.db.models.signals import m2m_changed, post_save, post_delete
from django.dispatch import receiver

logger = logging.getLogger(__name__)

# 1. Departments Table
class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    manager = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_department')

    def __str__(self):
        return self.name

# 20. Positions Table
class Position(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    name = models.CharField(max_length=255)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='positions', db_column='departmentId')

    def __str__(self):
        return f"{self.name} ({self.department.name})"

    class Meta:
        unique_together = ('name', 'department')

# 12. Roles Table
class Role(models.Model):
    ADMINISTRATOR = 'Administrator'
    HR_OFFICER = 'HR Officer'
    EMPLOYEE = 'Employee'
    
    ROLE_CHOICES = (
        (ADMINISTRATOR, 'System administrator with full access'),
        (HR_OFFICER, 'HR officer with access to employee management'),
        (EMPLOYEE, 'Regular employee with limited access'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    name = models.CharField(max_length=100, unique=True, choices=ROLE_CHOICES)
    description = models.TextField(blank=True, null=True)
    permissions = models.ManyToManyField(Permission, related_name='roles')

    def __str__(self):
        return self.get_name_display()

# 1. Users Table
class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        SUSPENDED = 'SUSPENDED', 'Suspended'

    status = models.CharField(max_length=50, choices=Status.choices, default=Status.ACTIVE)
    roles = models.ManyToManyField(Role, through='UserRole', related_name='users')
    must_change_password = models.BooleanField(default=False)
    
    objects = UserManager()

    def save(self, *args, **kwargs):
        # SECURITY POLICY: Dual-Admin Superuser model & Anti-Lockout.
        # Only 'admin' and 'elsa' accounts are permitted to access the Django backend.
        if self.username in ['admin', 'elsa']:
            self.is_staff = True
            self.is_superuser = True
            # Anti-Lockout: Designated superusers must remain ACTIVE.
            self.status = User.Status.ACTIVE
        else:
            self.is_staff = False
            self.is_superuser = False
            
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username

    @property
    def is_administrator(self):
        return self.is_superuser or self.roles.filter(name=Role.ADMINISTRATOR).exists()

    @property
    def is_hr_officer(self):
        return self.roles.filter(name=Role.HR_OFFICER).exists()

    @property
    def is_employee(self):
        return self.roles.filter(name=Role.EMPLOYEE).exists()

# 7. User Roles (Junction Table)
class UserRole(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='userId')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, db_column='roleId')
    assigned_at = models.DateTimeField(auto_now_add=True, db_column='assignedAt')

    class Meta:
        unique_together = ('user', 'role')

# 2. Employee Details Table
class EmployeeDetail(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, db_column='userId')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, db_column='departmentId')
    
    class EmploymentType(models.TextChoices):
        FULL_TIME = 'FULL_TIME', 'Full-time'
        PART_TIME = 'PART_TIME', 'Part-time'
        CONTRACT = 'CONTRACT', 'Contract'

    position = models.CharField(max_length=255, blank=True, null=True)
    employment_type = models.CharField(max_length=50, choices=EmploymentType.choices, null=True, blank=True, db_column='employmentType')
    hire_date = models.DateField(db_column='hireDate')
    biometric_enrolled = models.BooleanField(default=False, db_column='biometricEnrolled')
    phone = models.CharField(max_length=20, null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    profile_photo = models.TextField(null=True, blank=True)
    notification_settings = models.JSONField(default=dict, blank=True)
    regional_settings = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Profile of {self.user.username}"

# 9. Biometric Templates Table
class BiometricTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='biometric_templates', db_column='userId')
    
    class BiometricType(models.TextChoices):
        FACE = 'FACE', 'Face'
        FINGERPRINT = 'FINGERPRINT', 'Fingerprint'

    type = models.CharField(max_length=50, choices=BiometricType.choices)
    template_data = models.JSONField(db_column='templateData')

    def __str__(self):
        return f"{self.type} template for {self.user.username}"

# 18. Workflow Table
class Workflow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='_id')
    name = models.CharField(max_length=255)
    steps = models.JSONField(null=True, blank=True)

# 19. External Integrations Table
class ExternalIntegration(models.Model):
    class IntegrationStatus(models.TextChoices):
        CONNECTED    = 'CONNECTED',    'Connected'
        DISCONNECTED = 'DISCONNECTED', 'Disconnected'
        PENDING      = 'PENDING',      'Pending'
        ERROR        = 'ERROR',        'Error'

    class IntegrationType(models.TextChoices):
        PAYROLL       = 'PAYROLL',       'Payroll System'
        HR_SYSTEM     = 'HR_SYSTEM',     'HR System'
        COMMUNICATION = 'COMMUNICATION', 'Communication'
        SECURITY      = 'SECURITY',      'Security'
        ERP           = 'ERP',           'ERP System'

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    type        = models.CharField(max_length=50, choices=IntegrationType.choices)
    status      = models.CharField(max_length=20, choices=IntegrationStatus.choices, default=IntegrationStatus.DISCONNECTED)
    endpoint_url= models.URLField(blank=True, null=True, help_text="Base API URL for the integration")
    api_key     = models.CharField(max_length=512, blank=True, null=True, help_text="API key or webhook URL")
    last_sync   = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.status})"

# --- Signal Receivers ---

@receiver(m2m_changed, sender=User.roles.through)
def enforce_admin_singleton_policy(sender, instance, action, pk_set, **kwargs):
    """
    SECURITY ENFORCEMENT: Ensures only 'admin' and 'elsa' can possess 
    the 'Administrator' role. Automatically strips unauthorized assignments.
    """
    if action in ["post_add", "post_remove", "post_clear"]:
        try:
            admin_role = Role.objects.get(name=Role.ADMINISTRATOR)
            hr_role = Role.objects.get(name=Role.HR_OFFICER)
            hr_group, _ = Group.objects.get_or_create(name='HR_MANAGEMENT')

            # 1. Admin Role Enforcement
            if instance.username not in ['admin', 'elsa']:
                if instance.roles.filter(id=admin_role.id).exists():
                    logger.warning(f"Security Policy Violation: Unauthorized Admin role removed from {instance.username}")
                    instance.roles.remove(admin_role)

            # 2. HR Management Group Sync
            if instance.roles.filter(id=hr_role.id).exists():
                if hr_group not in instance.groups.all():
                    instance.groups.add(hr_group)
            else:
                if hr_group in instance.groups.all():
                    instance.groups.remove(hr_group)
        except Exception as e:
            logger.error(f"Signal enforcement error: {e}")

# --- BIOMETRIC LIVE SYNC ---

@receiver([post_save, post_delete], sender=BiometricTemplate)
def sync_biometric_registry_on_template_change(sender, instance, **kwargs):
    """
    Ensures the BiometricRegistry (AI search cache) remains in sync 
    with the database when templates are added or removed.
    """
    try:
        from .biometric_service import biometric_service
        biometric_service.reload_cache()
        logger.info(f"BiometricRegistry: Live-synchronized after change to {instance.user.username}'s template.")
    except Exception as e:
        logger.error(f"BiometricRegistry Sync Error: {e}")

@receiver(post_save, sender=User)
def sync_biometric_registry_on_user_status_change(sender, instance, created, **kwargs):
    """
    Reloads the registry if a user is suspended or activated, 
    as the registry only includes ACTIVE users.
    """
    if not created: # Only for updates
        try:
            from .biometric_service import biometric_service
            biometric_service.reload_cache()
            logger.info(f"BiometricRegistry: Live-synchronized after status change for {instance.username}.")
        except Exception as e:
            logger.error(f"BiometricRegistry User Sync Error: {e}")
