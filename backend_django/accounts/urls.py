from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'accounts'

urlpatterns = [
    # JWT token refresh — required for per-tab session independence
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Public self-registration
    path('api/register/', views.api_register, name='api_register'),
    # API Auth
    path('api/csrf/',views.get_csrf, name='get_csrf'),
    path('api/me/', views.api_me, name='api_me'),
    path('api/profile/', views.api_profile, name='api_profile'),
    path('api/profile/update/', views.api_update_profile, name='api_update_profile'),
    path('api/login/', views.api_login, name='api_login'),
    path('api/logout/', views.api_logout, name='api_logout'),
    path('api/change-password/', views.api_change_password, name='api_change_password'),
    path('api/users/', views.api_list_users, name='api_user_list'),
    path('api/users/create/', views.api_create_user, name='api_user_create'),
    path('api/users/<uuid:user_id>/update/', views.api_update_user, name='api_user_update'),
    path('api/users/<uuid:user_id>/delete/', views.api_delete_user, name='api_delete_user'),
    path('api/departments/', views.api_list_departments, name='api_department_list'),
    path('api/positions/', views.api_list_positions, name='api_position_list'),
    
    # Password Reset
    path('api/password-reset/request/', views.api_forgot_password_request, name='api_forgot_password_request'),
    path('api/password-reset/confirm/<str:uidb64>/<str:token>/', views.api_reset_password_confirm, name='api_reset_password_confirm'),


    path('api/integrations/hub-register/', views.api_create_integration, name='api_integration_create'),
    path('api/integrations/', views.api_list_integrations, name='api_integration_list'),
    path('api/integrations/<uuid:integration_id>/toggle/', views.api_toggle_integration, name='api_integration_toggle'),
    path('api/integrations/<uuid:integration_id>/sync/', views.api_sync_integration, name='api_integration_sync'),
    path('api/integrations/<uuid:integration_id>/update-config/', views.api_update_integration_config, name='api_integration_update_config'),
    path('api/integrations/<uuid:integration_id>/delete/', views.api_delete_integration, name='api_integration_delete'),


    # Biometrics
    path('user/<uuid:user_id>/capture/', views.capture_face, name='capture_face'),
    path('user/<uuid:user_id>/verify/', views.verify_face, name='verify_face'),
    path('face/check/', views.check_face, name='face_check'),
]
