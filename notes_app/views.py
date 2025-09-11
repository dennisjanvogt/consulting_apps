from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.utils import timezone
import json
import markdown
import uuid
from .models import Note, Folder, Tag, NoteVersion, NoteAttachment, SharedNote

@login_required
def index(request):
    return render(request, 'notes_app/index.html')

@login_required
def get_folders(request):
    folders = Folder.objects.filter(user=request.user)
    folders_data = []
    
    def build_folder_tree(parent=None):
        result = []
        for folder in folders.filter(parent=parent):
            folder_item = {
                'id': folder.id,
                'name': folder.name,
                'color': folder.color,
                'icon': folder.icon,
                'position': folder.position,
                'children': build_folder_tree(folder)
            }
            result.append(folder_item)
        return result
    
    folders_data = build_folder_tree()
    return JsonResponse({'folders': folders_data})

@login_required
@require_http_methods(["POST"])
def create_folder(request):
    data = json.loads(request.body)
    parent_id = data.get('parent_id')
    parent = None
    
    if parent_id:
        parent = get_object_or_404(Folder, pk=parent_id, user=request.user)
    
    folder = Folder.objects.create(
        user=request.user,
        name=data['name'],
        parent=parent,
        color=data.get('color', '#3F1E5F'),
        icon=data.get('icon', 'folder'),
        position=data.get('position', 0)
    )
    
    return JsonResponse({
        'id': folder.id,
        'name': folder.name,
        'color': folder.color,
        'icon': folder.icon,
        'position': folder.position,
        'parent_id': folder.parent.id if folder.parent else None
    })

@login_required
@require_http_methods(["PUT"])
def update_folder(request, folder_id):
    folder = get_object_or_404(Folder, pk=folder_id, user=request.user)
    data = json.loads(request.body)
    
    folder.name = data.get('name', folder.name)
    folder.color = data.get('color', folder.color)
    folder.icon = data.get('icon', folder.icon)
    folder.position = data.get('position', folder.position)
    
    if 'parent_id' in data:
        if data['parent_id']:
            parent = get_object_or_404(Folder, pk=data['parent_id'], user=request.user)
            folder.parent = parent
        else:
            folder.parent = None
    
    folder.save()
    return JsonResponse({'success': True})

@login_required
@require_http_methods(["DELETE"])
def delete_folder(request, folder_id):
    folder = get_object_or_404(Folder, pk=folder_id, user=request.user)
    folder.delete()
    return JsonResponse({'success': True})

@login_required
def get_notes(request):
    notes = Note.objects.filter(user=request.user, is_archived=False)
    
    # Apply filters
    folder_id = request.GET.get('folder')
    if folder_id:
        notes = notes.filter(folder_id=folder_id)
    
    search = request.GET.get('search')
    if search:
        notes = notes.filter(
            Q(title__icontains=search) | 
            Q(content__icontains=search)
        )
    
    favorites_only = request.GET.get('favorites')
    if favorites_only == 'true':
        notes = notes.filter(is_favorite=True)
    
    tag_names = request.GET.getlist('tags')
    if tag_names:
        notes = notes.filter(tags__name__in=tag_names).distinct()
    
    notes_data = []
    for note in notes:
        notes_data.append({
            'id': note.id,
            'title': note.title,
            'content': note.content[:200],  # Preview
            'folder_id': note.folder.id if note.folder else None,
            'folder_name': note.folder.name if note.folder else None,
            'tags': [{'id': tag.id, 'name': tag.name, 'color': tag.color} for tag in note.tags.all()],
            'is_favorite': note.is_favorite,
            'is_pinned': note.is_pinned,
            'word_count': note.word_count,
            'created_at': note.created_at.isoformat(),
            'updated_at': note.updated_at.isoformat()
        })
    
    return JsonResponse({'notes': notes_data})

@login_required
def get_note(request, note_id):
    note = get_object_or_404(Note, pk=note_id, user=request.user)
    
    # Update last accessed
    note.last_accessed = timezone.now()
    note.save()
    
    # Convert markdown to HTML
    md = markdown.Markdown(extensions=['extra', 'codehilite', 'fenced_code', 'tables'])
    content_html = md.convert(note.content)
    
    return JsonResponse({
        'id': note.id,
        'title': note.title,
        'content': note.content,
        'content_html': content_html,
        'folder_id': note.folder.id if note.folder else None,
        'tags': [{'id': tag.id, 'name': tag.name, 'color': tag.color} for tag in note.tags.all()],
        'is_favorite': note.is_favorite,
        'is_pinned': note.is_pinned,
        'word_count': note.word_count,
        'created_at': note.created_at.isoformat(),
        'updated_at': note.updated_at.isoformat(),
        'attachments': [{
            'id': att.id,
            'name': att.original_name,
            'size': att.file_size,
            'url': att.file.url
        } for att in note.attachments.all()]
    })

@login_required
@require_http_methods(["POST"])
def create_note(request):
    data = json.loads(request.body)
    
    folder = None
    if data.get('folder_id'):
        folder = get_object_or_404(Folder, pk=data['folder_id'], user=request.user)
    
    note = Note.objects.create(
        user=request.user,
        title=data['title'],
        content=data.get('content', ''),
        folder=folder,
        is_favorite=data.get('is_favorite', False),
        is_pinned=data.get('is_pinned', False)
    )
    
    # Update word count
    note.update_word_count()
    
    # Add tags
    tag_ids = data.get('tags', [])
    for tag_id in tag_ids:
        tag = get_object_or_404(Tag, pk=tag_id, user=request.user)
        note.tags.add(tag)
    
    # Create initial version
    NoteVersion.objects.create(
        note=note,
        content=note.content,
        version_number=1
    )
    
    return JsonResponse({
        'id': note.id,
        'title': note.title,
        'created_at': note.created_at.isoformat()
    })

@login_required
@require_http_methods(["PUT"])
def update_note(request, note_id):
    note = get_object_or_404(Note, pk=note_id, user=request.user)
    data = json.loads(request.body)
    
    # Save version if content changed
    if 'content' in data and data['content'] != note.content:
        last_version = note.versions.first()
        version_number = (last_version.version_number + 1) if last_version else 1
        
        # Keep only last 10 versions
        if version_number > 10:
            oldest_version = note.versions.last()
            oldest_version.delete()
        
        NoteVersion.objects.create(
            note=note,
            content=note.content,  # Save old content
            version_number=version_number
        )
    
    # Update note
    note.title = data.get('title', note.title)
    note.content = data.get('content', note.content)
    note.is_favorite = data.get('is_favorite', note.is_favorite)
    note.is_pinned = data.get('is_pinned', note.is_pinned)
    
    if 'folder_id' in data:
        if data['folder_id']:
            folder = get_object_or_404(Folder, pk=data['folder_id'], user=request.user)
            note.folder = folder
        else:
            note.folder = None
    
    # Update tags
    if 'tags' in data:
        note.tags.clear()
        for tag_id in data['tags']:
            tag = get_object_or_404(Tag, pk=tag_id, user=request.user)
            note.tags.add(tag)
    
    note.update_word_count()
    note.save()
    
    return JsonResponse({'success': True})

@login_required
@require_http_methods(["DELETE"])
def delete_note(request, note_id):
    note = get_object_or_404(Note, pk=note_id, user=request.user)
    note.delete()
    return JsonResponse({'success': True})

@login_required
@require_http_methods(["PATCH"])
def move_note(request, note_id):
    note = get_object_or_404(Note, pk=note_id, user=request.user)
    data = json.loads(request.body)
    
    folder_id = data.get('folder_id')
    if folder_id:
        folder = get_object_or_404(Folder, pk=folder_id, user=request.user)
        note.folder = folder
    else:
        note.folder = None
    
    note.save()
    return JsonResponse({'success': True})

@login_required
def search_notes(request):
    query = request.GET.get('q', '')
    if not query:
        return JsonResponse({'results': []})
    
    notes = Note.objects.filter(
        user=request.user,
        is_archived=False
    ).filter(
        Q(title__icontains=query) | 
        Q(content__icontains=query) |
        Q(tags__name__icontains=query)
    ).distinct()[:20]
    
    results = []
    for note in notes:
        # Highlight matching text
        content_preview = note.content[:200]
        if query.lower() in content_preview.lower():
            start = content_preview.lower().index(query.lower())
            content_preview = '...' + content_preview[max(0, start-30):min(len(content_preview), start+100)] + '...'
        
        results.append({
            'id': note.id,
            'title': note.title,
            'preview': content_preview,
            'folder': note.folder.name if note.folder else None,
            'updated_at': note.updated_at.isoformat()
        })
    
    return JsonResponse({'results': results})

@login_required
def get_tags(request):
    tags = Tag.objects.filter(user=request.user)
    tags_data = [{
        'id': tag.id,
        'name': tag.name,
        'color': tag.color
    } for tag in tags]
    
    return JsonResponse({'tags': tags_data})

@login_required
@require_http_methods(["POST"])
def create_tag(request):
    data = json.loads(request.body)
    
    tag, created = Tag.objects.get_or_create(
        user=request.user,
        name=data['name'],
        defaults={'color': data.get('color', '#3F1E5F')}
    )
    
    return JsonResponse({
        'id': tag.id,
        'name': tag.name,
        'color': tag.color,
        'created': created
    })

@login_required
def export_note(request, note_id):
    note = get_object_or_404(Note, pk=note_id, user=request.user)
    format_type = request.GET.get('format', 'markdown')
    
    if format_type == 'markdown':
        response = HttpResponse(note.content, content_type='text/markdown')
        response['Content-Disposition'] = f'attachment; filename="{note.title}.md"'
    elif format_type == 'html':
        md = markdown.Markdown(extensions=['extra', 'codehilite', 'fenced_code', 'tables'])
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{note.title}</title>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }}
                pre {{ background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto; }}
                code {{ background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background: #f4f4f4; }}
            </style>
        </head>
        <body>
            <h1>{note.title}</h1>
            {md.convert(note.content)}
        </body>
        </html>
        """
        response = HttpResponse(html_content, content_type='text/html')
        response['Content-Disposition'] = f'attachment; filename="{note.title}.html"'
    else:
        return JsonResponse({'error': 'Invalid format'}, status=400)
    
    return response

# AI Agent Functions
@login_required
def get_ai_templates(request):
    """Get available AI document templates"""
    from .ai_agent import AIAgent
    templates = AIAgent.get_templates()
    return JsonResponse({'templates': templates})

@login_required
def get_ai_models(request):
    """Get available AI models"""
    from .ai_agent import AIAgent
    agent = AIAgent(api_key="")  # We don't need API key for getting models list
    models = agent.get_available_models()
    return JsonResponse({'models': models})

def get_openrouter_api_key(user):
    """Get API key from OpenRouter app"""
    try:
        from openrouter_chat.models import UserProfile as OpenRouterProfile
        from openrouter_chat.utils import decrypt_api_key
        
        profile = OpenRouterProfile.objects.get(user=user)
        if profile.api_key_encrypted:
            return decrypt_api_key(profile.api_key_encrypted)
    except:
        pass
    
    return None

@login_required
@require_http_methods(["POST"])
def generate_ai_document(request):
    """Generate a new document using AI"""
    from .ai_agent import AIAgent
    
    data = json.loads(request.body)
    
    # Get parameters
    template_type = data.get('template_type', 'custom')
    topic = data.get('topic', '')
    description = data.get('description', '')
    folder_id = data.get('folder_id')
    model = data.get('model', 'openai/gpt-3.5-turbo')
    
    if not topic or not description:
        return JsonResponse({'error': 'Topic and description are required'}, status=400)
    
    # Get API key
    api_key = get_openrouter_api_key(request.user)
    if not api_key:
        return JsonResponse({
            'error': 'No API key found. Please set your OpenRouter API key in the OpenRouter Chat app.'
        }, status=400)
    
    # Initialize AI Agent
    agent = AIAgent(api_key)
    
    # Generate document
    result = agent.generate_document(
        template_type=template_type,
        topic=topic,
        description=description,
        model=model
    )
    
    if not result['success']:
        return JsonResponse({'error': result.get('error', 'Failed to generate document')}, status=500)
    
    # Create note with generated content
    folder = None
    if folder_id:
        try:
            folder = Folder.objects.get(pk=folder_id, user=request.user)
        except Folder.DoesNotExist:
            pass
    
    # Create the note
    note = Note.objects.create(
        user=request.user,
        title=result['title'],
        content=result['content'],
        folder=folder
    )
    
    # Update word count
    note.update_word_count()
    
    # Add AI-generated tag
    ai_tag, _ = Tag.objects.get_or_create(
        user=request.user,
        name='AI-Generated',
        defaults={'color': '#3F1E5F'}
    )
    note.tags.add(ai_tag)
    
    # Add template-specific tag
    template_tag, _ = Tag.objects.get_or_create(
        user=request.user,
        name=result['template_name'],
        defaults={'color': '#4F2E6F'}
    )
    note.tags.add(template_tag)
    
    # Create initial version
    NoteVersion.objects.create(
        note=note,
        content=note.content,
        version_number=1
    )
    
    return JsonResponse({
        'success': True,
        'note_id': note.id,
        'title': note.title,
        'tokens': result.get('tokens', {}),
        'cost': result.get('cost', 0),
        'model': model
    })

@login_required
@require_http_methods(["POST"])
def enhance_ai_document(request):
    """Enhance an existing document using AI"""
    from .ai_agent import AIAgent
    
    data = json.loads(request.body)
    
    note_id = data.get('note_id')
    instruction = data.get('instruction', '')
    model = data.get('model', 'openai/gpt-3.5-turbo')
    
    if not note_id or not instruction:
        return JsonResponse({'error': 'Note ID and instruction are required'}, status=400)
    
    # Get the note
    try:
        note = Note.objects.get(pk=note_id, user=request.user)
    except Note.DoesNotExist:
        return JsonResponse({'error': 'Note not found'}, status=404)
    
    # Get API key
    api_key = get_openrouter_api_key(request.user)
    if not api_key:
        return JsonResponse({
            'error': 'No API key found. Please set your OpenRouter API key in the OpenRouter Chat app.'
        }, status=400)
    
    # Initialize AI Agent
    agent = AIAgent(api_key)
    
    # Enhance document
    result = agent.enhance_document(
        content=note.content,
        instruction=instruction,
        model=model
    )
    
    if not result['success']:
        return JsonResponse({'error': result.get('error', 'Failed to enhance document')}, status=500)
    
    # Save old version
    last_version = note.versions.first()
    version_number = (last_version.version_number + 1) if last_version else 1
    
    NoteVersion.objects.create(
        note=note,
        content=note.content,
        version_number=version_number
    )
    
    # Update note with enhanced content
    note.content = result['content']
    note.update_word_count()
    note.save()
    
    # Add AI-enhanced tag
    enhanced_tag, _ = Tag.objects.get_or_create(
        user=request.user,
        name='AI-Enhanced',
        defaults={'color': '#5F2E7F'}
    )
    note.tags.add(enhanced_tag)
    
    return JsonResponse({
        'success': True,
        'note_id': note.id,
        'model': model
    })

@login_required
def check_api_key(request):
    """Check if user has API key configured"""
    api_key = get_openrouter_api_key(request.user)
    return JsonResponse({
        'has_api_key': bool(api_key),
        'source': 'openrouter_chat' if api_key else None
    })
