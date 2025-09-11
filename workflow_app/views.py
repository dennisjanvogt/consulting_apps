from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from datetime import timedelta
import json
from .models import WorkflowTemplate, TemplateNode, Workflow, WorkflowItem
from openrouter_chat.models import UserProfile
from openrouter_chat.utils import decrypt_api_key
import requests


@login_required
def index(request):
    return render(request, 'workflow_app/index.html')


@login_required
@require_http_methods(["GET", "POST"])
def templates_list_create(request):
    if request.method == 'GET':
        templates = WorkflowTemplate.objects.filter(user=request.user)
        data = []
        for t in templates:
            data.append({
                'id': t.id,
                'title': t.title,
                'description': t.description,
                'created_at': t.created_at.isoformat(),
            })
        return JsonResponse({'templates': data})
    else:
        body = json.loads(request.body)
        t = WorkflowTemplate.objects.create(
            user=request.user,
            title=body.get('title', 'Neues Template'),
            description=body.get('description', '')
        )
        return JsonResponse({'id': t.id, 'title': t.title, 'description': t.description})


@login_required
@require_http_methods(["GET", "POST"])
def template_nodes(request, template_id):
    template = get_object_or_404(WorkflowTemplate, pk=template_id, user=request.user)
    if request.method == 'GET':
        nodes = TemplateNode.objects.filter(template=template, parent__isnull=True).order_by('order', 'id')
        def serialize(node):
            return {
                'id': node.id,
                'title': node.title,
                'order': node.order,
                'due_offset_days': node.due_offset_days,
                'children': [serialize(c) for c in node.children.all().order_by('order', 'id')]
            }
        return JsonResponse({'nodes': [serialize(n) for n in nodes]})
    else:
        body = json.loads(request.body)
        node = TemplateNode.objects.create(
            template=template,
            title=body['title'],
            parent=TemplateNode.objects.filter(pk=body.get('parent_id')).first() if body.get('parent_id') else None,
            order=body.get('order', 0),
            due_offset_days=body.get('due_offset_days', 0)
        )
        return JsonResponse({'id': node.id})


@login_required
@require_http_methods(["POST"])
def delete_template(request, template_id):
    template = get_object_or_404(WorkflowTemplate, pk=template_id, user=request.user)
    template.delete()
    return JsonResponse({'success': True})


@login_required
@require_http_methods(["GET", "POST"])
def workflows_list_create(request):
    if request.method == 'GET':
        workflows = Workflow.objects.filter(user=request.user)
        data = []
        for wf in workflows:
            data.append({
                'id': wf.id,
                'title': wf.title,
                'due_date': wf.due_date.isoformat(),
                'status': wf.status,
                'template_id': wf.template_id,
            })
        return JsonResponse({'workflows': data})
    else:
        body = json.loads(request.body)
        template = get_object_or_404(WorkflowTemplate, pk=body['template_id'], user=request.user)
        due_date = timezone.datetime.fromisoformat(body['due_date']).date()
        wf = Workflow.objects.create(
            user=request.user,
            template=template,
            title=body.get('title', template.title),
            due_date=due_date
        )
        # Copy nodes into items with due dates
        def copy_node(node, parent_item=None):
            item_due = due_date - timedelta(days=node.due_offset_days) if node.due_offset_days else None
            item = WorkflowItem.objects.create(
                workflow=wf,
                title=node.title,
                parent=parent_item,
                order=node.order,
                due_date=item_due,
                due_offset_days=node.due_offset_days
            )
            for child in node.children.all().order_by('order', 'id'):
                copy_node(child, item)
        for root in template.nodes.filter(parent__isnull=True).order_by('order', 'id'):
            copy_node(root, None)
        return JsonResponse({'id': wf.id})


@login_required
@require_http_methods(["GET"])
def workflow_detail(request, workflow_id):
    wf = get_object_or_404(Workflow, pk=workflow_id, user=request.user)
    roots = wf.items.filter(parent__isnull=True).order_by('order', 'id')
    def serialize(item):
        return {
            'id': item.id,
            'title': item.title,
            'order': item.order,
            'status': item.status,
            'due_date': item.due_date.isoformat() if item.due_date else None,
            'children': [serialize(c) for c in item.children.all().order_by('order', 'id')]
        }
    return JsonResponse({
        'workflow': {
            'id': wf.id,
            'title': wf.title,
            'due_date': wf.due_date.isoformat(),
            'status': wf.status,
        },
        'items': [serialize(r) for r in roots]
    })


@login_required
@require_http_methods(["PATCH"])
def update_item(request, item_id):
    item = get_object_or_404(WorkflowItem, pk=item_id, workflow__user=request.user)
    body = json.loads(request.body)
    if 'title' in body:
        item.title = body['title']
    if 'status' in body:
        item.status = body['status']
    if 'due_date' in body:
        item.due_date = timezone.datetime.fromisoformat(body['due_date']).date() if body['due_date'] else None
    if 'order' in body:
        item.order = body['order']
    item.save()
    return JsonResponse({'success': True})


# ===== AI Agent =====

AGENT_SYSTEM_PROMPT = (
    "You are a helpful assistant that extracts structured workflow templates from a short German or English description. "
    "Return ONLY a compact JSON object following this JSON Schema, with no markdown fences, no extra text.\n"
    "Schema: {\n"
    "  \"template\": {\n"
    "    \"title\": string,\n"
    "    \"description\": string (optional),\n"
    "    \"nodes\": [ Node ]\n"
    "  },\n"
    "  \"workflow\": {\n"
    "    \"title\": string (optional),\n"
    "    \"due_date\": string in YYYY-MM-DD (optional),\n"
    "    \"start\": boolean (default false)\n"
    "  }\n"
    "}\n"
    "Node: { \"title\": string, \"due_offset_days\": integer (optional), \"children\": [Node] (optional) }\n"
    "Guidelines: Titles should be short. If user mentions phases/subtasks/deadlines, map them to nodes with due_offset_days (days before end). "
    "If the user mentions an end date, set workflow.due_date. If they say 'start now', set workflow.start=true."
)


def _get_user_openrouter_key(user):
    try:
        profile = UserProfile.objects.get(user=user)
        key = decrypt_api_key(profile.api_key_encrypted)
        return key
    except UserProfile.DoesNotExist:
        return None


@login_required
def check_api_key(request):
    """Check if user has OpenRouter API key configured"""
    try:
        from openrouter_chat.models import UserProfile as OpenRouterProfile
        
        profile = OpenRouterProfile.objects.filter(user=request.user).first()
        has_key = bool(profile and profile.api_key_encrypted)
        
        return JsonResponse({'has_api_key': has_key})
    except Exception:
        return JsonResponse({'has_api_key': False})

@login_required
@require_http_methods(["POST"])
def agent_parse_workflow(request):
    body = json.loads(request.body)
    prompt = body.get('prompt', '').strip()
    model = body.get('model', 'openai/gpt-4o-mini')
    if not prompt:
        return JsonResponse({'error': 'prompt is required'}, status=400)

    api_key = _get_user_openrouter_key(request.user)
    if not api_key:
        return JsonResponse({'error': 'Bitte OpenRouter API Key in den Einstellungen hinterlegen.'}, status=400)

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }
    messages = [
        { 'role': 'system', 'content': AGENT_SYSTEM_PROMPT },
        { 'role': 'user', 'content': prompt }
    ]
    try:
        resp = requests.post('https://openrouter.ai/api/v1/chat/completions', headers=headers, json={
            'model': model,
            'messages': messages,
            'temperature': 0.2,
        }, timeout=40)
    except requests.exceptions.RequestException as e:
        return JsonResponse({'error': f'OpenRouter Anfrage fehlgeschlagen: {str(e)}'}, status=502)

    if resp.status_code != 200:
        try:
            data = resp.json()
            msg = data.get('error', {}).get('message', resp.text)
        except:
            msg = resp.text
        return JsonResponse({'error': f'OpenRouter Fehler: {resp.status_code} {msg[:200]}'}, status=400)

    data = resp.json()
    content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
    # Attempt to parse JSON from content
    parsed = None
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        # try to extract first {...} block
        import re
        m = re.search(r"\{[\s\S]*\}", content)
        if m:
            try:
                parsed = json.loads(m.group(0))
            except:
                pass
    if not parsed or 'template' not in parsed or 'nodes' not in parsed.get('template', {}):
        return JsonResponse({'error': 'Antwort konnte nicht als gültiges JSON-Template erkannt werden.', 'raw': content}, status=400)

    # Minimal validation and defaults
    tpl = parsed['template']
    tpl.setdefault('description', '')
    for node in tpl.get('nodes', []):
        _normalize_node(node)

    # Extract usage and compute cost
    usage = data.get('usage', {}) or {}
    input_tokens = usage.get('prompt_tokens', 0)
    output_tokens = usage.get('completion_tokens', 0)

    # Model pricing per 1M tokens (approx, aligned with OpenRouter mapping used elsewhere)
    model_pricing = {
        'openai/gpt-3.5-turbo': {'input': 0.5, 'output': 1.5},
        'openai/gpt-3.5-turbo-16k': {'input': 3.0, 'output': 4.0},
        'openai/gpt-4': {'input': 30.0, 'output': 60.0},
        'openai/gpt-4-turbo': {'input': 10.0, 'output': 30.0},
        'openai/gpt-4o': {'input': 5.0, 'output': 15.0},
        'openai/gpt-4o-mini': {'input': 0.15, 'output': 0.6},
        'anthropic/claude-3-opus': {'input': 15.0, 'output': 75.0},
        'anthropic/claude-3-sonnet': {'input': 3.0, 'output': 15.0},
        'anthropic/claude-3-haiku': {'input': 0.25, 'output': 1.25},
        'anthropic/claude-3.5-sonnet': {'input': 3.0, 'output': 15.0},
        'google/gemini-pro': {'input': 0.125, 'output': 0.375},
        'google/gemini-pro-1.5': {'input': 2.5, 'output': 7.5},
        'meta-llama/llama-3-70b-instruct': {'input': 0.8, 'output': 0.8},
        'meta-llama/llama-3-8b-instruct': {'input': 0.1, 'output': 0.1},
        'mistralai/mixtral-8x7b-instruct': {'input': 0.6, 'output': 0.6},
        'openai/gpt-oss-120b': {'input': 0.0, 'output': 0.0},
    }
    pricing = model_pricing.get(model, model_pricing.get('openai/gpt-3.5-turbo'))
    input_cost = (input_tokens * pricing['input']) / 1_000_000
    output_cost = (output_tokens * pricing['output']) / 1_000_000
    total_cost = input_cost + output_cost

    return JsonResponse({
        'parsed': parsed,
        'usage': {
            'model': model,
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'cost_usd': float(total_cost)
        }
    })


def _normalize_node(node):
    node['title'] = str(node.get('title', '')).strip() or 'Schritt'
    if 'due_offset_days' in node:
        try:
            node['due_offset_days'] = int(node['due_offset_days'])
        except:
            node['due_offset_days'] = 0
    else:
        node['due_offset_days'] = 0
    children = node.get('children', []) or []
    node['children'] = children
    for c in children:
        _normalize_node(c)


@login_required
@require_http_methods(["POST"])
def agent_create_workflow(request):
    body = json.loads(request.body)
    parsed = body.get('parsed')
    if not parsed or 'template' not in parsed:
        return JsonResponse({'error': 'parsed.template fehlt'}, status=400)
    tpl = parsed['template']
    tpl_title = tpl.get('title') or 'Neues Template'
    tpl_desc = tpl.get('description', '')

    # Create template
    template = WorkflowTemplate.objects.create(user=request.user, title=tpl_title, description=tpl_desc)

    def create_nodes(nodes, parent=None, order_base=0):
        for idx, n in enumerate(nodes):
            node = TemplateNode.objects.create(
                template=template,
                title=n.get('title', 'Schritt'),
                parent=parent,
                order=order_base + idx,
                due_offset_days=n.get('due_offset_days', 0)
            )
            create_nodes(n.get('children', []) or [], node, 0)

    create_nodes(tpl.get('nodes', []), None, 0)

    created = {'template_id': template.id}

    # Optionally create workflow
    wf_cfg = parsed.get('workflow') or {}
    if wf_cfg.get('start') or wf_cfg.get('due_date'):
        try:
            due_date = None
            if wf_cfg.get('due_date'):
                due_date = timezone.datetime.fromisoformat(wf_cfg['due_date']).date()
            else:
                # default to today + 14 days
                due_date = (timezone.now() + timedelta(days=14)).date()
        except Exception:
            return JsonResponse({'error': 'Ungültiges due_date Format. Erwartet YYYY-MM-DD.'}, status=400)

        title = wf_cfg.get('title') or tpl_title
        wf = Workflow.objects.create(user=request.user, template=template, title=title, due_date=due_date)

        # Copy template nodes to items
        def copy_node(node, parent_item=None):
            item_due = due_date - timedelta(days=node.due_offset_days) if node.due_offset_days else None
            item = WorkflowItem.objects.create(
                workflow=wf,
                title=node.title,
                parent=parent_item,
                order=node.order,
                due_date=item_due,
                due_offset_days=node.due_offset_days
            )
            for child in node.children.all().order_by('order', 'id'):
                copy_node(child, item)
        for root in template.nodes.filter(parent__isnull=True).order_by('order', 'id'):
            copy_node(root, None)
        created['workflow_id'] = wf.id

    return JsonResponse({'created': created})
