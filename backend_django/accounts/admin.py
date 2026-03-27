from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.urls import reverse
from django.utils.html import format_html
from .models import User, EmployeeDetail, Department, Role, BiometricTemplate, Workflow

class EmployeeDetailInline(admin.StackedInline):
    model = EmployeeDetail
    can_delete = False
    verbose_name_plural = 'Employee Details'
    fk_name = 'user'
    fields = ('department', 'position', 'employment_type', 'hire_date', 'get_biometric_enrolled_status')
    readonly_fields = ('get_biometric_enrolled_status',)

    def get_biometric_enrolled_status(self, instance):
        if hasattr(instance, 'user'):
            return "Yes" if BiometricTemplate.objects.filter(user=instance.user, type=BiometricTemplate.BiometricType.FACE).exists() else "No"
        return "No"
    get_biometric_enrolled_status.short_description = 'Biometric Enrolled'

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = (EmployeeDetailInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'status')
    list_filter = ('status', 'is_staff', 'is_superuser', 'roles')

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        if request.user.is_administrator:
            fieldsets += (('User Status', {'fields': ('status',)}),)
        return fieldsets

    def get_readonly_fields(self, request, obj=None):
        readonly_fields = super().get_readonly_fields(request, obj)
        if not request.user.is_administrator:
            return readonly_fields + ('status', 'is_staff', 'is_superuser', 'user_permissions', 'roles')
        return readonly_fields

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'manager')

    def has_change_permission(self, request, obj=None):
        return request.user.is_administrator

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    filter_horizontal = ('permissions',)

    def has_change_permission(self, request, obj=None):
        return request.user.is_administrator

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator

@admin.register(EmployeeDetail)
class EmployeeDetailAdmin(admin.ModelAdmin):
    list_display = ('user', 'department', 'position', 'hire_date', 'biometric_enrolled')
    readonly_fields = ('get_biometric_enrolled_status', 'face_enrollment_link')

    def get_fieldsets(self, request, obj=None):
        fieldsets = [('Employee Info', {'fields': ('user', 'department', 'position', 'employment_type', 'hire_date')})]
        if request.user.is_hr_officer or request.user.is_administrator:
            fieldsets.append(('Biometrics', {'fields': ('get_biometric_enrolled_status', 'face_enrollment_link')}))
        return fieldsets

    def get_biometric_enrolled_status(self, obj):
        enrolled = BiometricTemplate.objects.filter(user=obj.user, type=BiometricTemplate.BiometricType.FACE).exists()
        if obj.biometric_enrolled != enrolled:
            obj.biometric_enrolled = enrolled
            obj.save(update_fields=['biometric_enrolled'])
        return "Yes" if enrolled else "No"
    get_biometric_enrolled_status.short_description = 'Status'

    def face_enrollment_link(self, obj):
        if obj.user_id:
            url = reverse('accounts:capture_face', args=[obj.user_id])
            return format_html('<a class="button" href="{}">Capture / Re-capture Face</a>', url)
        return "Save employee first to enable face capture."
    face_enrollment_link.short_description = 'Actions'

@admin.register(BiometricTemplate)
class BiometricTemplateAdmin(admin.ModelAdmin):
    list_display = ('user', 'type')
    readonly_fields = ('template_data',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator

@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ('name',)

    def has_change_permission(self, request, obj=None):
        return request.user.is_administrator

    def has_delete_permission(self, request, obj=None):
        return request.user.is_administrator
