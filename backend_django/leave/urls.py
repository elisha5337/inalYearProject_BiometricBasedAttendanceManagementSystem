from django.urls import path
from . import views

app_name = 'leave'

urlpatterns = [
    path('api/request/', views.submit_leave_request, name='submit_leave_request'),
    path('api/my/', views.view_my_leave_requests, name='view_my_leave_requests'),
    path('api/all/', views.list_all_leave_requests, name='list_all_leave_requests'),
    path('api/manage/<uuid:request_id>/', views.manage_leave_request, name='manage_leave_request'),
    # --- Policy Configuration URLs ---
    path('api/policies/', views.policy_list_create, name='policy_list_create'),
    path('api/policies/<uuid:policy_id>/', views.policy_detail, name='policy_detail'),
]
