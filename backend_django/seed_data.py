import os
import django
import uuid

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from accounts.models import Role, User

def seed_data():
    print("Seeding roles...")
    roles = [
        ('Administrator', 'System administrator with full access'),
        ('HR Officer', 'HR officer with access to employee management'),
        ('Employee', 'Regular employee with limited access'),
    ]
    
    for name, desc in roles:
        role, created = Role.objects.get_or_create(name=name, defaults={'description': desc})
        if created:
            print(f"Created role: {name}")
        else:
            print(f"Role already exists: {name}")

    # 1. Create Administrator (Superuser)
    if not User.objects.filter(username='admin').exists():
        print("Creating superuser 'admin'...")
        User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    
    # 2. Create HR Officer
    hr_role = Role.objects.get(name='HR Officer')
    if not User.objects.filter(username='hr').exists():
        print("Creating HR user 'hr'...")
        hr_user = User.objects.create_user('hr', 'hr@example.com', 'hr123')
        hr_user.roles.add(hr_role)
    
    # 3. Create regular Employee
    emp_role = Role.objects.get(name='Employee')
    if not User.objects.filter(username='employee').exists():
        print("Creating employee user 'employee'...")
        emp_user = User.objects.create_user('employee', 'employee@example.com', 'employee123')
        emp_user.roles.add(emp_role)

    print("✅ Seed completed! You can now log in as:")
    print(" - admin / admin123 (Administrator)")
    print(" - hr / hr123 (HR Officer)")
    print(" - employee / employee123 (Employee)")

if __name__ == "__main__":
    seed_data()
