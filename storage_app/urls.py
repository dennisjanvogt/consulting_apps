from django.urls import path
from . import views

app_name = 'storage'

urlpatterns = [
    # Main view
    path('', views.storage_view, name='index'),
    
    # API endpoints
    path('api/folders/', views.api_folders, name='api_folders'),
    path('api/folders/<int:folder_id>/', views.api_folder_detail, name='api_folder_detail'),
    path('api/files/', views.api_files, name='api_files'),
    path('api/files/<int:file_id>/', views.api_file_detail, name='api_file_detail'),
    path('api/files/<int:file_id>/download/', views.api_file_download, name='api_file_download'),
    path('api/search/', views.api_search, name='api_search'),
    path('api/stats/', views.api_storage_stats, name='api_stats'),
]