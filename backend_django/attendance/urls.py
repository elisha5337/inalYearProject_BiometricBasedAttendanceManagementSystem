from django.urls import path
from . import views

app_name = 'attendance'

urlpatterns = [
    # Main biometric logic
    path('mark/', views.mark_attendance, name='mark_attendance'),

    # History and Dashboard
    path('my-history/', views.get_my_attendance_history, name='my_attendance_history'),
    path('dashboard-stats/', views.api_dashboard_stats, name='dashboard_stats'),

    # HR & Admin Management
    path('all/', views.api_list_all_attendance, name='list_all_attendance'),
    path('hr-records/', views.api_list_hr_attendance_records, name='hr_attendance_records'),
    path('verify-manual/<uuid:record_id>/', views.api_update_attendance_verification, name='verify_manual_entry'),
    path('delete/<uuid:record_id>/', views.api_delete_attendance_record, name='delete_attendance_record'),

    # Device Management
    path('devices/', views.api_device_list_create, name='device_list_create'),
    path('devices/<uuid:device_id>/', views.api_device_detail, name='device_detail'),

    # Utilities
    path('reload-embeddings/', views.reload_embeddings, name='reload_embeddings'),
    
    # Public endpoints
    path('public-landing-data/', views.api_public_landing_data, name='public_landing_data'),
]
