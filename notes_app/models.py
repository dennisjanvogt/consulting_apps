from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import json

class Folder(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='note_folders')
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    color = models.CharField(max_length=7, default='#3F1E5F')
    icon = models.CharField(max_length=50, default='folder')
    position = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['position', 'name']
        unique_together = ['user', 'parent', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.user.username})"
    
    def get_path(self):
        if self.parent:
            return f"{self.parent.get_path()}/{self.name}"
        return self.name

class Tag(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='note_tags')
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#3F1E5F')
    
    class Meta:
        unique_together = ['user', 'name']
        ordering = ['name']
    
    def __str__(self):
        return self.name

class Note(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    folder = models.ForeignKey(Folder, null=True, blank=True, on_delete=models.SET_NULL, related_name='notes')
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    content_html = models.TextField(blank=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name='notes')
    is_favorite = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    word_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-is_pinned', '-updated_at']
    
    def __str__(self):
        return f"{self.title} ({self.user.username})"
    
    def update_word_count(self):
        self.word_count = len(self.content.split()) if self.content else 0
        self.save()

class NoteVersion(models.Model):
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='versions')
    content = models.TextField()
    version_number = models.IntegerField()
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-version_number']
        unique_together = ['note', 'version_number']
    
    def __str__(self):
        return f"{self.note.title} - v{self.version_number}"

class NoteAttachment(models.Model):
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='notes/attachments/%Y/%m/')
    original_name = models.CharField(max_length=255)
    file_size = models.IntegerField()
    mime_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"{self.original_name} - {self.note.title}"

class SharedNote(models.Model):
    PERMISSION_CHOICES = [
        ('VIEW', 'View Only'),
        ('EDIT', 'Can Edit'),
    ]
    
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='shares')
    shared_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_notes')
    shared_with = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_notes')
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES, default='VIEW')
    share_link = models.CharField(max_length=100, unique=True, null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ['note', 'shared_with']
    
    def __str__(self):
        return f"{self.note.title} shared with {self.shared_with.username}"
