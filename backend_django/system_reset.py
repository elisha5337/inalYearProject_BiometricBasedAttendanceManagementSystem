import os
import django
import uuid
from datetime import date

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import Department, Position, EmployeeDetail, Role, UserRole, BiometricTemplate, Workflow, ExternalIntegration
from attendance.models import AttendanceRecord, Device
from leave.models import LeaveRequest, Policy
from scheduling.models import Shift, Assignment
from reporting.models import Notification, AuditLog

User = get_user_model()

def reset_database():
    print("--- CRITICAL SYSTEM RESET INITIATED ---")
    print("Wiping all historical and configuration data...")
    
    # Order matters due to Foreign Key constraints
    AuditLog.objects.all().delete()
    Notification.objects.all().delete()
    AttendanceRecord.objects.all().delete()
    LeaveRequest.objects.all().delete()
    Assignment.objects.all().delete()
    BiometricTemplate.objects.all().delete()
    UserRole.objects.all().delete()
    EmployeeDetail.objects.all().delete()
    Position.objects.all().delete()
    Shift.objects.all().delete()
    Department.objects.all().delete()
    Policy.objects.all().delete()
    Workflow.objects.all().delete()
    ExternalIntegration.objects.all().delete()
    Device.objects.all().delete()
    # 1. Clean Users
    print("Deleting all existing users...")
    User.objects.all().delete()

    # 2. Re-Seed Foundation Roles
    print("Re-seeding core roles...")
    Role.objects.get_or_create(name=Role.ADMINISTRATOR, description="Full system access.")
    Role.objects.get_or_create(name=Role.HR_OFFICER, description="Human resources and leave management.")
    Role.objects.get_or_create(name=Role.EMPLOYEE, description="Regular attendance marking.")

    # 3. Create Clean Superuser (Admin)
    print("Creating primary system administrator...")
    admin = User.objects.create_superuser(
        username='admin',
        password='password123',
        email='admin@hu.edu.et',
        first_name='System',
        last_name='Admin'
    )
    admin_role = Role.objects.get(name=Role.ADMINISTRATOR)
    UserRole.objects.create(user=admin, role=admin_role)

    # 4. Create Secondary Admin (Elsa)
    print("Creating secondary administrator (Elsa)...")
    elsa = User.objects.create_superuser(
        username='elsa',
        password='Admin@123',
        email='elsa@hu.edu.et',
        first_name='Elsa',
        last_name='Admin'
    )
    UserRole.objects.create(user=elsa, role=admin_role)

    print("\n✅ SYSTEM RESET SUCCESSFUL.")
    print("--------------------------------------------------")
    print("Admin: admin / password123")
    print("Elsa:  elsa  / Admin@123")
    print("--------------------------------------------------")
    print("Note: The system is now completely empty. Please run your seeding script if you need demo data.")

if __name__ == "__main__":
    confirm = input("!!! WARNING !!! This will permanently DELETE ALL DATA. Are you 100% sure? (type 'YES' to confirm): ")
    if confirm == 'YES':
        reset_database()
    else:
        print("Safety triggered. Reset aborted.")
