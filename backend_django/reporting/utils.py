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
        if not getattr(user, 'is_authenticated', False) and request is not None:
            request_user = getattr(request, 'user', None)
            if getattr(request_user, 'is_authenticated', False):
                user = request_user

        actor_username = None
        if getattr(user, 'is_authenticated', False):
            actor_username = getattr(user, 'username', None)
            if actor_username and actor_username not in (description or ''):
                description = (
                    f'{description.strip()} (performed by {actor_username}).'
                    if description and description.strip() else
                    f'Performed by {actor_username}.'
                )

        AuditLog.objects.create(
            user=user if getattr(user, 'is_authenticated', False) else None,
            action=action,
            description=description or '',
            ip_address=get_client_ip(request),
        )
    except Exception as exc:
        logger.warning('Unable to write audit log %s: %s', action, exc)
