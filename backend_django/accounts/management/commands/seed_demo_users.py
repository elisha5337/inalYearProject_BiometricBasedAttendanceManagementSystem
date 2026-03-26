from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import EmployeeDetail, Role, User


DEMO_USERS = [
    {
        "username": "elsa",
        "email": "elsa@hu.edu.et",
        "first_name": "Admin",
        "last_name": "User",
        "password": "Admin@123",
        "role_name": Role.ADMINISTRATOR,
    },
    {
        "username": "hr_demo",
        "email": "hr_demo@hu.edu.et",
        "first_name": "HR",
        "last_name": "Officer",
        "password": "Hr@12345",
        "role_name": Role.HR_OFFICER,
    },
    {
        "username": "employee_demo",
        "email": "employee_demo@hu.edu.et",
        "first_name": "Employee",
        "last_name": "Demo",
        "password": "Employee@123",
        "role_name": Role.EMPLOYEE,
    },
]


class Command(BaseCommand):
    help = "Create or refresh demo login users for Admin, HR, and Employee roles."

    @transaction.atomic
    def handle(self, *args, **options):
        roles = {}

        for role_name, description in Role.ROLE_CHOICES:
            role, _ = Role.objects.get_or_create(
                name=role_name,
                defaults={"description": description},
            )
            roles[role_name] = role

        for demo_user in DEMO_USERS:
            user, created = User.objects.get_or_create(
                username=demo_user["username"],
                defaults={
                    "email": demo_user["email"],
                    "first_name": demo_user["first_name"],
                    "last_name": demo_user["last_name"],
                    "status": User.Status.ACTIVE,
                    "must_change_password": False,
                },
            )

            user.email = demo_user["email"]
            user.first_name = demo_user["first_name"]
            user.last_name = demo_user["last_name"]
            user.status = User.Status.ACTIVE
            user.must_change_password = False
            user.set_password(demo_user["password"])
            user.save()

            user.roles.clear()
            user.roles.add(roles[demo_user["role_name"]])

            if demo_user["role_name"] == Role.EMPLOYEE:
                EmployeeDetail.objects.get_or_create(
                    user=user,
                    defaults={
                        "hire_date": date(2026, 1, 1),
                    },
                )

            action = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{action} demo user: {demo_user['username']} ({demo_user['role_name']})"
                )
            )

        self.stdout.write("")
        self.stdout.write(self.style.WARNING("Demo credentials"))
        for demo_user in DEMO_USERS:
            self.stdout.write(
                f"  {demo_user['role_name']}: "
                f"username={demo_user['username']} password={demo_user['password']}"
            )
