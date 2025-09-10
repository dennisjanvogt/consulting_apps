from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, FileResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.db.models import Q
import json
import os
import mimetypes
import secrets
import shutil
from datetime import datetime
from .models import StorageFolder, StorageFile, FileShare


@login_required
def storage_view(request):
    """Main storage view"""
    return render(request, 'storage_app/index.html')


@login_required
def api_folders(request):
    """API for folder operations"""
    if request.method == 'GET':
        # Get all folders for the current user
        folders = StorageFolder.objects.filter(user=request.user)
        folders_data = []
        for folder in folders:
            folders_data.append({
                'id': folder.id,
                'name': folder.name,
                'parent_id': folder.parent.id if folder.parent else None,
                'path': folder.get_full_path(),
                'size': folder.get_size(),
                'file_count': folder.get_file_count(),
                'created_at': folder.created_at.isoformat(),
                'updated_at': folder.updated_at.isoformat(),
            })
        return JsonResponse({'folders': folders_data})
    
    elif request.method == 'POST':
        # Create new folder
        data = json.loads(request.body)
        name = data.get('name')
        parent_id = data.get('parent_id')
        
        if not name:
            return JsonResponse({'error': 'Folder name is required'}, status=400)
        
        parent = None
        if parent_id:
            parent = get_object_or_404(StorageFolder, id=parent_id, user=request.user)
        
        # Check if folder with same name exists in same location
        existing = StorageFolder.objects.filter(
            name=name,
            parent=parent,
            user=request.user
        ).exists()
        
        if existing:
            return JsonResponse({'error': 'Folder with this name already exists'}, status=400)
        
        folder = StorageFolder.objects.create(
            name=name,
            parent=parent,
            user=request.user
        )
        
        return JsonResponse({
            'id': folder.id,
            'name': folder.name,
            'parent_id': folder.parent.id if folder.parent else None,
            'path': folder.get_full_path(),
            'created_at': folder.created_at.isoformat(),
        })
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@login_required
def api_folder_detail(request, folder_id):
    """API for single folder operations"""
    folder = get_object_or_404(StorageFolder, id=folder_id, user=request.user)
    
    if request.method == 'DELETE':
        # Delete folder and all its contents
        folder.delete()
        return JsonResponse({'success': True})
    
    elif request.method == 'PUT':
        # Rename or move folder
        data = json.loads(request.body)
        new_name = data.get('name')
        new_parent_id = data.get('parent_id')
        
        if new_name and new_name != folder.name:
            folder.name = new_name
        
        if 'parent_id' in data:
            if new_parent_id:
                new_parent = get_object_or_404(StorageFolder, id=new_parent_id, user=request.user)
                # Prevent moving folder into itself or its children
                current = new_parent
                while current:
                    if current.id == folder.id:
                        return JsonResponse({'error': 'Cannot move folder into itself'}, status=400)
                    current = current.parent
                folder.parent = new_parent
            else:
                folder.parent = None
        
        folder.save()
        
        return JsonResponse({
            'id': folder.id,
            'name': folder.name,
            'parent_id': folder.parent.id if folder.parent else None,
            'path': folder.get_full_path(),
        })
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@login_required
def api_files(request):
    """API for file operations"""
    if request.method == 'GET':
        # Get files, optionally filtered by folder
        folder_id = request.GET.get('folder_id')
        
        if folder_id:
            folder = get_object_or_404(StorageFolder, id=folder_id, user=request.user)
            files = StorageFile.objects.filter(folder=folder, user=request.user)
        else:
            # Get root files (no folder)
            files = StorageFile.objects.filter(folder=None, user=request.user)
        
        files_data = []
        for file in files:
            files_data.append({
                'id': file.id,
                'name': file.name,
                'size': file.size,
                'formatted_size': file.get_formatted_size(),
                'mime_type': file.mime_type,
                'file_type': file.get_file_type(),
                'folder_id': file.folder.id if file.folder else None,
                'url': file.file.url,
                'thumbnail_url': file.thumbnail.url if file.thumbnail else None,
                'created_at': file.created_at.isoformat(),
                'updated_at': file.updated_at.isoformat(),
            })
        
        return JsonResponse({'files': files_data})
    
    elif request.method == 'POST':
        # Handle file upload
        uploaded_file = request.FILES.get('file')
        folder_id = request.POST.get('folder_id')
        
        if not uploaded_file:
            return JsonResponse({'error': 'No file provided'}, status=400)
        
        folder = None
        if folder_id:
            folder = get_object_or_404(StorageFolder, id=folder_id, user=request.user)
        
        # Get MIME type
        mime_type, _ = mimetypes.guess_type(uploaded_file.name)
        if not mime_type:
            mime_type = 'application/octet-stream'
        
        # Create file record
        storage_file = StorageFile.objects.create(
            name=uploaded_file.name,
            file=uploaded_file,
            folder=folder,
            user=request.user,
            size=uploaded_file.size,
            mime_type=mime_type
        )
        
        return JsonResponse({
            'id': storage_file.id,
            'name': storage_file.name,
            'size': storage_file.size,
            'formatted_size': storage_file.get_formatted_size(),
            'mime_type': storage_file.mime_type,
            'file_type': storage_file.get_file_type(),
            'folder_id': storage_file.folder.id if storage_file.folder else None,
            'url': storage_file.file.url,
            'thumbnail_url': storage_file.thumbnail.url if storage_file.thumbnail else None,
            'created_at': storage_file.created_at.isoformat(),
        })
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@login_required
def api_file_detail(request, file_id):
    """API for single file operations"""
    file = get_object_or_404(StorageFile, id=file_id, user=request.user)
    
    if request.method == 'GET':
        # Get file details
        return JsonResponse({
            'id': file.id,
            'name': file.name,
            'size': file.size,
            'formatted_size': file.get_formatted_size(),
            'mime_type': file.mime_type,
            'file_type': file.get_file_type(),
            'folder_id': file.folder.id if file.folder else None,
            'url': file.file.url,
            'thumbnail_url': file.thumbnail.url if file.thumbnail else None,
            'created_at': file.created_at.isoformat(),
            'updated_at': file.updated_at.isoformat(),
        })
    
    elif request.method == 'DELETE':
        # Delete file
        file.delete()
        return JsonResponse({'success': True})
    
    elif request.method == 'PUT':
        # Rename or move file
        data = json.loads(request.body)
        new_name = data.get('name')
        new_folder_id = data.get('folder_id')
        
        if new_name and new_name != file.name:
            file.name = new_name
        
        if 'folder_id' in data:
            if new_folder_id:
                new_folder = get_object_or_404(StorageFolder, id=new_folder_id, user=request.user)
                file.folder = new_folder
            else:
                file.folder = None
        
        file.save()
        
        return JsonResponse({
            'id': file.id,
            'name': file.name,
            'folder_id': file.folder.id if file.folder else None,
        })
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@login_required
def api_file_download(request, file_id):
    """Download a file"""
    file = get_object_or_404(StorageFile, id=file_id, user=request.user)
    
    if not file.file:
        raise Http404("File not found")
    
    response = FileResponse(
        file.file.open('rb'),
        content_type=file.mime_type,
        as_attachment=True,
        filename=file.name
    )
    return response


@login_required
def api_search(request):
    """Search files and folders"""
    query = request.GET.get('q', '')
    
    if not query:
        return JsonResponse({'files': [], 'folders': []})
    
    # Search files
    files = StorageFile.objects.filter(
        Q(name__icontains=query),
        user=request.user
    )[:20]
    
    # Search folders
    folders = StorageFolder.objects.filter(
        Q(name__icontains=query),
        user=request.user
    )[:20]
    
    files_data = []
    for file in files:
        files_data.append({
            'id': file.id,
            'name': file.name,
            'size': file.size,
            'formatted_size': file.get_formatted_size(),
            'mime_type': file.mime_type,
            'file_type': file.get_file_type(),
            'folder_id': file.folder.id if file.folder else None,
            'url': file.file.url,
            'thumbnail_url': file.thumbnail.url if file.thumbnail else None,
        })
    
    folders_data = []
    for folder in folders:
        folders_data.append({
            'id': folder.id,
            'name': folder.name,
            'parent_id': folder.parent.id if folder.parent else None,
            'path': folder.get_full_path(),
        })
    
    return JsonResponse({
        'files': files_data,
        'folders': folders_data
    })


@login_required
def api_storage_stats(request):
    """Get storage statistics for the user"""
    user_files = StorageFile.objects.filter(user=request.user)
    
    total_size = sum(file.size for file in user_files)
    total_files = user_files.count()
    total_folders = StorageFolder.objects.filter(user=request.user).count()
    
    # Get real disk usage statistics
    disk_usage = shutil.disk_usage('/')
    disk_total = disk_usage.total
    disk_used = disk_usage.used
    disk_free = disk_usage.free
    
    # Get size by file type
    size_by_type = {}
    for file in user_files:
        file_type = file.get_file_type()
        if file_type not in size_by_type:
            size_by_type[file_type] = {'size': 0, 'count': 0}
        size_by_type[file_type]['size'] += file.size
        size_by_type[file_type]['count'] += 1
    
    # Format sizes
    def format_size(size):
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} PB"
    
    return JsonResponse({
        'total_size': total_size,
        'formatted_total_size': format_size(total_size),
        'total_files': total_files,
        'total_folders': total_folders,
        'size_by_type': size_by_type,
        'disk_total': disk_total,
        'disk_used': disk_used,
        'disk_free': disk_free,
        'formatted_disk_total': format_size(disk_total),
        'formatted_disk_used': format_size(disk_used),
        'formatted_disk_free': format_size(disk_free),
    })