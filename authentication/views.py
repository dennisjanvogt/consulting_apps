from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate, update_session_auth_hash
from django.contrib.auth.forms import UserCreationForm, PasswordChangeForm
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .models import Profile
import json
from django.http import JsonResponse
from PIL import Image
import io
import base64
from django.core.files.base import ContentFile

def login_view(request):
    """Central login view for all apps"""
    if request.user.is_authenticated:
        # Redirect to the app they came from or landing page
        next_url = request.GET.get('next', '/')
        return redirect(next_url)
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            next_url = request.GET.get('next', '/')
            return redirect(next_url)
        else:
            messages.error(request, 'Invalid username or password')
    
    return render(request, 'authentication/login.html')

def logout_view(request):
    """Central logout view"""
    logout(request)
    messages.success(request, 'You have been logged out successfully')
    return redirect('/')

def register_view(request):
    """Registration view for new users"""
    if request.user.is_authenticated:
        return redirect('/')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')
        
        # Validation
        if password1 != password2:
            messages.error(request, 'Passwords do not match')
        elif User.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists')
        elif User.objects.filter(email=email).exists():
            messages.error(request, 'Email already registered')
        else:
            # Create user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password1
            )
            login(request, user)
            messages.success(request, 'Registration successful!')
            return redirect('/')
    
    return render(request, 'authentication/register.html')


@login_required
def profile_view(request):
    """View and edit user profile"""
    profile, created = Profile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        # Update user information
        user = request.user
        user.first_name = request.POST.get('first_name', '')
        user.last_name = request.POST.get('last_name', '')
        user.email = request.POST.get('email', '')

        # Check if username is being changed and if it's available
        new_username = request.POST.get('username', '')
        if new_username and new_username != user.username:
            if User.objects.filter(username=new_username).exists():
                messages.error(request, 'Username already exists')
                return redirect('auth:profile')
            user.username = new_username

        user.save()

        # Update profile information
        profile.bio = request.POST.get('bio', '')
        profile.phone = request.POST.get('phone', '')
        profile.location = request.POST.get('location', '')

        # Handle profile picture
        if 'profile_picture_data' in request.POST:
            picture_data = request.POST.get('profile_picture_data')
            if picture_data and picture_data.startswith('data:image'):
                # Extract the base64 data
                format, imgstr = picture_data.split(';base64,')
                ext = format.split('/')[-1]

                # Decode and save
                data = ContentFile(base64.b64decode(imgstr), name=f'{user.username}_profile.{ext}')
                profile.profile_picture = data

        profile.save()
        messages.success(request, 'Profile updated successfully!')
        return redirect('auth:profile')

    context = {
        'user': request.user,
        'profile': profile,
    }
    return render(request, 'authentication/profile.html', context)


@login_required
def password_change_view(request):
    """Change password view"""
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)  # Important!
            messages.success(request, 'Your password was successfully updated!')
            return redirect('auth:profile')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, error)
    else:
        form = PasswordChangeForm(request.user)

    return render(request, 'authentication/password_change.html', {'form': form})