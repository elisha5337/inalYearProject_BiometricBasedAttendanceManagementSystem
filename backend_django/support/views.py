from django.shortcuts import render
from django.http import JsonResponse
from django.db.models import Q
from .models import FAQCategory, FAQItem

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
