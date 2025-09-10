from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
import datetime


class Client(models.Model):
    """Client/Customer model"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clients')
    name = models.CharField(max_length=200)
    company = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    hourly_rate = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('100.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    color = models.CharField(max_length=7, default='#1E3A5F')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        db_table = 'time_tracker_clients'
    
    def __str__(self):
        return f"{self.company} - {self.name}" if self.company else self.name
    
    def get_total_hours(self):
        """Get total hours worked for this client"""
        total = 0
        for project in self.projects.all():
            total += project.get_total_hours()
        return total
    
    def get_total_revenue(self):
        """Get total revenue for this client"""
        total = Decimal('0.00')
        for project in self.projects.all():
            total += project.get_total_revenue()
        return total


class Project(models.Model):
    """Project model"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('archived', 'Archived'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    hourly_rate = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Leave empty to use client's default rate"
    )
    daily_rate = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Daily rate (8 hours)"
    )
    budget_hours = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    color = models.CharField(max_length=7, default='#3A5F1E')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        db_table = 'time_tracker_projects'
    
    def __str__(self):
        return f"{self.client.name} - {self.name}"
    
    def get_effective_hourly_rate(self):
        """Get the effective hourly rate (project rate or client rate)"""
        return self.hourly_rate or self.client.hourly_rate
    
    def get_total_hours(self):
        """Get total hours worked on this project"""
        total_seconds = 0
        for task in self.tasks.all():
            for entry in task.time_entries.filter(is_deleted=False):
                total_seconds += entry.get_duration_seconds()
        return total_seconds / 3600  # Convert to hours
    
    def get_total_revenue(self):
        """Calculate total revenue for this project"""
        total_hours = self.get_total_hours()
        rate = self.get_effective_hourly_rate()
        return Decimal(str(total_hours)) * rate
    
    def get_budget_percentage(self):
        """Get percentage of budget used"""
        if not self.budget_hours:
            return None
        total_hours = self.get_total_hours()
        return (Decimal(str(total_hours)) / self.budget_hours) * 100


class Task(models.Model):
    """Task/Sub-task model"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_tracker_tasks')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    estimated_hours = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        db_table = 'time_tracker_tasks'
    
    def __str__(self):
        return f"{self.project.name} - {self.name}"
    
    def get_total_hours(self):
        """Get total hours worked on this task"""
        total_seconds = 0
        for entry in self.time_entries.filter(is_deleted=False):
            total_seconds += entry.get_duration_seconds()
        return total_seconds / 3600


class TimeEntry(models.Model):
    """Time entry model"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_entries')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='time_entries')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    description = models.TextField(blank=True)
    is_billable = models.BooleanField(default=True)
    is_billed = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)  # Soft delete
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-start_time']
        db_table = 'time_tracker_entries'
    
    def __str__(self):
        return f"{self.task.name} - {self.start_time.strftime('%Y-%m-%d %H:%M')}"
    
    def get_duration_seconds(self):
        """Get duration in seconds"""
        if not self.end_time:
            # If still running, calculate from now
            end = timezone.now()
        else:
            end = self.end_time
        
        delta = end - self.start_time
        return delta.total_seconds()
    
    def get_duration_hours(self):
        """Get duration in hours"""
        return self.get_duration_seconds() / 3600
    
    def get_duration_formatted(self):
        """Get formatted duration (HH:MM:SS)"""
        seconds = int(self.get_duration_seconds())
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        seconds = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    
    def get_revenue(self):
        """Calculate revenue for this entry"""
        if not self.is_billable:
            return Decimal('0.00')
        
        hours = Decimal(str(self.get_duration_hours()))
        rate = self.task.project.get_effective_hourly_rate()
        return hours * rate
    
    def save(self, *args, **kwargs):
        """Override save to validate times"""
        if self.end_time and self.start_time > self.end_time:
            raise ValueError("End time must be after start time")
        super().save(*args, **kwargs)


class Timer(models.Model):
    """Active timer model (one per user)"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='active_timer')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='active_timers')
    start_time = models.DateTimeField()
    description = models.TextField(blank=True)
    is_running = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'time_tracker_timers'
    
    def __str__(self):
        return f"{self.user.username} - {self.task.name}"
    
    def stop(self):
        """Stop the timer and create a time entry"""
        if not self.is_running:
            return None
        
        # Create time entry
        entry = TimeEntry.objects.create(
            user=self.user,
            task=self.task,
            start_time=self.start_time,
            end_time=timezone.now(),
            description=self.description,
            is_billable=True
        )
        
        # Delete the timer
        self.delete()
        
        return entry
    
    def get_elapsed_time(self):
        """Get elapsed time in seconds"""
        delta = timezone.now() - self.start_time
        return delta.total_seconds()
    
    def get_elapsed_formatted(self):
        """Get formatted elapsed time"""
        seconds = int(self.get_elapsed_time())
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        seconds = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"