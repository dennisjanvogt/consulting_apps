from django.db import models
from django.conf import settings
from django.utils import timezone


class WorkflowTemplate(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workflow_templates')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class TemplateNode(models.Model):
    template = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE, related_name='nodes')
    title = models.CharField(max_length=200)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    order = models.IntegerField(default=0)
    # Days before workflow due date when this item should be completed (Zwischenfrist)
    due_offset_days = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.title


class Workflow(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('DONE', 'Done'),
        ('CANCELLED', 'Cancelled'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workflows')
    template = models.ForeignKey(WorkflowTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='instances')
    title = models.CharField(max_length=200)
    due_date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['status', 'due_date', '-created_at']

    def __str__(self):
        return self.title


class WorkflowItem(models.Model):
    STATUS_CHOICES = (
        ('TODO', 'To Do'),
        ('IN_PROGRESS', 'In Progress'),
        ('DONE', 'Done'),
    )
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name='items')
    title = models.CharField(max_length=200)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    order = models.IntegerField(default=0)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='TODO')
    due_date = models.DateField(null=True, blank=True)
    # Original template offset for reference
    due_offset_days = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.title

