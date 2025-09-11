from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
import json
import requests
from .models import Task

@login_required
def index(request):
    return render(request, 'kanban_app/index.html')

@login_required
def get_tasks(request, board_type):
    tasks = Task.objects.filter(user=request.user, board_type=board_type.upper())
    tasks_data = []
    for task in tasks:
        tasks_data.append({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'priority': task.priority,
            'status': task.status,
            'board_type': task.board_type,
            'created_at': task.created_at.isoformat(),
            'position': task.position
        })
    return JsonResponse({'tasks': tasks_data})

@login_required
@require_http_methods(["POST"])
def create_task(request):
    data = json.loads(request.body)
    task = Task.objects.create(
        user=request.user,
        title=data['title'],
        description=data.get('description', ''),
        priority=data.get('priority', 'MEDIUM'),
        status=data.get('status', 'BACKLOG'),
        board_type=data['board_type'],
        position=data.get('position', 0)
    )
    return JsonResponse({
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'priority': task.priority,
        'status': task.status,
        'board_type': task.board_type,
        'created_at': task.created_at.isoformat(),
        'position': task.position
    })

@login_required
@require_http_methods(["PUT"])
def update_task(request, task_id):
    task = get_object_or_404(Task, pk=task_id, user=request.user)
    data = json.loads(request.body)
    
    task.title = data.get('title', task.title)
    task.description = data.get('description', task.description)
    task.priority = data.get('priority', task.priority)
    task.status = data.get('status', task.status)
    task.position = data.get('position', task.position)
    task.save()
    
    return JsonResponse({
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'priority': task.priority,
        'status': task.status,
        'board_type': task.board_type,
        'position': task.position
    })

@login_required
@require_http_methods(["DELETE"])
def delete_task(request, task_id):
    task = get_object_or_404(Task, pk=task_id, user=request.user)
    task.delete()
    return JsonResponse({'success': True})

@login_required
@require_http_methods(["PATCH"])
def move_task(request, task_id):
    task = get_object_or_404(Task, pk=task_id, user=request.user)
    data = json.loads(request.body)
    
    task.status = data['status']
    task.position = data.get('position', task.position)
    task.save()
    
    return JsonResponse({'success': True})

# AI Assistant Views
@login_required
def check_api_key(request):
    """Check if user has OpenRouter API key configured"""
    try:
        from openrouter_chat.models import UserProfile as OpenRouterProfile
        from openrouter_chat.utils import decrypt_api_key
        
        profile = OpenRouterProfile.objects.filter(user=request.user).first()
        has_key = bool(profile and profile.api_key_encrypted)
        
        return JsonResponse({'has_api_key': has_key})
    except Exception:
        return JsonResponse({'has_api_key': False})

@login_required
@require_http_methods(["POST"])
def generate_tasks(request):
    """Generate tasks using AI"""
    try:
        data = json.loads(request.body)
        
        # Get API key
        from openrouter_chat.models import UserProfile as OpenRouterProfile
        from openrouter_chat.utils import decrypt_api_key
        
        profile = OpenRouterProfile.objects.filter(user=request.user).first()
        if not profile or not profile.api_key_encrypted:
            return JsonResponse({'success': False, 'error': 'No API key configured'})
        
        api_key = decrypt_api_key(profile.api_key_encrypted)
        
        # Prepare prompt based on task type
        task_type = data.get('task_type', 'feature')
        description = data.get('description', '')
        task_count = data.get('task_count', 5)
        target_column = data.get('target_column', 'TODO')
        model = data.get('model', 'openai/gpt-3.5-turbo')
        board_type = data.get('board_type', 'WORK')
        
        # Create system prompt
        system_prompt = """You are a project management assistant. Generate clear, actionable task items based on the description provided.
Each task should have:
1. A clear, concise title (max 100 chars)
2. A detailed description explaining what needs to be done
3. Appropriate priority (LOW, MEDIUM, HIGH)

Return tasks as a JSON array with this structure:
[{"title": "...", "description": "...", "priority": "..."}]"""
        
        # Create user prompt
        user_prompt = f"""Generate {task_count} {task_type} tasks for: {description}

Requirements:
- Tasks should be specific and actionable
- Break down complex work into manageable pieces
- Consider dependencies between tasks
- Assign appropriate priorities

Return ONLY a JSON array, no additional text."""
        
        # Call OpenRouter API
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
                'HTTP-Referer': request.build_absolute_uri('/'),
                'X-Title': 'Kanban AI Assistant'
            },
            json={
                'model': model,
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                'temperature': 0.7,
                'max_tokens': 2000
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Extract tasks from response
            content = result['choices'][0]['message']['content']
            
            # Parse JSON from content
            import re
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                tasks_data = json.loads(json_match.group())
            else:
                tasks_data = json.loads(content)
            
            # Create tasks in database
            created_tasks = []
            for idx, task_data in enumerate(tasks_data[:task_count]):
                task = Task.objects.create(
                    user=request.user,
                    title=task_data.get('title', f'Task {idx + 1}')[:200],
                    description=task_data.get('description', ''),
                    priority=task_data.get('priority', 'MEDIUM'),
                    status=target_column,
                    board_type=board_type.upper(),
                    position=idx
                )
                created_tasks.append({
                    'id': task.id,
                    'title': task.title,
                    'description': task.description,
                    'priority': task.priority
                })
            
            # Calculate cost (rough estimate)
            usage = result.get('usage', {})
            input_tokens = usage.get('prompt_tokens', 0)
            output_tokens = usage.get('completion_tokens', 0)
            
            # Get model pricing (simplified)
            model_pricing = {
                'openai/gpt-3.5-turbo': {'input': 0.5, 'output': 1.5},
                'openai/gpt-4': {'input': 30.0, 'output': 60.0},
                'openai/gpt-4-turbo-preview': {'input': 10.0, 'output': 30.0},
            }
            
            pricing = model_pricing.get(model, {'input': 1.0, 'output': 2.0})
            cost = (input_tokens * pricing['input'] + output_tokens * pricing['output']) / 1000000
            
            return JsonResponse({
                'success': True,
                'tasks': created_tasks,
                'tokens': input_tokens + output_tokens,
                'cost': cost
            })
        else:
            return JsonResponse({
                'success': False,
                'error': f'API error: {response.status_code}'
            })
            
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON in request'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})