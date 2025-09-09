from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import requests
import os
from .models import ChatSession, Message, SystemPrompt, UserProfile, ModelPreference

@login_required
def chat_view(request):
    """Main chat interface view"""
    # Get or create user profile
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    context = {
        'user': request.user,
        'api_key': profile.api_key_encrypted if profile.api_key_encrypted else ''
    }
    return render(request, 'openrouter_chat/chat.html', context)

# Authentication is now handled by the central authentication app

@login_required
@require_http_methods(["GET"])
def get_sessions(request):
    """Get all chat sessions for the current user"""
    sessions = ChatSession.objects.filter(user=request.user)
    sessions_data = []
    for session in sessions:
        sessions_data.append({
            'id': session.id,
            'title': session.title,
            'created_at': session.created_at.isoformat(),
            'updated_at': session.updated_at.isoformat()
        })
    return JsonResponse({'sessions': sessions_data})

@login_required
@require_http_methods(["POST"])
def create_session(request):
    """Create a new chat session"""
    data = json.loads(request.body)
    session = ChatSession.objects.create(
        user=request.user,
        title=data.get('title', 'New Chat'),
        model=data.get('model', 'gpt-3.5-turbo')
    )
    return JsonResponse({
        'id': session.id,
        'title': session.title,
        'created_at': session.created_at.isoformat()
    })

@login_required
@require_http_methods(["GET"])
def get_messages(request, session_id):
    """Get all messages for a session"""
    try:
        session = ChatSession.objects.get(id=session_id, user=request.user)
        messages = session.messages.all()
        messages_data = []
        for msg in messages:
            messages_data.append({
                'id': msg.id,
                'role': msg.role,
                'content': msg.content,
                'created_at': msg.created_at.isoformat()
            })
        return JsonResponse({'messages': messages_data})
    except ChatSession.DoesNotExist:
        return JsonResponse({'error': 'Session not found'}, status=404)

@login_required
@require_http_methods(["POST"])
def send_message(request):
    """Send a message and get AI response"""
    data = json.loads(request.body)
    session_id = data.get('session_id')
    message_content = data.get('message')
    model = data.get('model', 'gpt-3.5-turbo')
    
    try:
        # Get session
        session = ChatSession.objects.get(id=session_id, user=request.user)
        
        # Save user message
        user_message = Message.objects.create(
            session=session,
            role='user',
            content=message_content
        )
        
        # Get user's API key
        profile = UserProfile.objects.get(user=request.user)
        if not profile.api_key_encrypted:
            return JsonResponse({'error': 'Please set your OpenRouter API key in settings'}, status=400)
        
        # Prepare messages for API
        messages = []
        for msg in session.messages.all():
            messages.append({
                'role': msg.role,
                'content': msg.content
            })
        
        # Call OpenRouter API
        headers = {
            'Authorization': f'Bearer {profile.api_key_encrypted}',
            'Content-Type': 'application/json'
        }
        
        api_data = {
            'model': model,
            'messages': messages
        }
        
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json=api_data
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_content = result['choices'][0]['message']['content']
            
            # Save AI message
            ai_message = Message.objects.create(
                session=session,
                role='assistant',
                content=ai_content,
                model=model
            )
            
            return JsonResponse({
                'message': ai_content,
                'id': ai_message.id
            })
        else:
            return JsonResponse({'error': 'API request failed'}, status=500)
            
    except ChatSession.DoesNotExist:
        return JsonResponse({'error': 'Session not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@require_http_methods(["POST"])
def save_api_key(request):
    """Save user's API key"""
    data = json.loads(request.body)
    api_key = data.get('api_key')
    
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    profile.api_key_encrypted = api_key  # In production, encrypt this!
    profile.save()
    
    return JsonResponse({'success': True})

@login_required
@require_http_methods(["GET"])
def get_models(request):
    """Get available models from OpenRouter"""
    # For now, return a static list of popular models
    models = [
        {
            'id': 'openai/gpt-3.5-turbo',
            'name': 'GPT-3.5 Turbo',
            'provider': 'OpenAI',
            'context': 16385,
            'pricing': {'prompt': 0.0005, 'completion': 0.0015}
        },
        {
            'id': 'openai/gpt-4',
            'name': 'GPT-4',
            'provider': 'OpenAI',
            'context': 8192,
            'pricing': {'prompt': 0.03, 'completion': 0.06}
        },
        {
            'id': 'anthropic/claude-2',
            'name': 'Claude 2',
            'provider': 'Anthropic',
            'context': 100000,
            'pricing': {'prompt': 0.008, 'completion': 0.024}
        },
        {
            'id': 'google/gemini-pro',
            'name': 'Gemini Pro',
            'provider': 'Google',
            'context': 32768,
            'pricing': {'prompt': 0.000125, 'completion': 0.000375}
        },
        {
            'id': 'meta-llama/llama-3-70b-instruct',
            'name': 'Llama 3 70B',
            'provider': 'Meta',
            'context': 8192,
            'pricing': {'prompt': 0.0008, 'completion': 0.0008}
        }
    ]
    return JsonResponse({'models': models})