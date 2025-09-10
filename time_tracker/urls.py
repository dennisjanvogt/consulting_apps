from django.urls import path
from . import views

app_name = 'time_tracker'

urlpatterns = [
    # Main view
    path('', views.tracker_view, name='tracker'),
    
    # Client APIs
    path('api/clients/', views.api_clients, name='api_clients'),
    path('api/clients/<int:client_id>/', views.api_client_detail, name='api_client_detail'),
    
    # Project APIs
    path('api/projects/', views.api_projects, name='api_projects'),
    
    # Task APIs
    path('api/tasks/', views.api_tasks, name='api_tasks'),
    
    # Timer APIs
    path('api/timer/start/', views.api_timer_start, name='api_timer_start'),
    path('api/timer/stop/', views.api_timer_stop, name='api_timer_stop'),
    path('api/timer/status/', views.api_timer_status, name='api_timer_status'),
    
    # Time Entry APIs
    path('api/entries/', views.api_time_entries, name='api_time_entries'),
    path('api/entries/<int:entry_id>/', views.api_time_entry_detail, name='api_time_entry_detail'),
    
    # Statistics APIs
    path('api/statistics/', views.api_statistics, name='api_statistics'),
    path('api/timeline/', views.api_timeline, name='api_timeline'),
]