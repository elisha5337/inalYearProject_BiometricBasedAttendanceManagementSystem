import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from accounts.models import User

users = User.objects.all()
if not users:
    print("❌ No users found in the database. Please run 'python seed_data.py'.")
else:
    print(f"✅ Found {users.count()} users:")
    for user in users:
        print(f" - Username: {user.username} | Superuser: {user.is_superuser}")
