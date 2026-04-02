import os
import django
import numpy as np

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from accounts.models import User, BiometricTemplate, EmployeeDetail

def run_health_check():
    print("--- BIOMETRIC DATABASE INTEGRITY SCAN ---")
    
    # 1. Check for missing templates
    enrolled_users = EmployeeDetail.objects.filter(biometric_enrolled=True)
    missing_templates = []
    for detail in enrolled_users:
        if not BiometricTemplate.objects.filter(user=detail.user, type=BiometricTemplate.BiometricType.FACE).exists():
            missing_templates.append(detail.user.username)
    
    print(f"Total Users Marked 'Enrolled': {enrolled_users.count()}")
    if missing_templates:
        print(f"❌ WARNING: {len(missing_templates)} users are marked 'Enrolled' but have NO face data: {', '.join(missing_templates)}")
    else:
        print("✅ No users with missing face templates.")

    # 2. Check for orphaned templates
    all_users = list(User.objects.values_list('id', flat=True))
    orphaned_templates = BiometricTemplate.objects.exclude(user_id__in=all_users)
    
    if orphaned_templates.exists():
        print(f"❌ WARNING: Found {orphaned_templates.count()} face templates with NO matching user profile. (Recommendation: Delete Orphans)")
    else:
        print("✅ No orphaned biometric templates found.")

    # 3. Check for low-quality or corrupt data
    all_templates = BiometricTemplate.objects.all()
    corrupt_count = 0
    for template in all_templates:
        try:
            vec = np.array(template.template_data)
            if np.isnan(vec).any() or np.isinf(vec).any():
                corrupt_count += 1
            elif np.linalg.norm(vec) < 0.1:
                corrupt_count += 1
        except Exception:
            corrupt_count += 1
            
    if corrupt_count > 0:
        print(f"❌ WARNING: Found {corrupt_count} potentially corrupt biometric vectors.")
    else:
        print("✅ All biometric vectors are mathematically sound.")

    print("\n--- HEALTH CHECK COMPLETE ---")

if __name__ == "__main__":
    run_health_check()
