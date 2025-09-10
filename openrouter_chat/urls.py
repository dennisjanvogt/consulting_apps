from django.urls import path
from . import views

app_name = 'openrouter_chat'

urlpatterns = [
    path('', views.chat_view, name='chat'),
    # Authentication is now handled centrally by authentication app
    
    # API endpoints
    path('api/sessions/', views.get_sessions, name='get_sessions'),
    path('api/sessions/create/', views.create_session, name='create_session'),
    path('api/sessions/<int:session_id>/messages/', views.get_messages, name='get_messages'),
    path('api/sessions/<int:session_id>/delete/', views.delete_session, name='delete_session'),
    path('api/chat/send/', views.send_message, name='send_message'),
    path('api/settings/api-key/', views.save_api_key, name='save_api_key'),
    path('api/models/', views.get_models, name='get_models'),
]