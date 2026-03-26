from django.contrib import admin
from .models import Report, AuditLog, Notification
from accounts.models import User # Import User to check roles

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('type', 'generated_at')
    list_filter = ('type', 'generated_at')
    date_hierarchy = 'generated_at'

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_administrator or request.user.is_hr_officer:
            return ('generated_at',)
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return request.user.is_administrator or request.user.is_hr_officer

    def has_change_permission(self, request, obj=None):
        return request.user.is_administrator or request.user.is_hr_officer

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'timestamp', 'ip_address')
    list_filter = ('user__username', 'action', 'timestamp')
    search_fields = ('user__username', 'action', 'description')
    date_hierarchy = 'timestamp'

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'message', 'status', 'sent_at')
    list_filter = ('type', 'status', 'user__username')
    search_fields = ('user__username', 'message')
    date_hierarchy = 'sent_at'

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator
