#!/usr/bin/env python
import os
import sys
import django
from decouple import config

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'overhead.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp

def setup_oauth_providers():
    # Get or create the site
    site = Site.objects.get_current()
    
    # GitHub OAuth
    github_app, created = SocialApp.objects.get_or_create(
        provider='github',
        defaults={
            'name': 'GitHub',
            'client_id': config('GITHUB_CLIENT_ID'),
            'secret': config('GITHUB_CLIENT_SECRET'),
        }
    )
    if not created:
        github_app.client_id = config('GITHUB_CLIENT_ID')
        github_app.secret = config('GITHUB_CLIENT_SECRET')
        github_app.save()
    
    if site not in github_app.sites.all():
        github_app.sites.add(site)
    print(f"GitHub OAuth {'created' if created else 'updated'}")
    
    # Google OAuth
    google_app, created = SocialApp.objects.get_or_create(
        provider='google',
        defaults={
            'name': 'Google',
            'client_id': config('GOOGLE_CLIENT_ID'),
            'secret': config('GOOGLE_CLIENT_SECRET'),
        }
    )
    if not created:
        google_app.client_id = config('GOOGLE_CLIENT_ID')
        google_app.secret = config('GOOGLE_CLIENT_SECRET')
        google_app.save()
    
    if site not in google_app.sites.all():
        google_app.sites.add(site)
    print(f"Google OAuth {'created' if created else 'updated'}")
    
    print("\nOAuth providers configured successfully!")
    print(f"Redirect URIs to configure in provider dashboards:")
    print(f"GitHub: http://127.0.0.1:8080/accounts/github/login/callback/")
    print(f"Google: http://127.0.0.1:8080/accounts/google/login/callback/")

if __name__ == '__main__':
    setup_oauth_providers()