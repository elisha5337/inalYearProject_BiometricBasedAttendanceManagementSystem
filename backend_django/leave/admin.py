from django.contrib import admin
from .models import Policy, LeaveRequest
from accounts.models import User # Import User to check roles

@admin.register(Policy)
class PolicyAdmin(admin.ModelAdmin):
    list_display = ('name', 'department')
    search_fields = ('name',)
    list_filter = ('department',)

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_administrator:
            return []
        # HR Officers and others have read-only access
        return [f.name for f in self.model._meta.fields] + ['rules']

    def has_add_permission(self, request):
        return request.user.is_administrator

    def has_change_permission(self, request, obj=None):
        return request.user.is_administrator

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator

@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'leave_type', 'start_date', 'end_date', 'status', 'approved_by')
    list_filter = ('status', 'leave_type', 'user__username', 'approved_by__username')
    search_fields = ('user__username', 'leave_type')
    date_hierarchy = 'start_date'

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_administrator or request.user.is_hr_officer:
            # Admins/HR can change status and approved_by, but not the request details
            return ('user', 'applied_policy', 'leave_type', 'start_date', 'end_date')
        return [f.name for f in self.model._meta.fields] # Employees and others are read-only

    def has_add_permission(self, request):
        return False # Leave requests are submitted by employees, not added via admin

    def has_change_permission(self, request, obj=None):
        return request.user.is_administrator or request.user.is_hr_officer

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator
