from django.apps import AppConfig
import sys
import threading

class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        """
        Triggers biometric cache warming and registers institutional signals.
        """
        # 1. Register Signals for self-healing registry
        import accounts.signals

        # 2. Prevent running during non-server commands
        if 'runserver' not in sys.argv:
            return

        from .biometric_service import biometric_service

        def warm_cache():
            print("--- [SYSTEM] BIOMETRIC REGISTRY: Warming RAM Cache... ---")
            success = biometric_service.reload_cache()
            if success:
                print(f"--- [SYSTEM] BIOMETRIC REGISTRY: Ready with {len(biometric_service.user_data)} templates. ---")
            else:
                print("--- [SYSTEM] BIOMETRIC REGISTRY: Initialized empty. ---")

        # Run in background to keep startup fast
        threading.Thread(target=warm_cache, daemon=True).start()
