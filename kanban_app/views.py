from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
import json
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