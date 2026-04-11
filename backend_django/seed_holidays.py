import os
import django
from datetime import date

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from scheduling.models import Holiday

def seed_ethiopian_holidays():
    print("--- SEEDING ETHIOPIAN PUBLIC HOLIDAYS (2026) ---")
    
    # List of holidays. 
    # Note: Variable dates are based on 2026 projections for Orthodox and Islamic calendars.
    holidays_2026 = [
        # --- Fixed Date Holidays (Gregorian equivalents) ---
        {"name": "Ethiopian Christmas (Ganna)", "date": date(2026, 1, 7), "is_recurring": True, "description": "Religious holiday"},
        {"name": "Ethiopian Epiphany (Timkat)", "date": date(2026, 1, 19), "is_recurring": True, "description": "Religious holiday"},
        {"name": "Adwa Victory Day", "date": date(2026, 3, 2), "is_recurring": True, "description": "National victory day celebrating the 1896 battle"},
        {"name": "International Labor Day", "date": date(2026, 5, 1), "is_recurring": True, "description": "Worker recognition day"},
        {"name": "Patriots' Victory Day", "date": date(2026, 5, 5), "is_recurring": True, "description": "Commemorating victory over Italian occupation"},
        {"name": "Derg Downfall Day (Ginbot 20)", "date": date(2026, 5, 28), "is_recurring": True, "description": "National day marking the 1991 regime change"},
        {"name": "Ethiopian New Year (Enkutatash)", "date": date(2026, 9, 11), "is_recurring": True, "description": "First day of the Ethiopian calendar"},
        {"name": "Finding of the True Cross (Meskel)", "date": date(2026, 9, 27), "is_recurring": True, "description": "Religious holiday celebrated by the discovery of the Cross"},

        # --- Variable Date Holidays (2026 projections) ---
        {"name": "Eid al-Fitr (End of Ramadan)", "date": date(2026, 3, 20), "is_recurring": False, "description": "Islamic religious holiday (Date varies by moon)"},
        {"name": "Ethiopian Good Friday (Siklet)", "date": date(2026, 4, 10), "is_recurring": False, "description": "Orthodox Christian religious holiday"},
        {"name": "Ethiopian Easter (Fasika)", "date": date(2026, 4, 12), "is_recurring": False, "description": "Orthodox Christian religious holiday"},
        {"name": "Eid al-Adha (Feast of Sacrifice)", "date": date(2026, 5, 27), "is_recurring": False, "description": "Islamic religious holiday (Date varies by moon)"},
        {"name": "Mawlid (Prophet's Birthday)", "date": date(2026, 8, 26), "is_recurring": False, "description": "Islamic religious holiday (Date varies by moon)"},
    ]

    for h_data in holidays_2026:
        holiday, created = Holiday.objects.update_or_create(
            date=h_data["date"],
            defaults={
                "name": h_data["name"],
                "is_recurring": h_data["is_recurring"],
                "description": h_data["description"]
            }
        )
        if created:
            print(f"✅ Added: {holiday.name} on {holiday.date}")
        else:
            print(f"ℹ️ Updated: {holiday.name} ({holiday.date})")

    print("\n✅ SEEDING COMPLETE. 13 Institutional Holidays Configured.")

if __name__ == "__main__":
    seed_ethiopian_holidays()
