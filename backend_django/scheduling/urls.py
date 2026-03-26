from django.urls import path
from . import views

app_name = 'scheduling'

urlpatterns = [
    # --- Shift Management URLs ---
    # GET to list all shifts, POST to create a new shift
    path('shifts/', views.shift_list_create, name='shift_list_create'),
    # GET, PUT, DELETE for a specific shift
    path('shifts/<uuid:shift_id>/', views.shift_detail, name='shift_detail'),

    # --- Assignment Management URLs ---
    # GET to list all assignments, POST to create a new assignment
    path('assignments/', views.assignment_list_create, name='assignment_list_create'),
    # DELETE a specific assignment
    path('assignments/<uuid:assignment_id>/', views.assignment_detail, name='assignment_detail'),
    # GET user's personal assignments
    path('my-assignments/', views.my_assignments, name='my_assignments'),
]
