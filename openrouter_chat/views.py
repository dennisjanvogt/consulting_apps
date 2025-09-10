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
from .utils import encrypt_api_key, decrypt_api_key

@login_required
def chat_view(request):
    """Main chat interface view"""
    # Get or create user profile
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    # Decrypt API key for display (only show first/last few chars)
    decrypted_key = decrypt_api_key(profile.api_key_encrypted) if profile.api_key_encrypted else ''
    
    context = {
        'user': request.user,
        'api_key': decrypted_key
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
@require_http_methods(["DELETE"])
def delete_session(request, session_id):
    """Delete a chat session"""
    try:
        session = ChatSession.objects.get(id=session_id, user=request.user)
        session.delete()
        return JsonResponse({'success': True})
    except ChatSession.DoesNotExist:
        return JsonResponse({'error': 'Session not found'}, status=404)

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
    model = data.get('model', 'openai/gpt-3.5-turbo')
    system_prompt = data.get('system_prompt', '')
    
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
        try:
            profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=request.user)
            
        decrypted_key = decrypt_api_key(profile.api_key_encrypted)
        if not decrypted_key:
            return JsonResponse({'error': 'Please set your OpenRouter API key in settings'}, status=400)
        
        # Prepare messages for API
        messages = []
        
        # Add system prompt if provided
        if system_prompt:
            messages.append({
                'role': 'system',
                'content': system_prompt
            })
        
        # Add conversation history
        for msg in session.messages.all():
            messages.append({
                'role': msg.role,
                'content': msg.content
            })
        
        # Call OpenRouter API with decrypted key
        headers = {
            'Authorization': f'Bearer {decrypted_key}',
            'Content-Type': 'application/json'
        }
        
        api_data = {
            'model': model,
            'messages': messages
        }
        
        # Print debug info
        print(f"DEBUG: Sending to OpenRouter with model: {model}")
        print(f"DEBUG: API Key (first 20 chars): {profile.api_key_encrypted[:20] if profile.api_key_encrypted else 'None'}")
        print(f"DEBUG: Number of messages: {len(messages)}")
        
        try:
            response = requests.post(
                'https://openrouter.ai/api/v1/chat/completions',
                headers=headers,
                json=api_data,
                timeout=30
            )
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {str(e)}")
            return JsonResponse({'error': f'Failed to connect to OpenRouter: {str(e)}'}, status=500)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check if response has expected format
            if 'choices' not in result or len(result['choices']) == 0:
                return JsonResponse({'error': 'Invalid API response format'}, status=500)
            
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
        elif response.status_code == 401:
            # Unauthorized - Invalid API key
            error_msg = 'Invalid or expired API key. Please update your OpenRouter API key in settings.'
            print(f"OpenRouter API Error: Invalid API key")
            return JsonResponse({'error': error_msg}, status=401)
        elif response.status_code == 402:
            # Payment required
            error_msg = 'Insufficient credits. Please add credits to your OpenRouter account.'
            return JsonResponse({'error': error_msg}, status=402)
        elif response.status_code == 429:
            # Rate limited
            error_msg = 'Rate limit exceeded. Please wait a moment and try again.'
            return JsonResponse({'error': error_msg}, status=429)
        else:
            error_msg = f'OpenRouter API error: {response.status_code}'
            if response.text:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', {}).get('message', error_msg)
                except:
                    error_msg = response.text[:200]
            
            print(f"OpenRouter API Error: {response.status_code} - {response.text}")
            return JsonResponse({'error': error_msg}, status=400)
            
    except ChatSession.DoesNotExist:
        return JsonResponse({'error': 'Session not found'}, status=404)
    except Exception as e:
        print(f"Error in send_message: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'Server error: {str(e)}'}, status=500)

@login_required
@require_http_methods(["POST"])
def save_api_key(request):
    """Save user's API key"""
    data = json.loads(request.body)
    api_key = data.get('api_key')
    
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    # Encrypt the API key before saving
    profile.api_key_encrypted = encrypt_api_key(api_key)
    profile.save()
    
    return JsonResponse({'success': True})

@login_required
@require_http_methods(["GET"])
def get_models(request):
    """Get available models from OpenRouter API"""
    
    # Try to fetch from OpenRouter API
    try:
        profile = UserProfile.objects.get(user=request.user)
        decrypted_key = decrypt_api_key(profile.api_key_encrypted)
        if decrypted_key:
            headers = {
                'Authorization': f'Bearer {decrypted_key}',
                'HTTP-Referer': request.META.get('HTTP_HOST', 'localhost'),
                'X-Title': 'OpenRouter Chat Django'
            }
            
            response = requests.get(
                'https://openrouter.ai/api/v1/models',
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                models = []
                
                for model in data.get('data', []):
                    # Convert pricing from per token to per 1M tokens
                    prompt_price = model.get('pricing', {}).get('prompt', '0')
                    completion_price = model.get('pricing', {}).get('completion', '0')
                    
                    # Handle string prices
                    if isinstance(prompt_price, str):
                        prompt_price = float(prompt_price) if prompt_price else 0
                    if isinstance(completion_price, str):
                        completion_price = float(completion_price) if completion_price else 0
                    
                    # Convert to per 1M tokens and round to 3 decimal places
                    prompt_price_1m = round(prompt_price * 1000000, 3)
                    completion_price_1m = round(completion_price * 1000000, 3)
                    
                    models.append({
                        'id': model.get('id'),
                        'name': model.get('name', model.get('id', '').split('/')[-1]),
                        'provider': model.get('id', '').split('/')[0] if '/' in model.get('id', '') else 'Unknown',
                        'context': model.get('context_length', 4096),
                        'pricing': {
                            'prompt': prompt_price_1m,  # Per 1M tokens
                            'completion': completion_price_1m
                        },
                        'capabilities': []
                    })
                
                # Sort by provider and name
                models.sort(key=lambda x: (x['provider'], x['name']))
                return JsonResponse({'models': models})
    except:
        pass  # Fall back to static list
    
    # Fallback to static list with more details and recent models (prices per 1M tokens)
    models = [
        {
            'id': 'openai/gpt-3.5-turbo',
            'name': 'GPT-3.5 Turbo',
            'provider': 'OpenAI',
            'context': 16385,
            'pricing': {'prompt': 0.5, 'completion': 1.5},
            'capabilities': ['chat', 'code', 'reasoning']
        },
        {
            'id': 'openai/gpt-4',
            'name': 'GPT-4',
            'provider': 'OpenAI',
            'context': 8192,
            'pricing': {'prompt': 30.0, 'completion': 60.0},
            'capabilities': ['chat', 'code', 'reasoning', 'analysis']
        },
        {
            'id': 'openai/gpt-4-turbo',
            'name': 'GPT-4 Turbo',
            'provider': 'OpenAI',
            'context': 128000,
            'pricing': {'prompt': 10.0, 'completion': 30.0},
            'capabilities': ['chat', 'code', 'vision', 'reasoning', 'analysis']
        },
        {
            'id': 'anthropic/claude-2',
            'name': 'Claude 2',
            'provider': 'Anthropic',
            'context': 100000,
            'pricing': {'prompt': 8.0, 'completion': 24.0},
            'capabilities': ['chat', 'code', 'reasoning', 'analysis', 'creative']
        },
        {
            'id': 'anthropic/claude-3-opus',
            'name': 'Claude 3 Opus',
            'provider': 'Anthropic',
            'context': 200000,
            'pricing': {'prompt': 15.0, 'completion': 75.0},
            'capabilities': ['chat', 'code', 'vision', 'reasoning', 'analysis', 'creative']
        },
        {
            'id': 'anthropic/claude-3-sonnet',
            'name': 'Claude 3 Sonnet',
            'provider': 'Anthropic',
            'context': 200000,
            'pricing': {'prompt': 3.0, 'completion': 15.0},
            'capabilities': ['chat', 'code', 'vision', 'reasoning']
        },
        {
            'id': 'google/gemini-pro',
            'name': 'Gemini Pro',
            'provider': 'Google',
            'context': 32768,
            'pricing': {'prompt': 0.125, 'completion': 0.375},
            'capabilities': ['chat', 'code', 'reasoning']
        },
        {
            'id': 'google/gemini-pro-vision',
            'name': 'Gemini Pro Vision',
            'provider': 'Google',
            'context': 32768,
            'pricing': {'prompt': 0.125, 'completion': 0.375},
            'capabilities': ['chat', 'code', 'vision', 'reasoning']
        },
        {
            'id': 'meta-llama/llama-3-70b-instruct',
            'name': 'Llama 3 70B',
            'provider': 'Meta',
            'context': 8192,
            'pricing': {'prompt': 0.8, 'completion': 0.8},
            'capabilities': ['chat', 'code', 'reasoning']
        },
        {
            'id': 'mistralai/mixtral-8x7b-instruct',
            'name': 'Mixtral 8x7B',
            'provider': 'Mistral AI',
            'context': 32768,
            'pricing': {'prompt': 0.6, 'completion': 0.6},
            'capabilities': ['chat', 'code', 'reasoning']
        }
    ]
    
    # Sort models by provider and name
    models.sort(key=lambda x: (x['provider'], x['name']))
    
    return JsonResponse({'models': models})