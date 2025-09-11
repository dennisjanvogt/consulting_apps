from django.urls import path
from . import views

urlpatterns = [
    # Main app
    path('', views.index, name='notes_index'),
    
    # Folders API
    path('api/folders/', views.get_folders, name='get_folders'),
    path('api/folders/create/', views.create_folder, name='create_folder'),
    path('api/folders/<int:folder_id>/update/', views.update_folder, name='update_folder'),
    path('api/folders/<int:folder_id>/delete/', views.delete_folder, name='delete_folder'),
    
    # Notes API
    path('api/notes/', views.get_notes, name='get_notes'),
    path('api/notes/<int:note_id>/', views.get_note, name='get_note'),
    path('api/notes/create/', views.create_note, name='create_note'),
    path('api/notes/<int:note_id>/update/', views.update_note, name='update_note'),
    path('api/notes/<int:note_id>/delete/', views.delete_note, name='delete_note'),
    path('api/notes/<int:note_id>/move/', views.move_note, name='move_note'),
    path('api/notes/<int:note_id>/export/', views.export_note, name='export_note'),
    
    # Search & Tags
    path('api/search/', views.search_notes, name='search_notes'),
    path('api/tags/', views.get_tags, name='get_tags'),
    path('api/tags/create/', views.create_tag, name='create_tag'),
    
    # AI Agent
    path('api/ai/templates/', views.get_ai_templates, name='get_ai_templates'),
    path('api/ai/models/', views.get_ai_models, name='get_ai_models'),
    path('api/ai/generate/', views.generate_ai_document, name='generate_ai_document'),
    path('api/ai/enhance/', views.enhance_ai_document, name='enhance_ai_document'),
    path('api/ai/check-key/', views.check_api_key, name='check_api_key'),
]