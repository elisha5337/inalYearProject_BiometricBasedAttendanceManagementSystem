#!/usr/bin/env python3
"""
Recognition System Diagnostic and Fix Script
Identifies and resolves common recognition issues in BBEAMS
"""

import os
import django
import numpy as np

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from accounts.models import User, BiometricTemplate, EmployeeDetail
from accounts.biometric_service import biometric_service

def diagnose_recognition_issues():
    print("=== BBEAMS Recognition System Diagnostic ===\n")
    
    # 1. Check user enrollment status
    total_users = User.objects.count()
    active_users = User.objects.filter(status='ACTIVE').count()
    enrolled_details = EmployeeDetail.objects.filter(biometric_enrolled=True).count()
    face_templates = BiometricTemplate.objects.filter(type='FACE').count()
    
    print(f"📊 System Status:")
    print(f"   Total Users: {total_users}")
    print(f"   Active Users: {active_users}")
    print(f"   Marked as Enrolled: {enrolled_details}")
    print(f"   Face Templates: {face_templates}")
    
    # 2. Identify enrollment mismatches
    mismatched_users = []
    for detail in EmployeeDetail.objects.filter(biometric_enrolled=True):
        if not BiometricTemplate.objects.filter(user=detail.user, type='FACE').exists():
            mismatched_users.append(detail.user.username)
    
    if mismatched_users:
        print(f"\n❌ ISSUE: {len(mismatched_users)} users marked enrolled but missing templates:")
        for username in mismatched_users[:5]:  # Show first 5
            print(f"   - {username}")
        if len(mismatched_users) > 5:
            print(f"   ... and {len(mismatched_users) - 5} more")
    else:
        print(f"\n✅ All enrolled users have biometric templates")
    
    # 3. Check template quality
    corrupt_templates = 0
    zero_norm_templates = 0
    
    for template in BiometricTemplate.objects.filter(type='FACE'):
        try:
            vec = np.array(template.template_data)
            if np.isnan(vec).any() or np.isinf(vec).any():
                corrupt_templates += 1
            elif np.linalg.norm(vec) < 0.1:
                zero_norm_templates += 1
        except:
            corrupt_templates += 1
    
    if corrupt_templates > 0:
        print(f"\n❌ ISSUE: {corrupt_templates} corrupt biometric templates found")
    if zero_norm_templates > 0:
        print(f"\n❌ ISSUE: {zero_norm_templates} zero-norm templates (poor quality)")
    
    if corrupt_templates == 0 and zero_norm_templates == 0:
        print(f"\n✅ All biometric templates are mathematically valid")
    
    # 4. Test biometric service
    try:
        biometric_service.reload_cache()
        if biometric_service.embeddings_matrix is not None:
            print(f"\n✅ Biometric service loaded {len(biometric_service.user_data)} templates")
        else:
            print(f"\n❌ ISSUE: Biometric service has no loaded templates")
    except Exception as e:
        print(f"\n❌ ISSUE: Biometric service error: {e}")
    
    # 5. Recommendations
    print(f"\n🔧 RECOMMENDATIONS:")
    
    if face_templates == 0:
        print("   1. No users enrolled - Use admin panel to enroll face biometrics")
        print("   2. Navigate to Admin > Manage Users > Select user > Enroll Biometrics")
    
    if mismatched_users:
        print("   3. Fix enrollment status mismatches:")
        print("      - Re-enroll users with missing templates, OR")
        print("      - Mark users as not enrolled if they don't have biometrics")
    
    if corrupt_templates > 0 or zero_norm_templates > 0:
        print("   4. Clean up corrupt templates:")
        print("      - Delete and re-enroll affected users")
    
    print("   5. Verify recognition thresholds are appropriate (now set to 0.65)")
    print("   6. Test recognition with enrolled users in good lighting")
    
    return {
        'total_users': total_users,
        'face_templates': face_templates,
        'mismatched_users': len(mismatched_users),
        'corrupt_templates': corrupt_templates,
        'service_loaded': biometric_service.embeddings_matrix is not None
    }

def fix_enrollment_mismatches():
    """Fix users marked as enrolled but missing templates"""
    print("\n=== Fixing Enrollment Mismatches ===")
    
    fixed_count = 0
    for detail in EmployeeDetail.objects.filter(biometric_enrolled=True):
        if not BiometricTemplate.objects.filter(user=detail.user, type='FACE').exists():
            detail.biometric_enrolled = False
            detail.save()
            fixed_count += 1
            print(f"   Fixed: {detail.user.username} - marked as not enrolled")
    
    if fixed_count > 0:
        print(f"\n✅ Fixed {fixed_count} enrollment status mismatches")
        biometric_service.reload_cache()
    else:
        print(f"\n✅ No mismatches to fix")

def create_demo_user():
    """Create a demo user for testing recognition"""
    print("\n=== Creating Demo User ===")
    
    demo_user, created = User.objects.get_or_create(
        username='demo',
        defaults={
            'email': 'demo@hawassa.edu.et',
            'first_name': 'Demo',
            'last_name': 'User',
            'status': 'ACTIVE'
        }
    )
    
    if created:
        demo_user.set_password('demo123')
        demo_user.save()
        print(f"✅ Created demo user: demo/demo123")
    else:
        print(f"✅ Demo user already exists: demo/demo123")
    
    # Create employee detail
    detail, created = EmployeeDetail.objects.get_or_create(
        user=demo_user,
        defaults={
            'biometric_enrolled': False,
            'hire_date': django.utils.timezone.now().date()
        }
    )
    
    return demo_user

if __name__ == "__main__":
    # Run diagnostic
    results = diagnose_recognition_issues()
    
    # Offer fixes
    print(f"\n" + "="*50)
    print("AUTOMATED FIXES AVAILABLE:")
    print("1. Fix enrollment mismatches")
    print("2. Create demo user for testing")
    print("3. Exit")
    
    try:
        choice = input("\nSelect option (1-3): ").strip()
        
        if choice == "1":
            fix_enrollment_mismatches()
        elif choice == "2":
            create_demo_user()
        elif choice == "3":
            print("Exiting...")
        else:
            print("Invalid choice")
            
    except KeyboardInterrupt:
        print("\nExiting...")
    
    print(f"\n=== Diagnostic Complete ===")