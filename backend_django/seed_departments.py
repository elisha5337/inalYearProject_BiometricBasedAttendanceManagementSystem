import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from accounts.models import Department, Position

def seed_departments_and_positions():
    print("Deleting existing departments and positions...")
    Position.objects.all().delete()
    Department.objects.all().delete()

    data = [
        {
            "name": "Student Catering & Cafeteria Services",
            "description": "Manages all non-academic staff involved in food preparation and service for student lounges and campus cafeterias.",
            "positions": [
                "Catering Service Manager (Administration)",
                "Head Chef (Culinary Lead)",
                "Senior Cook (Food Prep)",
                "Food Service Assistant (Dining Hall)",
                "Kitchen Steward (Sanitation)",
                "Kitchen Storekeeper (Inventory)"
            ]
        },
        {
            "name": "Campus Security & Safety Department",
            "description": "Responsible for campus guards and safety officers who monitor entry points and ensure a secure environment for the IOT community.",
            "positions": [
                "Chief Security Officer (Command)",
                "Security Operations Supervisor (Shift Lead)",
                "Senior Security Guard (Enforcement)",
                "Campus Patrol Officer (Surveillance)",
                "Entry Point Controller (Biometric Gate)",
                "Safety & Emergency Officer (First Response)"
            ]
        },
        {
            "name": "Human Resource Management Directorate",
            "description": "Administrative office focused on employee record-keeping, biometric enrollment, and managing official leave requests.",
            "positions": [
                "HR Senior Officer (Management)",
                "Personnel Records Management Clerk (Data/Filing)",
                "Attendance & Leave Coordinator (System Audit)",
                "Liaison Officer (External/Staff)"
            ]
        },
        {
            "name": "ICT Infrastructure & Support Department",
            "description": "Technical team responsible for maintaining the campus network, biometric hardware, and the attendance management system.",
            "positions": [
                "ICT Support Engineer (Technical)",
                "Network Administrator (Connectivity)",
                "System Administrator (Server/Database)",
                "Hardware Maintenance Technician (Device Repair)",
                "IT Helpdesk Coordinator (User Support)"
            ]
        },
        {
            "name": "Finance & Procurement Directorate",
            "description": "Administrative staff handling campus budget, purchasing, and the processing of payroll based on attendance data.",
            "positions": [
                "Payroll & Benefits Accountant (Salary/Audit)",
                "Procurement & Supplies Officer (Purchasing)",
                "Junior Accountant (Bookkeeping)",
                "Property & Asset Manager (Inventory)"
            ]
        },
        {
            "name": "Facilities Management & Maintenance",
            "description": "Technical and manual labor staff including electricians, plumbers, and groundskeepers responsible for campus physical upkeep.",
            "positions": [
                "Facilities Maintenance Supervisor (Oversight)",
                "General Maintenance Technician (General Repair)",
                "Senior Electrician (Power/Wiring)",
                "Senior Plumber (Water/Sanitation)",
                "Campus Groundskeeper (Landscaping)",
                "Sanitation & Janitorial Lead (Cleaning)"
            ]
        },
        {
            "name": "General Administrative Support Office",
            "description": "Includes secretaries, office assistants, and clerks who provide operational support to various IOT departments.",
            "positions": [
                "Executive Secretary (Office Management)",
                "Administrative Assistant (Clerical)",
                "General Office Clerk (Documentation)",
                "Data Entry Operator (Digital Records)",
                "Archive & Documentation Assistant (Record Keeping)"
            ]
        },
        {
            "name": "Student Dormitory & Welfare Office",
            "description": "Staff dedicated to managing student housing facilities, dormitory cleanliness, and general student support services.",
            "positions": [
                "Dormitory Operations Manager (Housing)",
                "Student Welfare Coordinator (Student Support)",
                "Housing Support Assistant (Logistics)",
                "Residential Proctor (Supervision)"
            ]
        },
        {
            "name": "Campus Health Center Administration",
            "description": "Non-medical administrative staff and support personnel working within the IOT campus clinic or health post.",
            "positions": [
                "Medical Center Administrator (Clinic Ops)",
                "Health Records Assistant (Patient Data)",
                "Medical Supplies Storekeeper (Pharmacy Stock)",
                "Patient Receptionist (Front Desk)"
            ]
        },
        {
            "name": "Library Support Services",
            "description": "Non-academic personnel responsible for library organization, book circulation, and maintaining the study environment.",
            "positions": [
                "Library Technical Assistant (Systems/Ops)",
                "Circulation Desk Supervisor (Book Loans)",
                "Digital Archive Technician (E-Resources)",
                "Library Clerk (Shelving/Assistance)"
            ]
        }
    ]

    print("Inserting data...")
    for item in data:
        dept = Department.objects.create(name=item["name"], description=item["description"])
        print(f"Created Department: {dept.name}")
        for pos_name in item["positions"]:
            Position.objects.create(name=pos_name, department=dept)
            print(f"  - Created Position: {pos_name}")

    print("\nSeeding completed successfully!")

if __name__ == "__main__":
    seed_departments_and_positions()
