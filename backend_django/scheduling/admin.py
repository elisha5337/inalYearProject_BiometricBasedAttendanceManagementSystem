from django.contrib import admin
from .models import Shift, Assignment
from accounts.models import User # Import User to check roles

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'start_time', 'end_time')
    search_fields = ('name', 'department__name')
    list_filter = ('department',)

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_administrator or request.user.is_hr_officer:
            return []
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return request.user.is_administrator or request.user.is_hr_officer

    def has_change_permission(self, request, obj=None):
        return request.user.is_administrator or request.user.is_hr_officer

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator or request.user.is_hr_officer

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'shift', 'from_date', 'to_date', 'assigned_by')
    search_fields = ('user__username', 'shift__name')
    list_filter = ('shift__name', 'from_date', 'to_date')
    date_hierarchy = 'from_date'

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_administrator or request.user.is_hr_officer:
            return []
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return request.user.is_administrator or request.user.is_hr_officer

    def has_change_permission(self, request, obj=None):
        return request.user.is_administrator or request.user.is_hr_officer

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator or request.user.is_hr_officer
