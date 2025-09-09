from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class ChatSession(models.Model):
    """Chat session model"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions')
    title = models.CharField(max_length=255, default='New Chat')
    model = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_sessions'
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.title} - {self.user.username}"

class Message(models.Model):
    """Message model for chat"""
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    model = models.CharField(max_length=100, blank=True, null=True)
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'messages'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."

class SystemPrompt(models.Model):
    """System prompts library"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='system_prompts')
    name = models.CharField(max_length=255)
    content = models.TextField()
    category = models.CharField(max_length=100, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'system_prompts'
        ordering = ['category', 'name']
    
    def __str__(self):
        return self.name

class ModelPreference(models.Model):
    """User preferences for models"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='model_preferences')
    model_name = models.CharField(max_length=100)
    parameters = models.JSONField(default=dict)
    is_favorite = models.BooleanField(default=False)
    last_used = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'model_preferences'
        unique_together = ['user', 'model_name']
    
    def __str__(self):
        return f"{self.user.username} - {self.model_name}"

class UserProfile(models.Model):
    """Extended user profile for API keys"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='openrouter_profile')
    api_key_encrypted = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"Profile: {self.user.username}"
