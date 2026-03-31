import os
import django
import uuid
import random
from datetime import date

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import Department, Position, EmployeeDetail, Role, UserRole, BiometricTemplate
from attendance.models import AttendanceRecord, Device
from leave.models import LeaveRequest, Policy
from scheduling.models import Shift, Assignment
from reporting.models import Notification, AuditLog

User = get_user_model()

def reset_database():
    print("--- FULL DATABASE RESET INITIATED ---")
    
    print("Cleaning up historical data...")
    AuditLog.objects.all().delete()
    Notification.objects.all().delete()
    AttendanceRecord.objects.all().delete()
    LeaveRequest.objects.all().delete()
    Assignment.objects.all().delete()
    
    print("Cleaning up biometric data...")
    BiometricTemplate.objects.all().delete()
    
    print("Cleaning up organizational structure...")
    UserRole.objects.all().delete()
    EmployeeDetail.objects.all().delete()
    Position.objects.all().delete()
    Shift.objects.all().delete()
    Department.objects.all().delete()
    Policy.objects.all().delete()
    
    print("Cleaning up users...")
    User.objects.all().delete()

    print("--- RE-SEEDING REAL INSTITUTIONAL DATA ---")

    # 1. Seed Roles
    admin_role, _ = Role.objects.get_or_create(name=Role.ADMINISTRATOR)
    hr_role, _ = Role.objects.get_or_create(name=Role.HR_OFFICER)
    emp_role, _ = Role.objects.get_or_create(name=Role.EMPLOYEE)

    # 2. Seed Departments and Positions
    institutional_data = [
        {
            "name": "Student Catering & Cafeteria Services",
            "description": "Manages all non-academic staff involved in food preparation and service.",
            "positions": ["Catering Service Manager", "Head Chef", "Senior Cook", "Food Service Assistant", "Kitchen Steward", "Kitchen Storekeeper"]
        },
        {
            "name": "Campus Security & Safety Department",
            "description": "Responsible for campus guards and safety officers.",
            "positions": ["Chief Security Officer", "Security Operations Supervisor", "Senior Security Guard", "Campus Patrol Officer", "Entry Point Controller", "Safety & Emergency Officer"]
        },
        {
            "name": "Human Resource Management Directorate",
            "description": "Administrative office focused on employee record-keeping.",
            "positions": ["HR Senior Officer", "Personnel Records Management Clerk", "Attendance & Leave Coordinator", "Liaison Officer"]
        },
        {
            "name": "ICT Infrastructure & Support Department",
            "description": "Technical team responsible for maintaining the campus network.",
            "positions": ["ICT Support Engineer", "Network Administrator", "System Administrator", "Hardware Maintenance Technician", "IT Helpdesk Coordinator"]
        },
        {
            "name": "Finance & Procurement Directorate",
            "description": "Administrative staff handling campus budget and purchasing.",
            "positions": ["Payroll & Benefits Accountant", "Procurement & Supplies Officer", "Junior Accountant", "Property & Asset Manager"]
        },
        {
            "name": "Facilities Management & Maintenance",
            "description": "Technical and manual labor staff for campus physical upkeep.",
            "positions": ["Facilities Maintenance Supervisor", "General Maintenance Technician", "Senior Electrician", "Senior Plumber", "Campus Groundskeeper", "Janitorial Lead"]
        },
        {
            "name": "General Administrative Support Office",
            "description": "Includes secretaries, office assistants, and clerks.",
            "positions": ["Executive Secretary", "Administrative Assistant", "General Office Clerk", "Data Entry Operator", "Archive Assistant"]
        },
        {
            "name": "Student Dormitory & Welfare Office",
            "description": "Staff dedicated to managing student housing facilities.",
            "positions": ["Dormitory Operations Manager", "Student Welfare Coordinator", "Housing Support Assistant", "Residential Proctor"]
        },
        {
            "name": "Campus Health Center Administration",
            "description": "Non-medical administrative staff and support personnel.",
            "positions": ["Medical Center Administrator", "Health Records Assistant", "Medical Supplies Storekeeper", "Patient Receptionist"]
        },
        {
            "name": "Library Support Services",
            "description": "Non-academic personnel responsible for library organization.",
            "positions": ["Library Technical Assistant", "Circulation Desk Supervisor", "Digital Archive Technician", "Library Clerk"]
        }
    ]

    all_positions = []
    ict_dept = None
    for item in institutional_data:
        dept = Department.objects.create(name=item["name"], description=item["description"])
        if "ICT" in dept.name:
            ict_dept = dept
        for pos_name in item["positions"]:
            pos = Position.objects.create(name=pos_name, department=dept)
            all_positions.append(pos)

    # 3. Create System Admins
    print("Recreating system administrators...")
    admin = User.objects.create_superuser(username='admin', password='password123', email='admin@hu.edu.et', first_name='System', last_name='Administrator')
    UserRole.objects.create(user=admin, role=admin_role)
    EmployeeDetail.objects.create(user=admin, department=ict_dept, position="System Administrator", hire_date=date.today(), biometric_enrolled=False)

    elsa = User.objects.create_superuser(username='elsa', password='Admin@123', email='elsa@hu.edu.et', first_name='Elsa', last_name='Admin')
    UserRole.objects.create(user=elsa, role=admin_role)
    EmployeeDetail.objects.create(user=elsa, department=ict_dept, position="ICT Support Engineer", hire_date=date.today(), biometric_enrolled=False)

    # 4. Create 100 Random Users
    print("Generating 100 employee accounts (Enrolled = False)...")
    first_names = ["Abebe", "Kebede", "Mulugeta", "Tadesse", "Almaz", "Aster", "Chala", "Desta", "Emebet", "Fikru", "Getachew", "Hirut", "Ismael", "Jemal", "Kassa", "Lema", "Mesfin", "Nigisti", "Omer", "Pawlos"]
    last_names = ["Bekele", "Tesfaye", "Girma", "Haile", "Mekonnen", "Assefa", "Teka", "Wolde", "Zewde", "Berhanu", "Dagne", "Eshetu", "Fesseha", "Gudeta", "Habte", "Ibrahim", "Jafar", "Kifle", "Lulseged", "Molla"]

    for i in range(1, 101):
        fn = random.choice(first_names)
        ln = random.choice(last_names)
        uname = f"user_{i:03d}"
        
        user = User.objects.create_user(
            username=uname,
            password='password123',
            email=f"{uname}@hu.edu.et",
            first_name=fn,
            last_name=ln
        )
        
        # Assign Employee Role
        UserRole.objects.create(user=user, role=emp_role)
        
        # Pick random position
        random_pos = random.choice(all_positions)
        
        EmployeeDetail.objects.create(
            user=user,
            department=random_pos.department,
            position=random_pos.name,
            hire_date=date.today(),
            biometric_enrolled=False
        )
        
        if i % 20 == 0:
            print(f"Created {i} users...")

    print("--- RESET COMPLETED SUCCESSFULLY ---")
    print("Total: 102 accounts (2 Admins + 100 Employees).")
    print("All accounts set to 'Not Enrolled'.")

if __name__ == "__main__":
    reset_database()
