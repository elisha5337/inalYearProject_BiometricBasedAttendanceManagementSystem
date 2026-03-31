from django.apps import AppConfig


class AttendanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'attendance'
    def ready(self):
        # Import signal handlers to ensure embedding cache is refreshed
        try:
            import attendance.signals  # noqa: F401
        except Exception:
            # Avoid raising errors at import time; logging happens in signals module
            pass
