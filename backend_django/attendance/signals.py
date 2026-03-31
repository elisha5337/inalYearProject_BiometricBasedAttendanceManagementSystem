import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from accounts.models import BiometricTemplate

logger = logging.getLogger(__name__)


def _refresh_embeddings_cache():
    """
    Lazily import and call the loader to avoid circular imports at module import time.
    """
    try:
        mod = __import__('attendance.views', fromlist=['load_known_embeddings'])
        loader = getattr(mod, 'load_known_embeddings', None)
        if callable(loader):
            loader()
            logger.info('Embeddings cache refreshed via BiometricTemplate signal.')
        else:
            logger.warning('Attendance loader not available to refresh embeddings.')
    except Exception as e:
        logger.exception('Failed to refresh embeddings cache: %s', e)


@receiver(post_save, sender=BiometricTemplate)
def biometric_template_saved(sender, instance, created, **kwargs):
    logger.debug('BiometricTemplate saved (user=%s, created=%s) — refreshing cache.', getattr(instance.user, 'username', None), created)
    _refresh_embeddings_cache()


@receiver(post_delete, sender=BiometricTemplate)
def biometric_template_deleted(sender, instance, **kwargs):
    logger.debug('BiometricTemplate deleted (user=%s) — refreshing cache.', getattr(instance.user, 'username', None))
    _refresh_embeddings_cache()
