import os
import sys
import django

# Set up the Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from django.apps import apps

def clear_all_data():
    """
    Wipes all records from the system apps to return BBEAMS to a clean state.
    """
    print("--- BBEAMS Total System Reset ---")
    print("This will remove all Attendance, Leaves, Users, Biometrics, and Policies.")
    
    # Define the project-specific apps to be cleared
    target_apps = [
        'accounts',
        'attendance',
        'leave',
        'scheduling',
        'reporting',
        'support'
    ]
    
    # Logic to confirm wipe
    confirm = input("⚠️  WARNING: This is irreversible. Type 'WIPE' to confirm: ")
    if confirm.upper() != 'WIPE':
        print("Reset aborted.")
        return

    for app_label in target_apps:
        try:
            app_config = apps.get_app_config(app_label)
            models = list(app_config.get_models())
            for model in models:
                count = model.objects.count()
                if count > 0:
                    model.objects.all().delete()
                    print(f"Cleared {count} records from {app_label}.{model.__name__}")
        except LookupError:
            continue

    print("\n✅ System refresh complete. All custom records removed.")
    print("ℹ️  To regain access, run: python manage.py createsuperuser")

if __name__ == "__main__":
    clear_all_data()