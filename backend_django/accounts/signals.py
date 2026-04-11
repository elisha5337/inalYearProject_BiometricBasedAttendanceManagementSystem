import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import User, BiometricTemplate
from .biometric_service import biometric_service

logger = logging.getLogger(__name__)

@receiver(post_save, sender=BiometricTemplate)
@receiver(post_delete, sender=BiometricTemplate)
def refresh_biometric_cache_on_template_change(sender, instance, **kwargs):
    """
    Ensures the RAM cache for facial recognition is updated 
    whenever a biometric template is created, updated, or deleted.
    """
    logger.info(f"Biometric change detected for {instance.user.username}. Refreshing registry...")
    biometric_service.reload_cache()

@receiver(post_save, sender=User)
def refresh_biometric_cache_on_user_status_change(sender, instance, update_fields, **kwargs):
    """
    If a user is suspended or their status changes, we immediately 
    update the biometric registry to prevent unauthorized access.
    """
    if update_fields and 'status' in update_fields:
        logger.info(f"User status change detected for {instance.username}. Refreshing registry...")
        biometric_service.reload_cache()
