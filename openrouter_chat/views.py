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
    """Get all chat sessions for the current user with cost information"""
    sessions = ChatSession.objects.filter(user=request.user)
    sessions_data = []
    for session in sessions:
        # Calculate total cost for this session
        total_cost = sum(float(msg.cost_usd) for msg in session.messages.all())
        sessions_data.append({
            'id': session.id,
            'title': session.title,
            'created_at': session.created_at.isoformat(),
            'updated_at': session.updated_at.isoformat(),
            'total_cost': total_cost
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
    """Get all messages for a session with cost information"""
    try:
        session = ChatSession.objects.get(id=session_id, user=request.user)
        messages = session.messages.all()
        messages_data = []
        total_cost = 0
        for msg in messages:
            cost = float(msg.cost_usd)
            total_cost += cost
            messages_data.append({
                'id': msg.id,
                'role': msg.role,
                'content': msg.content,
                'created_at': msg.created_at.isoformat(),
                'input_tokens': msg.input_tokens,
                'output_tokens': msg.output_tokens,
                'cost_usd': cost
            })
        return JsonResponse({
            'messages': messages_data,
            'total_cost': total_cost
        })
    except ChatSession.DoesNotExist:
        return JsonResponse({'error': 'Session not found'}, status=404)

@login_required
@require_http_methods(["POST"])
def send_message(request):
    """Send a message and get AI response"""
    data = json.loads(request.body)
    session_id = data.get('session_id')
    message_content = data.get('message', '')
    model = data.get('model', 'openai/gpt-3.5-turbo')
    system_prompt = data.get('system_prompt', '')
    attachments = data.get('attachments', []) or []
    
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

        # If there are attachments, merge them into the latest user message as content parts
        has_attachments = isinstance(attachments, list) and len(attachments) > 0
        if has_attachments and messages:
            # Detect model capabilities (vision/audio) similar to get_models
            model_id = model or ''
            lower_id = model_id.lower()
            is_vision = any(term in lower_id for term in ['vision', 'image', 'visual', 'multimodal', 'mm'])
            # Specific overrides
            if 'gpt-4' in model_id and 'vision' in model_id:
                is_vision = True
            if 'claude-3' in lower_id:
                is_vision = True
            if 'gemini' in lower_id and ('pro' in lower_id or 'flash' in lower_id):
                is_vision = True
            if 'llama' in lower_id and 'vision' in lower_id:
                is_vision = True

            content_parts = []
            if message_content:
                content_parts.append({ 'type': 'text', 'text': message_content })

            image_attachments = [a for a in attachments if a.get('type') == 'image' and a.get('data')]
            audio_attachments = [a for a in attachments if a.get('type') == 'audio' and a.get('data')]

            # Only include images if model supports vision
            if image_attachments:
                if not is_vision:
                    return JsonResponse({'error': 'Selected model does not support images.'}, status=400)
                for att in image_attachments:
                    content_parts.append({
                        'type': 'image_url',
                        'image_url': { 'url': att['data'] }
                    })

            # Audio attachments: currently not supported in chat payload here
            if audio_attachments:
                # Return informative error for now
                return JsonResponse({'error': 'Audio attachments are not yet supported in chat messages.'}, status=400)

            # Replace the last message (current user msg) with structured content if parts exist
            if content_parts:
                messages[-1] = {
                    'role': 'user',
                    'content': content_parts
                }
        
        # Call OpenRouter API with decrypted key
        headers = {
            'Authorization': f'Bearer {decrypted_key}',
            'Content-Type': 'application/json'
        }
        
        api_data = {
            'model': model,
            'messages': messages
        }
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
            
            # Extract usage information and costs
            usage = result.get('usage', {})
            input_tokens = usage.get('prompt_tokens', 0)
            output_tokens = usage.get('completion_tokens', 0)
            
            # Try to find cost in different places
            total_cost = 0
            
            # Check different possible locations for cost
            if 'usage' in result:
                # Try different field names
                for cost_field in ['total_cost', 'cost', 'price', 'total_price']:
                    if cost_field in usage:
                        total_cost = usage[cost_field]
                        break
            
            # Check root level
            for cost_field in ['total_cost', 'cost', 'price', 'total_price']:
                if cost_field in result:
                    total_cost = result[cost_field]
                    break
            
            # If still no cost, calculate based on model pricing
            if total_cost == 0:
                # Model pricing (per 1M tokens) - OpenRouter pricing
                model_pricing = {
                    'openai/gpt-3.5-turbo': {'input': 0.5, 'output': 1.5},
                    'openai/gpt-3.5-turbo-16k': {'input': 3.0, 'output': 4.0},
                    'openai/gpt-4': {'input': 30.0, 'output': 60.0},
                    'openai/gpt-4-turbo': {'input': 10.0, 'output': 30.0},
                    'openai/gpt-4o': {'input': 5.0, 'output': 15.0},
                    'openai/gpt-4o-mini': {'input': 0.15, 'output': 0.6},
                    'anthropic/claude-3-opus': {'input': 15.0, 'output': 75.0},
                    'anthropic/claude-3-sonnet': {'input': 3.0, 'output': 15.0},
                    'anthropic/claude-3-haiku': {'input': 0.25, 'output': 1.25},
                    'anthropic/claude-3.5-sonnet': {'input': 3.0, 'output': 15.0},
                    'google/gemini-pro': {'input': 0.125, 'output': 0.375},
                    'google/gemini-pro-1.5': {'input': 2.5, 'output': 7.5},
                    'meta-llama/llama-3-70b-instruct': {'input': 0.8, 'output': 0.8},
                    'meta-llama/llama-3-8b-instruct': {'input': 0.1, 'output': 0.1},
                    'mistralai/mixtral-8x7b-instruct': {'input': 0.6, 'output': 0.6},
                    'openai/gpt-oss-120b': {'input': 0.0, 'output': 0.0},  # Free model
                }
                
                # Get pricing for the model, default to GPT-3.5 pricing if unknown
                pricing = model_pricing.get(model, model_pricing['openai/gpt-3.5-turbo'])
                
                # Calculate cost (prices are per 1M tokens, so divide by 1,000,000)
                input_cost = (input_tokens * pricing['input']) / 1_000_000
                output_cost = (output_tokens * pricing['output']) / 1_000_000
                total_cost = input_cost + output_cost
                
            
            # Update user message with input tokens (retroactively)
            user_message.input_tokens = input_tokens
            user_message.save()
            
            # Save AI message with cost information
            ai_message = Message.objects.create(
                session=session,
                role='assistant',
                content=ai_content,
                model=model,
                output_tokens=output_tokens,
                cost_usd=total_cost
            )
            
            return JsonResponse({
                'message': ai_content,
                'id': ai_message.id,
                'usage': {
                    'input_tokens': input_tokens,
                    'output_tokens': output_tokens,
                    'cost_usd': float(total_cost)
                }
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
                    model_id = model.get('id', '')
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
                    
                    # Determine provider
                    provider = model_id.split('/')[0] if '/' in model_id else 'Unknown'
                    
                    # Determine capabilities
                    capabilities = []
                    is_free = ':free' in model_id or (prompt_price == 0 and completion_price == 0)
                    is_vision = any(term in model_id.lower() for term in ['vision', 'image', 'visual', 'multimodal', 'mm'])
                    is_audio = any(term in model_id.lower() for term in ['audio', 'speech', 'whisper', 'voice'])
                    is_code = any(term in model_id.lower() for term in ['code', 'codestral', 'coder'])
                    
                    # Check for specific model capabilities
                    if 'gpt-4' in model_id and 'vision' in model_id:
                        is_vision = True
                    if 'claude-3' in model_id:
                        is_vision = True  # Claude 3 models support vision
                    if 'gemini' in model_id and ('pro' in model_id or 'flash' in model_id):
                        is_vision = True  # Gemini Pro and Flash support vision
                    if 'llama' in model_id and 'vision' in model_id:
                        is_vision = True
                    
                    if is_vision:
                        capabilities.append('vision')
                    if is_audio:
                        capabilities.append('audio')
                    if is_code:
                        capabilities.append('code')
                    if is_free:
                        capabilities.append('free')
                    
                    models.append({
                        'id': model_id,
                        'name': model.get('name', model_id.split('/')[-1]),
                        'provider': provider,
                        'context': model.get('context_length', 4096),
                        'pricing': {
                            'prompt': prompt_price_1m,  # Per 1M tokens
                            'completion': completion_price_1m
                        },
                        'capabilities': capabilities,
                        'is_free': is_free
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

@login_required
@require_http_methods(["GET"])
def get_user_stats(request):
    """Get user's total usage statistics"""
    sessions = ChatSession.objects.filter(user=request.user)
    
    total_cost = 0
    total_messages = 0
    total_input_tokens = 0
    total_output_tokens = 0
    
    for session in sessions:
        messages = session.messages.all()
        for msg in messages:
            total_cost += float(msg.cost_usd)
            total_messages += 1
            total_input_tokens += msg.input_tokens
            total_output_tokens += msg.output_tokens
    
    return JsonResponse({
        'total_cost': total_cost,
        'total_messages': total_messages,
        'total_input_tokens': total_input_tokens,
        'total_output_tokens': total_output_tokens,
        'session_count': sessions.count()
    })
