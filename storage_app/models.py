from django.db import models
from django.contrib.auth.models import User
from django.core.validators import FileExtensionValidator
import os
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile


class StorageFolder(models.Model):
    """Folder model for organizing files"""
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.CASCADE,
        related_name='children'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='storage_folders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'storage_folders'
        unique_together = ['name', 'parent', 'user']
        ordering = ['name']
    
    def __str__(self):
        if self.parent:
            return f"{self.parent}/{self.name}"
        return self.name
    
    def get_full_path(self):
        """Get the full path of the folder"""
        if self.parent:
            return f"{self.parent.get_full_path()}/{self.name}"
        return self.name
    
    def get_size(self):
        """Calculate total size of all files in this folder and subfolders"""
        total_size = sum(file.size for file in self.files.all())
        for child in self.children.all():
            total_size += child.get_size()
        return total_size
    
    def get_file_count(self):
        """Get total number of files in this folder and subfolders"""
        count = self.files.count()
        for child in self.children.all():
            count += child.get_file_count()
        return count


class StorageFile(models.Model):
    """File model for storing uploaded files"""
    name = models.CharField(max_length=255)
    file = models.FileField(
        upload_to='storage/%Y/%m/%d/',
        max_length=500
    )
    folder = models.ForeignKey(
        StorageFolder, 
        null=True, 
        blank=True, 
        on_delete=models.CASCADE,
        related_name='files'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='storage_files')
    size = models.BigIntegerField()  # File size in bytes
    mime_type = models.CharField(max_length=100)
    thumbnail = models.ImageField(
        upload_to='thumbnails/', 
        null=True, 
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'storage_files'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        """Override save to set file size and generate thumbnail"""
        if self.file:
            self.size = self.file.size
            
            # Generate thumbnail for images
            if self.is_image():
                self.generate_thumbnail()
        
        super().save(*args, **kwargs)
    
    def is_image(self):
        """Check if file is an image"""
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
        extension = os.path.splitext(self.name)[1].lower()
        return extension in image_extensions
    
    def is_video(self):
        """Check if file is a video"""
        video_extensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv']
        extension = os.path.splitext(self.name)[1].lower()
        return extension in video_extensions
    
    def is_document(self):
        """Check if file is a document"""
        doc_extensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf']
        extension = os.path.splitext(self.name)[1].lower()
        return extension in doc_extensions
    
    def is_code(self):
        """Check if file is a code file"""
        code_extensions = ['.py', '.js', '.html', '.css', '.json', '.xml', '.cpp', '.java', '.php']
        extension = os.path.splitext(self.name)[1].lower()
        return extension in code_extensions
    
    def get_file_type(self):
        """Get the general file type"""
        if self.is_image():
            return 'image'
        elif self.is_video():
            return 'video'
        elif self.is_document():
            return 'document'
        elif self.is_code():
            return 'code'
        else:
            return 'other'
    
    def generate_thumbnail(self):
        """Generate thumbnail for image files"""
        if not self.is_image():
            return
        
        try:
            # Open the image
            img = Image.open(self.file)
            
            # Convert to RGB if necessary
            if img.mode not in ('L', 'RGB'):
                img = img.convert('RGB')
            
            # Create thumbnail
            img.thumbnail((200, 200), Image.Resampling.LANCZOS)
            
            # Save thumbnail to BytesIO
            thumb_io = BytesIO()
            img.save(thumb_io, format='JPEG', quality=85)
            
            # Create a new Django file
            thumbnail_name = f"thumb_{os.path.splitext(self.name)[0]}.jpg"
            self.thumbnail.save(
                thumbnail_name,
                ContentFile(thumb_io.getvalue()),
                save=False
            )
        except Exception as e:
            print(f"Error generating thumbnail: {e}")
    
    def get_formatted_size(self):
        """Return human-readable file size"""
        size = self.size
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} PB"
    
    def delete(self, *args, **kwargs):
        """Override delete to also remove file from storage"""
        # Delete the actual file
        if self.file:
            self.file.delete(save=False)
        
        # Delete thumbnail if exists
        if self.thumbnail:
            self.thumbnail.delete(save=False)
        
        super().delete(*args, **kwargs)


class FileShare(models.Model):
    """Model for sharing files with other users or publicly"""
    file = models.ForeignKey(StorageFile, on_delete=models.CASCADE, related_name='shares')
    shared_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_files')
    shared_with = models.ForeignKey(
        User, 
        null=True, 
        blank=True, 
        on_delete=models.CASCADE, 
        related_name='files_shared_with_me'
    )
    share_token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    is_public = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'file_shares'
        unique_together = ['file', 'shared_with']
    
    def __str__(self):
        if self.shared_with:
            return f"{self.file.name} shared with {self.shared_with.username}"
        return f"{self.file.name} (public share)"