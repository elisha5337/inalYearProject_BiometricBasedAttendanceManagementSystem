from django.urls import path
from . import views

urlpatterns = [
    path('api/faqs/', views.faq_list, name='faq_list'),
    path('api/complaints/', views.complaint_list_create, name='complaint_list_create'),
]
