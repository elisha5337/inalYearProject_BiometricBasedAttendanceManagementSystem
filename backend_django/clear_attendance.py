import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from attendance.models import AttendanceRecord
from reporting.models import AuditLog

def clear_attendance_only():
    print("--- ATTENDANCE DATA RESET INITIATED ---")
    
    count = AttendanceRecord.objects.count()
    if count == 0:
        print("No attendance records found to delete.")
        return

    # 1. Delete all attendance records
    print(f"Deleting {count} Attendance Records...")
    AttendanceRecord.objects.all().delete()
    
    # 2. Log the maintenance event
    print("Logging the maintenance event in Audit Log...")
    AuditLog.objects.create(
        action='ATTENDANCE_CLEARED',
        description=f'Manual cleanup: {count} attendance records were deleted from the system.'
    )
    
    print("\n✅ ATTENDANCE RECORDS CLEARED SUCCESSFULLY.")
    print("Note: Biometric face templates and user accounts remain intact.")

if __name__ == "__main__":
    confirm = input("!!! WARNING !!! This will permanently delete ALL attendance logs. Are you sure? (y/N): ")
    if confirm.lower() == 'y':
        clear_attendance_only()
    else:
        print("Operation cancelled.")
