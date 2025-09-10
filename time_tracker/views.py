from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Q, F
from django.utils import timezone
from datetime import datetime, timedelta, date
from decimal import Decimal
import json

from .models import Client, Project, Task, TimeEntry, Timer


@login_required
def tracker_view(request):
    """Main time tracker view"""
    return render(request, 'time_tracker/index.html')


# ==================== CLIENT APIs ====================

@login_required
def api_clients(request):
    """API for client operations"""
    if request.method == 'GET':
        clients = Client.objects.filter(user=request.user, is_active=True)
        clients_data = []
        for client in clients:
            clients_data.append({
                'id': client.id,
                'name': client.name,
                'company': client.company,
                'email': client.email,
                'hourly_rate': str(client.hourly_rate),
                'color': client.color,
                'total_hours': round(client.get_total_hours(), 2),
                'total_revenue': str(client.get_total_revenue()),
                'project_count': client.projects.filter(status='active').count(),
            })
        return JsonResponse({'clients': clients_data})
    
    elif request.method == 'POST':
        data = json.loads(request.body)
        client = Client.objects.create(
            user=request.user,
            name=data.get('name'),
            company=data.get('company', ''),
            email=data.get('email', ''),
            phone=data.get('phone', ''),
            address=data.get('address', ''),
            hourly_rate=Decimal(data.get('hourly_rate', '100.00')),
            color=data.get('color', '#1E3A5F')
        )
        return JsonResponse({
            'id': client.id,
            'name': client.name,
            'company': client.company,
        })
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@login_required
def api_client_detail(request, client_id):
    """API for single client operations"""
    client = get_object_or_404(Client, id=client_id, user=request.user)
    
    if request.method == 'GET':
        return JsonResponse({
            'id': client.id,
            'name': client.name,
            'company': client.company,
            'email': client.email,
            'phone': client.phone,
            'address': client.address,
            'hourly_rate': str(client.hourly_rate),
            'color': client.color,
            'is_active': client.is_active,
        })
    
    elif request.method == 'PUT':
        data = json.loads(request.body)
        client.name = data.get('name', client.name)
        client.company = data.get('company', client.company)
        client.email = data.get('email', client.email)
        client.phone = data.get('phone', client.phone)
        client.address = data.get('address', client.address)
        if 'hourly_rate' in data:
            client.hourly_rate = Decimal(data['hourly_rate'])
        client.color = data.get('color', client.color)
        client.save()
        return JsonResponse({'success': True})
    
    elif request.method == 'DELETE':
        client.is_active = False
        client.save()
        return JsonResponse({'success': True})
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ==================== PROJECT APIs ====================

@login_required
def api_projects(request):
    """API for project operations"""
    if request.method == 'GET':
        client_id = request.GET.get('client_id')
        status = request.GET.get('status', 'active')
        
        projects = Project.objects.filter(user=request.user)
        if client_id:
            projects = projects.filter(client_id=client_id)
        if status:
            projects = projects.filter(status=status)
        
        projects_data = []
        for project in projects:
            projects_data.append({
                'id': project.id,
                'client_id': project.client.id,
                'client_name': project.client.name,
                'name': project.name,
                'description': project.description,
                'hourly_rate': str(project.hourly_rate) if project.hourly_rate else None,
                'daily_rate': str(project.daily_rate) if project.daily_rate else None,
                'budget_hours': str(project.budget_hours) if project.budget_hours else None,
                'status': project.status,
                'color': project.color,
                'total_hours': round(project.get_total_hours(), 2),
                'total_revenue': str(project.get_total_revenue()),
                'budget_percentage': float(project.get_budget_percentage()) if project.get_budget_percentage() else None,
            })
        return JsonResponse({'projects': projects_data})
    
    elif request.method == 'POST':
        data = json.loads(request.body)
        client = get_object_or_404(Client, id=data.get('client_id'), user=request.user)
        
        project = Project.objects.create(
            user=request.user,
            client=client,
            name=data.get('name'),
            description=data.get('description', ''),
            hourly_rate=Decimal(data.get('hourly_rate')) if data.get('hourly_rate') else None,
            daily_rate=Decimal(data.get('daily_rate')) if data.get('daily_rate') else None,
            budget_hours=Decimal(data.get('budget_hours')) if data.get('budget_hours') else None,
            status=data.get('status', 'active'),
            color=data.get('color', '#3A5F1E')
        )
        return JsonResponse({
            'id': project.id,
            'name': project.name,
            'client_name': client.name,
        })
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ==================== TASK APIs ====================

@login_required
def api_tasks(request):
    """API for task operations"""
    if request.method == 'GET':
        project_id = request.GET.get('project_id')
        
        tasks = Task.objects.filter(user=request.user)
        if project_id:
            tasks = tasks.filter(project_id=project_id)
        
        tasks_data = []
        for task in tasks:
            tasks_data.append({
                'id': task.id,
                'project_id': task.project.id,
                'project_name': task.project.name,
                'client_name': task.project.client.name,
                'name': task.name,
                'description': task.description,
                'estimated_hours': str(task.estimated_hours) if task.estimated_hours else None,
                'total_hours': round(task.get_total_hours(), 2),
                'is_completed': task.is_completed,
                'display_name': f"{task.project.client.name} > {task.project.name} > {task.name}",
            })
        return JsonResponse({'tasks': tasks_data})
    
    elif request.method == 'POST':
        data = json.loads(request.body)
        project = get_object_or_404(Project, id=data.get('project_id'), user=request.user)
        
        task = Task.objects.create(
            user=request.user,
            project=project,
            name=data.get('name'),
            description=data.get('description', ''),
            estimated_hours=Decimal(data.get('estimated_hours')) if data.get('estimated_hours') else None,
        )
        return JsonResponse({
            'id': task.id,
            'name': task.name,
            'project_name': project.name,
        })
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ==================== TIMER APIs ====================

@login_required
def api_timer_start(request):
    """Start a new timer"""
    if request.method == 'POST':
        data = json.loads(request.body)
        task = get_object_or_404(Task, id=data.get('task_id'), user=request.user)
        
        # Stop any existing timer
        try:
            existing_timer = Timer.objects.get(user=request.user)
            existing_timer.stop()
        except Timer.DoesNotExist:
            pass
        
        # Create new timer
        timer = Timer.objects.create(
            user=request.user,
            task=task,
            start_time=timezone.now(),
            description=data.get('description', ''),
        )
        
        return JsonResponse({
            'id': timer.id,
            'task_id': task.id,
            'task_name': task.name,
            'project_name': task.project.name,
            'client_name': task.project.client.name,
            'start_time': timer.start_time.isoformat(),
        })
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@login_required
def api_timer_stop(request):
    """Stop the active timer"""
    if request.method == 'POST':
        try:
            timer = Timer.objects.get(user=request.user)
            
            # Update description if provided in request
            data = json.loads(request.body) if request.body else {}
            if 'description' in data:
                timer.description = data['description']
                timer.save()
            
            entry = timer.stop()
            
            return JsonResponse({
                'success': True,
                'entry_id': entry.id if entry else None,
                'duration': entry.get_duration_formatted() if entry else None,
                'revenue': str(entry.get_revenue()) if entry else None,
            })
        except Timer.DoesNotExist:
            return JsonResponse({'error': 'No active timer'}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@login_required
def api_timer_status(request):
    """Get current timer status"""
    try:
        timer = Timer.objects.get(user=request.user)
        return JsonResponse({
            'is_running': True,
            'timer_id': timer.id,
            'task_id': timer.task.id,
            'task_name': timer.task.name,
            'project_name': timer.task.project.name,
            'client_name': timer.task.project.client.name,
            'start_time': timer.start_time.isoformat(),
            'elapsed': timer.get_elapsed_formatted(),
            'elapsed_seconds': int(timer.get_elapsed_time()),
            'description': timer.description,
        })
    except Timer.DoesNotExist:
        return JsonResponse({'is_running': False})


# ==================== TIME ENTRY APIs ====================

@login_required
def api_time_entries(request):
    """API for time entries"""
    if request.method == 'GET':
        # Filter parameters
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        task_id = request.GET.get('task_id')
        project_id = request.GET.get('project_id')
        client_id = request.GET.get('client_id')
        
        entries = TimeEntry.objects.filter(user=request.user, is_deleted=False)
        
        if date_from:
            entries = entries.filter(start_time__gte=datetime.fromisoformat(date_from))
        if date_to:
            entries = entries.filter(start_time__lte=datetime.fromisoformat(date_to))
        if task_id:
            entries = entries.filter(task_id=task_id)
        if project_id:
            entries = entries.filter(task__project_id=project_id)
        if client_id:
            entries = entries.filter(task__project__client_id=client_id)
        
        entries_data = []
        for entry in entries[:100]:  # Limit to 100 entries
            entries_data.append({
                'id': entry.id,
                'task_id': entry.task.id,
                'task_name': entry.task.name,
                'project_name': entry.task.project.name,
                'client_name': entry.task.project.client.name,
                'start_time': entry.start_time.isoformat(),
                'end_time': entry.end_time.isoformat() if entry.end_time else None,
                'duration': entry.get_duration_formatted(),
                'duration_hours': round(entry.get_duration_hours(), 2),
                'description': entry.description,
                'is_billable': entry.is_billable,
                'is_billed': entry.is_billed,
                'revenue': str(entry.get_revenue()),
            })
        
        return JsonResponse({'entries': entries_data})
    
    elif request.method == 'POST':
        data = json.loads(request.body)
        task = get_object_or_404(Task, id=data.get('task_id'), user=request.user)
        
        entry = TimeEntry.objects.create(
            user=request.user,
            task=task,
            start_time=datetime.fromisoformat(data.get('start_time')),
            end_time=datetime.fromisoformat(data.get('end_time')) if data.get('end_time') else None,
            description=data.get('description', ''),
            is_billable=data.get('is_billable', True),
        )
        
        return JsonResponse({
            'id': entry.id,
            'duration': entry.get_duration_formatted(),
        })
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@login_required
def api_time_entry_detail(request, entry_id):
    """API for single time entry operations"""
    entry = get_object_or_404(TimeEntry, id=entry_id, user=request.user)
    
    if request.method == 'PUT':
        data = json.loads(request.body)
        if 'start_time' in data:
            entry.start_time = datetime.fromisoformat(data['start_time'])
        if 'end_time' in data:
            entry.end_time = datetime.fromisoformat(data['end_time']) if data['end_time'] else None
        entry.description = data.get('description', entry.description)
        entry.is_billable = data.get('is_billable', entry.is_billable)
        entry.save()
        return JsonResponse({'success': True})
    
    elif request.method == 'DELETE':
        entry.is_deleted = True
        entry.save()
        return JsonResponse({'success': True})
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ==================== STATISTICS APIs ====================

@login_required
def api_statistics(request):
    """Get statistics for dashboard"""
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    
    entries = TimeEntry.objects.filter(user=request.user, is_deleted=False)
    
    # Today's stats
    today_entries = entries.filter(start_time__date=today)
    today_seconds = sum(e.get_duration_seconds() for e in today_entries)
    today_revenue = sum(e.get_revenue() for e in today_entries if e.is_billable)
    
    # Week's stats
    week_entries = entries.filter(start_time__date__gte=week_start)
    week_seconds = sum(e.get_duration_seconds() for e in week_entries)
    week_revenue = sum(e.get_revenue() for e in week_entries if e.is_billable)
    
    # Month's stats
    month_entries = entries.filter(start_time__date__gte=month_start)
    month_seconds = sum(e.get_duration_seconds() for e in month_entries)
    month_revenue = sum(e.get_revenue() for e in month_entries if e.is_billable)
    
    def format_duration(seconds):
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{hours}h {minutes}m"
    
    return JsonResponse({
        'today': {
            'duration': format_duration(today_seconds),
            'revenue': f'{today_revenue:.2f}',
            'entries': today_entries.count(),
        },
        'week': {
            'duration': format_duration(week_seconds),
            'revenue': f'{week_revenue:.2f}',
            'entries': week_entries.count(),
        },
        'month': {
            'duration': format_duration(month_seconds),
            'revenue': f'{month_revenue:.2f}',
            'entries': month_entries.count(),
        },
    })


@login_required
def api_timeline(request):
    """Get timeline data for visualization"""
    date_str = request.GET.get('date', str(date.today()))
    target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    
    entries = TimeEntry.objects.filter(
        user=request.user,
        is_deleted=False,
        start_time__date=target_date
    ).select_related('task__project__client').order_by('start_time')
    
    timeline_data = []
    for entry in entries:
        start_hour = entry.start_time.hour + entry.start_time.minute / 60
        duration_hours = entry.get_duration_hours()
        
        timeline_data.append({
            'id': entry.id,
            'task_name': entry.task.name,
            'project_name': entry.task.project.name,
            'client_name': entry.task.project.client.name,
            'start_hour': start_hour,
            'duration_hours': duration_hours,
            'color': entry.task.project.color,
            'description': entry.description,
            'is_billable': entry.is_billable,
        })
    
    return JsonResponse({'timeline': timeline_data})