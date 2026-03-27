import logging

from .models import AuditLog

logger = logging.getLogger(__name__)


def get_client_ip(request):
    if not request:
        return None

    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()

    return request.META.get('REMOTE_ADDR')


def log_audit_event(action, description='', user=None, request=None):
    try:
        AuditLog.objects.create(
            user=user if getattr(user, 'is_authenticated', False) else None,
            action=action,
            description=description or '',
            ip_address=get_client_ip(request),
        )
    except Exception as exc:
        logger.warning('Unable to write audit log %s: %s', action, exc)
