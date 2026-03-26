import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hu_attendance_system.settings')
django.setup()

from leave.models import Policy

def seed_policies():
    policies = [
        # --- ATTENDANCE ---
        {
            "name": "Standard Work Hours",
            "category": "ATTENDANCE",
            "urgency": "HIGH",
            "description": "Default attendance rules for all full-time employees.",
            "value": "8.5 Hours",
            "is_active": True,
            "rules": [
                "Mandatory check-in by 9:00 AM",
                "Minimum 1-hour lunch break required between 12:00 PM and 2:00 PM",
                "Total 42.5 hours per week including breaks"
            ]
        },
        {
            "name": "Grace Period",
            "category": "ATTENDANCE",
            "urgency": "CRITICAL",
            "description": "Morning flexibility rules used for traffic or minor delays.",
            "value": "15 Mins",
            "is_active": True,
            "rules": [
                "Up to 15 minutes of delay without late penalty",
                "Only applicable for morning shift start",
                "Max 3 grace period uses per month"
            ]
        },
        {
            "name": "Early Exit Authorization",
            "category": "ATTENDANCE",
            "urgency": "MEDIUM",
            "description": "Protocol for leaving before the scheduled shift end.",
            "value": "Manager Approval",
            "is_active": True,
            "rules": [
                "Manager approval required for exits > 30 minutes before shift end",
                "Unapproved early exits flagged as 'Partial Attendance' in monthly report",
                "Reason for early exit must be documented via the employee mobile portal"
            ]
        },

        # --- BIOMETRIC ENROLLMENT ---
        {
            "name": "Face Enrollment Protocol",
            "category": "BIOMETRIC",
            "urgency": "HIGH",
            "description": "Rules for initial and periodic facial biometric registration.",
            "value": "3-Year Cycle",
            "is_active": True,
            "rules": [
                "Initial enrollment requires 5 distinct facial angles",
                "Biometric templates must be updated every 3 years for accuracy",
                "Face scan must maintain >90% confidence score for valid entry"
            ]
        },
        {
            "name": "Biometric Exception Protocol",
            "category": "BIOMETRIC",
            "urgency": "MEDIUM",
            "description": "Fallback procedures for employees with biometric recognition difficulties.",
            "value": "QR+PIN Backup",
            "is_active": True,
            "rules": [
                "Requires manual HR verification of identification",
                "Unique 6-digit PIN assigned with 24-hour rotation",
                "Mobile QR scan must be performed at the physical terminal location"
            ]
        },

        # --- NOTIFICATION ---
        {
            "name": "Low Attendance Alert",
            "category": "NOTIFICATION",
            "urgency": "MEDIUM",
            "description": "Automated system alerts for falling below attendance thresholds.",
            "value": "80% Threshold",
            "is_active": True,
            "rules": [
                "Automated email sent to employee if monthly attendance drops below 80%",
                "Notification CC'd to Department Head for review",
                "Alert triggered on the 25th of each calendar month"
            ]
        },
        {
            "name": "Shift Reminder Alerts",
            "category": "NOTIFICATION",
            "urgency": "LOW",
            "description": "Automated push notifications for upcoming shift starts.",
            "value": "30 Mins Lead",
            "is_active": True,
            "rules": [
                "Push notification sent 30 minutes before scheduled start time",
                "Second alert triggered if not clocked in by T-minus 5 minutes",
                "Notifications disabled for employees on approved leave"
            ]
        },

        # --- LEAVE ---
        {
            "name": "Standard Annual Leave",
            "category": "LEAVE",
            "urgency": "MEDIUM",
            "description": "Default yearly vacation allowance for full-time staff.",
            "value": "20 Days",
            "is_active": True,
            "rules": [
                "Total 20 days per calendar year",
                "Requests must be submitted 5 working days in advance",
                "Maximum 10 days can be carried forward to the next year"
            ]
        },
        {
            "name": "Medical Leave Policy",
            "category": "LEAVE",
            "urgency": "MEDIUM",
            "description": "Guidelines for reporting and utilizing sick leave allocations.",
            "value": "12 Days/Year",
            "is_active": True,
            "rules": [
                "Official medical certificate required for absences exceeding 2 consecutive days",
                "Notification of absence must be sent to lead by 8:30 AM",
                "Accrues at a rate of 1 day per full month of service"
            ]
        },
        {
            "name": "Bereavement Support",
            "category": "LEAVE",
            "urgency": "MEDIUM",
            "description": "Compassionate leave for immediate family loss.",
            "value": "5 Days",
            "is_active": True,
            "rules": [
                "Applicable for the loss of immediate family members",
                "Supporting documentation must be uploaded to the portal within 7 days",
                "Full base pay is maintained throughout the bereavement period"
            ]
        },
        {
            "name": "Civic & Jury Duty",
            "category": "LEAVE",
            "urgency": "LOW",
            "description": "Protected leave for serving official court or civic summons.",
            "value": "Full Pay",
            "is_active": True,
            "rules": [
                "Full base pay maintained for the duration of court-ordered service",
                "Employee must provide a copy of the official summons to HR",
                "Expected to return to work if released from duty for more than 3 hours of a shift"
            ]
        },

        # --- HR ADMIN ---
        {
            "name": "Probationary Attendance",
            "category": "HR_ADMIN",
            "urgency": "HIGH",
            "description": "Stricter attendance requirements for employees in their review period.",
            "value": "3 Months",
            "is_active": True,
            "rules": [
                "95% monthly attendance mandatory during the first 90 days",
                "Maximum 2 late arrivals allowed per calendar month",
                "Automated status report sent to HR and Direct Manager weekly"
            ]
        },
        {
            "name": "Remote Work (Hybrid)",
            "category": "HR_ADMIN",
            "urgency": "LOW",
            "description": "Configuration for off-site working and virtual check-ins.",
            "value": "2 Days/Week",
            "is_active": True,
            "rules": [
                "Must be available and responsive on communication channels during core hours",
                "Core hours defined as 10:00 AM - 3:30 PM",
                "Biometric validation required via terminal or mobile dashboard"
            ]
        },
        {
            "name": "Missing Punch Correction",
            "category": "HR_ADMIN",
            "urgency": "MEDIUM",
            "description": "Protocol for correcting attendance records due to technical failure or error.",
            "value": "24 Hours",
            "is_active": True,
            "rules": [
                "Requests for manual attendance edits must be submitted within 24 working hours",
                "Digital signature from direct supervisor is mandatory for all corrections",
                "Limited to 2 manual corrections per employee per month"
            ]
        },
        {
            "name": "Professional Study Leave",
            "category": "HR_ADMIN",
            "urgency": "LOW",
            "description": "Time off for advancement of professional certifications and exams.",
            "value": "2 Days/Exam",
            "is_active": True,
            "rules": [
                "Applicable for pre-approved professional development courses",
                "Requests must be submitted at least 30 days in advance",
                "Maximum limit of 10 study leave days per calendar year"
            ]
        },
        {
            "name": "Service Anniversary Leave",
            "category": "HR_ADMIN",
            "urgency": "OPTIONAL",
            "description": "Milestone reward for long-term employee commitment.",
            "value": "1 Day Bonus",
            "is_active": True,
            "rules": [
                "Awarded on every 5th year of continuous service anniversary",
                "Must be utilized within 60 days of the anniversary date",
                "Cannot be encashed or carried forward to the following year"
            ]
        },

        # --- PAY & BENEFITS ---
        {
            "name": "Overtime Protocol",
            "category": "PAY_BENEFITS",
            "urgency": "HIGH",
            "description": "Rules for calculating and authorizing additional worked hours.",
            "value": "1.5x Rate",
            "is_active": True,
            "rules": [
                "Paid at 1.5x standard hourly rate",
                "Supervisor approval required for work over 10 hours in a single day",
                "Weekend work must be pre-authorized via HR portal"
            ]
        },
        {
            "name": "Holiday Premium Pay",
            "category": "PAY_BENEFITS",
            "urgency": "HIGH",
            "description": "Compensation rules for working on gazetted public holidays.",
            "value": "2.0x Rate",
            "is_active": True,
            "rules": [
                "Paid at double (200%) the standard hourly rate",
                "Holiday shift must be pre-authorized by Department Head 48h in advance",
                "Minimum 4-hour guaranteed payout for any holiday-session work"
            ]
        },
        {
            "name": "Night Shift Differential",
            "category": "PAY_BENEFITS",
            "urgency": "MEDIUM",
            "description": "Additional compensation for hours worked during overnight shifts.",
            "value": "15% Bonus",
            "is_active": True,
            "rules": [
                "15% hourly premium for all hours worked between 10:00 PM and 6:00 AM",
                "Automatically calculated for rotating and permanent night shifts",
                "Premium applied only to actual hours worked, excluding breaks"
            ]
        },
        {
            "name": "Inter-Site Travel Time",
            "category": "PAY_BENEFITS",
            "urgency": "LOW",
            "description": "Rules for travel time between different office or project locations.",
            "value": "100% Rate",
            "is_active": True,
            "rules": [
                "Travel between company locations during work hours is considered fully paid time",
                "Commute from home to primary work site is strictly excluded",
                "Use of company vehicle requires logbook entry synchronized with GPS"
            ]
        },

        # --- SAFETY ---
        {
            "name": "Inclement Weather Policy",
            "category": "SAFETY",
            "urgency": "EXTREME",
            "description": "Emergency procedures during severe weather alerts or disasters.",
            "value": "Alert Level 3",
            "is_active": True,
            "rules": [
                "Remote work automatically authorized during Level 3 weather warnings",
                "Zero late-arrival penalties applied during heavy snow or storm conditions",
                "On-site essential personnel receive a 25% hazard premium for worked hours"
            ]
        },
        {
            "name": "Emergency Absence",
            "category": "SAFETY",
            "urgency": "EXTREME",
            "description": "Rules for unplanned, critical life events requiring immediate leave.",
            "value": "3 Days/Year",
            "is_active": True,
            "rules": [
                "Must be reported within 4 hours of scheduled shift start",
                "Validating documentation required upon return to duty",
                "Quota is separate from annual leave and does not roll over"
            ]
        },

        # --- HEALTH & WELFARE ---
        {
            "name": "Mandatory Lunch Interval",
            "category": "HEALTH_WELFARE",
            "urgency": "MEDIUM",
            "description": "Rules governing mid-day rest periods and terminal lockouts.",
            "value": "1 Hour",
            "is_active": True,
            "rules": [
                "Minimum 60-minute break for shifts exceeding 5 hours",
                "Terminal check-in disabled during peak lunch hour (12:30-13:30)",
                "Automatic deduction if no check-out/check-in recorded for lunch"
            ]
        },
        {
            "name": "Minimum Rest Interval",
            "category": "HEALTH_WELFARE",
            "urgency": "HIGH",
            "description": "Ensuring adequate rest periods between consecutive work sessions.",
            "value": "11 Hours",
            "is_active": True,
            "rules": [
                "Mandatory 11-hour gap required between the end of one shift and the start of the next",
                "System flags scheduling violations at the time of assignment",
                "Exception requires written Director-level authorization"
            ]
        },

        # --- ETHICS & DISCIPLINARY ---
        {
            "name": "Consecutive Absence Alert",
            "category": "ETHICS",
            "urgency": "EXTREME",
            "description": "Automated monitoring for extended unexcused absences.",
            "value": "3 Days Limit",
            "is_active": True,
            "rules": [
                "Automated HR notification triggered after 3 consecutive days of No-Call No-Show",
                "Employee account automatically suspended pending investigation",
                "Requires manual activation by HR manager to restore access"
            ]
        },
        {
            "name": "Terminal Integrity Policy",
            "category": "ETHICS",
            "urgency": "EXTREME",
            "description": "Rules governing proper use and protection of biometric hardware.",
            "value": "Zero Tolerance",
            "is_active": True,
            "rules": [
                "Attempting to obstruct or damage biometric sensors results in immediate disciplinary action",
                "Using spoofing materials (photos, latex) is categorized as gross misconduct",
                "All failed biometric attempts with >3 errors are logged for security review"
            ]
        }
    ]

    for p_data in policies:
        policy, created = Policy.objects.update_or_create(
            name=p_data['name'],
            defaults={
                'category': p_data.get('category', 'ATTENDANCE'),
                'urgency': p_data.get('urgency', 'MEDIUM'),
                'description': p_data['description'],
                'value': p_data['value'],
                'is_active': p_data['is_active'],
                'rules': p_data['rules']
            }
        )
        if created:
            print(f"Created policy: {policy.name}")
        else:
            print(f"Updated policy: {policy.name}")

if __name__ == "__main__":
    seed_policies()
