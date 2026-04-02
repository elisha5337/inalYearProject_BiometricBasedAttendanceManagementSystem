import os
import django
import random
from datetime import datetime, timedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from django.contrib.auth import get_user_model
from attendance.models import AttendanceRecord
from django.utils import timezone

User = get_user_model()

def generate_mock_attendance(days=14):
    print(f"--- GENERATING MOCK ATTENDANCE FOR LAST {days} DAYS ---")
    
    users = User.objects.filter(is_superuser=False)
    if not users.exists():
        print("No employees found. Please seed users first.")
        return

    now = timezone.now()
    records_count = 0

    for day_offset in range(days):
        current_date = (now - timedelta(days=day_offset)).date()
        
        # Skip weekends (optional, but realistic)
        if current_date.weekday() >= 5: 
            continue

        print(f"Processing {current_date}...")

        for user in users:
            # 85% attendance rate
            if random.random() > 0.85:
                continue

            # --- CHECK IN ---
            # Random time between 07:45 and 08:30
            check_in_hour = 7 if random.random() > 0.3 else 8
            check_in_min = random.randint(45, 59) if check_in_hour == 7 else random.randint(0, 30)
            
            check_in_time = timezone.make_aware(datetime.combine(
                current_date, 
                datetime.min.time().replace(hour=check_in_hour, minute=check_in_min)
            ))

            # Status logic
            status = AttendanceRecord.RecordStatus.ON_TIME
            if check_in_hour == 8 and check_in_min > 15:
                status = AttendanceRecord.RecordStatus.LATE

            AttendanceRecord.objects.create(
                user=user,
                timestamp=check_in_time,
                type=AttendanceRecord.RecordType.CHECK_IN,
                status=status,
                verification_status=AttendanceRecord.VerificationStatus.VERIFIED
            )

            # --- CHECK OUT ---
            # Random time between 16:50 and 17:30
            check_out_time = timezone.make_aware(datetime.combine(
                current_date, 
                datetime.min.time().replace(hour=16, minute=random.randint(50, 59)) if random.random() > 0.5 
                else datetime.min.time().replace(hour=17, minute=random.randint(0, 30))
            ))

            AttendanceRecord.objects.create(
                user=user,
                timestamp=check_out_time,
                type=AttendanceRecord.RecordType.CHECK_OUT,
                status=AttendanceRecord.RecordStatus.ON_TIME,
                verification_status=AttendanceRecord.VerificationStatus.VERIFIED
            )
            records_count += 2

    print(f"\n✅ SUCCESS: Generated {records_count} attendance events.")

if __name__ == "__main__":
    generate_mock_attendance()
