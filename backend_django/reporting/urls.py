from django.urls import path
from . import views

app_name = 'reporting'

urlpatterns = [
    # GET to generate an attendance report
    # Example: /api/reporting/attendance/?start_date=2023-01-01&end_date=2023-01-31
    path('attendance/', views.attendance_report, name='attendance_report'),

    # HR download/export endpoint for attendance reports
    # Example: /api/reporting/attendance-export/?start_date=2023-01-01&end_date=2023-01-31&format=csv
    path('attendance-export/', views.attendance_report_export, name='attendance_report_export'),
    path('leave-export/', views.leave_summary_export, name='leave_summary_export'),
    path('overtime-export/', views.overtime_report_export, name='overtime_report_export'),
    path('tardiness-export/', views.tardiness_report_export, name='tardiness_report_export'),

    path('my-notifications/', views.get_my_notifications, name='get_my_notifications'),
    path('notifications/<uuid:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
    path('notifications/<uuid:notification_id>/delete/', views.delete_notification, name='delete_notification'),
    path('notifications/mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('audit-logs/', views.get_audit_logs, name='get_audit_logs'),
    path('system-health/', views.get_system_health, name='get_system_health'),
    path('security-audit/', views.run_security_audit, name='run_security_audit'),
    
    path('global-config/', views.get_global_config, name='get_global_config'),
    path('global-config/update/', views.update_global_config, name='update_global_config'),
    
    path('sync-biometrics/', views.sync_biometrics, name='sync_biometrics'),
    path('sanitize-logs/', views.sanitize_logs, name='sanitize_logs'),
    path('system-operation/<str:op_name>/', views.system_operation, name='system_operation'),
]
