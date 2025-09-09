from django.shortcuts import render

def landing_page(request):
    """Landing page with navigation to both apps"""
    context = {
        'user': request.user,
        'is_authenticated': request.user.is_authenticated
    }
    return render(request, 'landing.html', context)