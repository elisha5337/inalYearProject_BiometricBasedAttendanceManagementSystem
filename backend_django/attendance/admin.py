from django.contrib import admin
from .models import Device, AttendanceRecord
from accounts.models import User # Import User to check roles

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('name', 'device_serial', 'ip_address', 'port', 'location', 'status')
    search_fields = ('name', 'device_serial', 'ip_address')
    list_filter = ('status',)

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_administrator:
            return []
        # HR Officers and others have read-only access
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return request.user.is_administrator

    def has_change_permission(self, request, obj=None):
        return request.user.is_administrator

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('user', 'timestamp', 'type', 'status', 'device')
    list_filter = ('type', 'status', 'device__name', 'user__username')
    search_fields = ('user__username', 'device__name')
    date_hierarchy = 'timestamp'

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_administrator:
            return []
        # HR Officers can edit, but not add or delete
        if request.user.is_hr_officer:
            return ('user', 'device', 'timestamp', 'type') # HR can only edit status
        return [f.name for f in self.model._meta.fields] # Employees and others are read-only

    def has_add_permission(self, request):
        return request.user.is_administrator

    def has_change_permission(self, request, obj=None):
        return request.user.is_administrator or request.user.is_hr_officer

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator
