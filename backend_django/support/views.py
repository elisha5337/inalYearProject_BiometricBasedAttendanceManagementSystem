from django.shortcuts import render
from django.http import JsonResponse
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
import json

from .models import FAQCategory, FAQItem, Complaint
from hu_attendance_system.auth_utils import require_auth, require_staff


def faq_list(request):
    query = request.GET.get('q', '').strip()
    
    if query:
        # If searching, find items matching the query
        items = FAQItem.objects.filter(
            Q(question__icontains=query) | Q(answer__icontains=query)
        ).select_related('category')
        
        # Group by category
        results_map = {}
        for item in items:
            cat_id = item.category.id
            if cat_id not in results_map:
                results_map[cat_id] = {
                    'title': item.category.name,
                    'icon': item.category.icon,
                    'items': []
                }
            results_map[cat_id]['items'].append(item.question)
        
        return JsonResponse({'categories': list(results_map.values())})
    
    # Normal view: all categories and their items
    categories = FAQCategory.objects.prefetch_related('items').all()
    data = []
    for cat in categories:
        data.append({
            'title': cat.name,
            'icon': cat.icon,
            'items': [item.question for item in cat.items.all()]
        })
    
    return JsonResponse({'categories': data})


@csrf_exempt
def complaint_list_create(request):
    if request.method == 'GET':
        user, auth_err = require_auth(request)
        if auth_err:
            return auth_err

        if request.GET.get('all'):
            staff_user, staff_err = require_staff(request)
            if staff_err:
                return staff_err
            complaints = Complaint.objects.select_related('user').all()
        elif request.GET.get('recipient'):
            staff_user, staff_err = require_staff(request)
            if staff_err:
                return staff_err

            recipient = request.GET.get('recipient', '').upper()
            if recipient not in Complaint.Recipient.values:
                return JsonResponse({'success': False, 'error': 'Recipient must be HR or ADMIN.'}, status=400)

            complaints = Complaint.objects.filter(recipient=recipient).select_related('user')
        else:
            complaints = Complaint.objects.filter(user=user).select_related('user')

        data = [
            {
                'id': str(item.id),
                'user': item.user.username,
                'recipient': item.recipient,
                'subject': item.subject,
                'message': item.message,
                'status': item.status,
                'created_at': item.created_at.isoformat(),
                'updated_at': item.updated_at.isoformat(),
            }
            for item in complaints
        ]
        return JsonResponse({'success': True, 'complaints': data})

    if request.method == 'POST':
        user, auth_err = require_auth(request)
        if auth_err:
            return auth_err

        try:
            data = json.loads(request.body)
        except Exception:
            return JsonResponse({'success': False, 'error': 'Invalid JSON payload.'}, status=400)

        recipient = (data.get('recipient') or '').upper()
        subject = (data.get('subject') or '').strip()
        message = (data.get('message') or '').strip()

        if recipient not in Complaint.Recipient.values:
            return JsonResponse({'success': False, 'error': 'Recipient must be HR or ADMIN.'}, status=400)
        if not subject or not message:
            return JsonResponse({'success': False, 'error': 'Subject and message are required.'}, status=400)

        complaint = Complaint.objects.create(
            user=user,
            recipient=recipient,
            subject=subject,
            message=message,
        )

        return JsonResponse({
            'success': True,
            'complaint_id': str(complaint.id),
            'message': 'Complaint submitted successfully.',
        })

    return JsonResponse({'success': False, 'error': 'Invalid request method.'}, status=405)
