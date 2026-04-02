import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from accounts.models import BiometricTemplate, EmployeeDetail
from attendance.models import AttendanceRecord
from reporting.models import AuditLog

def clear_biometrics():
    print("--- BIOMETRIC DATA CLEANUP INITIATED ---")
    
    # 1. Delete all attendance records (they depend on biometric identity)
    print("Deleting all Attendance Records...")
    AttendanceRecord.objects.all().delete()
    
    # 2. Delete all facial templates
    print("Deleting all Biometric Templates (Faces)...")
    BiometricTemplate.objects.all().delete()
    
    # 3. Reset the 'enrolled' flag for all employees
    print("Resetting 'biometric_enrolled' flag for all staff...")
    EmployeeDetail.objects.all().update(biometric_enrolled=False)
    
    # 4. Log the maintenance event
    print("Logging the maintenance event...")
    AuditLog.objects.create(
        action='SYSTEM_MAINTENANCE',
        description='All biometric templates and attendance records were cleared manually.'
    )
    
    print("\n✅ CLEANUP COMPLETED.")
    print("All users remain in the system, but their face data is gone.")
    print("Please restart the Django server to clear the recognition cache.")

if __name__ == "__main__":
    confirm = input("Are you sure you want to delete ALL face data and attendance records? (y/N): ")
    if confirm.lower() == 'y':
        clear_biometrics()
    else:
        print("Operation cancelled.")
