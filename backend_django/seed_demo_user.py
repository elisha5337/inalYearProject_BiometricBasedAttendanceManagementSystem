"""
Run with: python seed_demo_user.py
Creates a demo employee user for the fingerprint demo mode on the biometric terminal.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from accounts.models import User, Role, UserRole, EmployeeDetail, Department
from django.utils import timezone

USERNAME = 'demo'
PASSWORD = 'demo123'
FULL_NAME = ('Demo', 'Employee')

def run():
    if User.objects.filter(username=USERNAME).exists():
        user = User.objects.get(username=USERNAME)
        user.set_password(PASSWORD)
        user.status = User.Status.ACTIVE
        user.is_active = True
        user.must_change_password = False
        user.save()
        print(f"[OK] Demo user '{USERNAME}' already exists — password reset.")
    else:
        user = User.objects.create_user(
            username=USERNAME,
            password=PASSWORD,
            first_name=FULL_NAME[0],
            last_name=FULL_NAME[1],
            email='demo@hawassa.edu.et',
            must_change_password=False,
        )
        user.status = User.Status.ACTIVE
        user.is_active = True
        user.save()
        print(f"[OK] Demo user '{USERNAME}' created.")

    # Assign Employee role
    role, _ = Role.objects.get_or_create(name=Role.EMPLOYEE)
    UserRole.objects.get_or_create(user=user, role=role)

    # Create EmployeeDetail
    dept = Department.objects.first()
    EmployeeDetail.objects.update_or_create(
        user=user,
        defaults={
            'hire_date': timezone.now().date(),
            'biometric_enrolled': False,
            'department': dept,
            'position': 'Demo Staff',
        }
    )
    print(f"[OK] Demo user setup complete. Username: {USERNAME} | Password: {PASSWORD}")

if __name__ == '__main__':
    run()
