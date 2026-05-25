import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from accounts.models import User

users = User.objects.all()
print(f"Total Users: {users.count()}")
for u in users:
    print(f"Username: {repr(u.username)} | Email: {repr(u.email)} | Is Active: {u.is_active} | Status: {u.status}")
