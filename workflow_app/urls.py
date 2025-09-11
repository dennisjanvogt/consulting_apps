from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='workflow_index'),
    # Templates
    path('api/templates/', views.templates_list_create, name='wf_templates'),
    path('api/templates/<int:template_id>/nodes/', views.template_nodes, name='wf_template_nodes'),
    path('api/templates/<int:template_id>/delete/', views.delete_template, name='wf_template_delete'),
    # Workflows
    path('api/workflows/', views.workflows_list_create, name='wf_workflows'),
    path('api/workflows/<int:workflow_id>/', views.workflow_detail, name='wf_workflow_detail'),
    path('api/items/<int:item_id>/update/', views.update_item, name='wf_item_update'),
    # AI Agent
    path('api/check-key/', views.check_api_key, name='wf_check_api_key'),
    path('api/agent/parse/', views.agent_parse_workflow, name='wf_agent_parse'),
    path('api/agent/create/', views.agent_create_workflow, name='wf_agent_create'),
]
