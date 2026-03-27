from django.urls import path
from . import views

app_name = 'attendance'

urlpatterns = [
    path('mark/', views.mark_attendance, name='mark_attendance'),
    path('reload-embeddings/', views.reload_embeddings, name='reload_embeddings'),
    path('my-history/', views.get_my_attendance_history, name='get_my_attendance_history'),
    path('dashboard-stats/', views.api_dashboard_stats, name='api_dashboard_stats'),
    path('all/', views.api_list_all_attendance, name='api_list_all_attendance'),
    path('devices/', views.api_device_list_create, name='api_device_list_create'),
    path('devices/<uuid:device_id>/', views.api_device_detail, name='api_device_detail'),
    path('<uuid:record_id>/verify/', views.api_update_attendance_verification, name='api_update_attendance_verification'),
    path('<uuid:record_id>/delete/', views.api_delete_attendance_record, name='api_delete_attendance_record'),
]
