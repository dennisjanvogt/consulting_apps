from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/tasks/board/<str:board_type>/', views.get_tasks, name='get_tasks'),
    path('api/tasks/create/', views.create_task, name='create_task'),
    path('api/tasks/<int:task_id>/update/', views.update_task, name='update_task'),
    path('api/tasks/<int:task_id>/delete/', views.delete_task, name='delete_task'),
    path('api/tasks/<int:task_id>/move/', views.move_task, name='move_task'),
    # AI Assistant URLs
    path('api/ai/check-key/', views.check_api_key, name='check_api_key'),
    path('api/ai/generate-tasks/', views.generate_tasks, name='generate_tasks'),
]