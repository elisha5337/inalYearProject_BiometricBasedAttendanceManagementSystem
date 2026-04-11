from django.urls import path
from . import views

app_name = 'scheduling'

urlpatterns = [
    # --- Shift Management URLs ---
    path('shifts/', views.shift_list_create, name='shift_list_create'),
    path('shifts/<uuid:shift_id>/', views.shift_detail, name='shift_detail'),

    # --- Assignment Management URLs ---
    path('assignments/', views.assignment_list_create, name='assignment_list_create'),
    path('assignments/<uuid:assignment_id>/', views.assignment_detail, name='assignment_detail'),
    path('my-assignments/', views.my_assignments, name='my_assignments'),

    # --- Holiday Management URLs (New) ---
    path('holidays/', views.holiday_list_create, name='holiday_list_create'),
    path('holidays/<uuid:holiday_id>/', views.delete_holiday, name='delete_holiday'),
]
