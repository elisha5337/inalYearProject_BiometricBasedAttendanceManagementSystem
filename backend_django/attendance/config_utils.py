import os
import json
from django.conf import settings

CONFIG_FILE_PATH = os.path.join(settings.BASE_DIR, 'global_config.json')

DEFAULT_CONFIG = {
    'session_timeout_minutes': 60,
    'strict_mode': False,
    'max_login_attempts': 3,
    'biometric_lock_active': True,
    'real_time_validation': True
}

def read_global_config():
    """Reads the global system configuration from the JSON file."""
    if not os.path.exists(CONFIG_FILE_PATH):
        try:
            with open(CONFIG_FILE_PATH, 'w') as f:
                json.dump(DEFAULT_CONFIG, f, indent=4)
            return DEFAULT_CONFIG
        except Exception:
            return DEFAULT_CONFIG
            
    try:
        with open(CONFIG_FILE_PATH, 'r') as f:
            return json.load(f)
    except Exception:
        return DEFAULT_CONFIG

def update_global_config(updates):
    """Updates the global system configuration."""
    if not isinstance(updates, dict):
        return False
    current = read_global_config()
    current.update(updates)
    try:
        with open(CONFIG_FILE_PATH, 'w') as f:
            json.dump(current, f, indent=4)
        return True
    except Exception:
        return False
