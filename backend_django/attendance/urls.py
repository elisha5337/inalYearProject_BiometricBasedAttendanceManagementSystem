from django.urls import path
from . import views

app_name = 'attendance'

urlpatterns = [
    path('mark/', views.mark_attendance, name='mark_attendance'),
    path('reload-embeddings/', views.reload_embeddings, name='reload_embeddings'),
    path('my-history/', views.get_my_attendance_history, name='get_my_attendance_history'),
    path('dashboard-stats/', views.api_dashboard_stats, name='api_dashboard_stats'),
    path('all/', views.api_list_all_attendance, name='api_list_all_attendance'),
    
    # HR attendance table endpoints (consumed by `frontend-updated/src/lib/hrAttendance.ts`)
    # These are intentionally nested under `api/` to match the existing frontend paths:
    # `/api/attendance/api/{records|history|all}/`
    path('api/records/', views.api_list_hr_attendance_records, name='api_list_hr_attendance_records'),
    path('api/history/', views.api_list_hr_attendance_records, name='api_list_hr_attendance_history'),
    path('api/all/', views.api_list_hr_attendance_records, name='api_list_hr_attendance_all'),

    path('devices/', views.api_device_list_create, name='api_device_list_create'),
    path('devices/<uuid:device_id>/', views.api_device_detail, name='api_device_detail'),
    path('<uuid:record_id>/verify/', views.api_update_attendance_verification, name='api_update_attendance_verification'),
    path('<uuid:record_id>/delete/', views.api_delete_attendance_record, name='api_delete_attendance_record'),
]
