class WorkflowApp {
  constructor() {
    this.currentTemplate = null;
    this.templates = [];
    this.workflows = [];
    this.init();
  }

  init() {
    this.bindTabs();
    this.bindModals();
    document.getElementById('newTemplateBtn').addEventListener('click', () => this.showModal('templateModal'));
    document.getElementById('saveTemplateBtn').addEventListener('click', () => this.saveTemplate());
    document.getElementById('addMainBtn').addEventListener('click', () => this.addMainNode());
    document.getElementById('reloadWorkflowsBtn').addEventListener('click', () => this.loadWorkflows());
    // Agent
    const agentBtn = document.getElementById('agentBtn');
    if (agentBtn) agentBtn.addEventListener('click', () => this.openAgent());
    const agentGen = document.getElementById('agentGenerateBtn');
    if (agentGen) agentGen.addEventListener('click', () => this.generateWithAgent());
    const agentCreate = document.getElementById('agentCreateBtn');
    if (agentCreate) agentCreate.addEventListener('click', () => this.createFromAgent());
    this.loadTemplates();
    this.loadWorkflows();
  }

  bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
      });
    });
  }

  openAgent() {
    document.getElementById('agentPrompt').value = '';
    document.getElementById('agentPreview').classList.add('hidden');
    this.loadAgentModels();
    this.showModal('agentModal');
  }

  async generateWithAgent() {
    const prompt = document.getElementById('agentPrompt').value.trim();
    if (!prompt) return;
    const model = document.getElementById('agentModelSelect').value || localStorage.getItem('agentModel') || 'openai/gpt-4-turbo-preview';
    localStorage.setItem('agentModel', model);
    const btn = document.getElementById('agentGenerateBtn');
    btn.disabled = true;
    const loader = document.getElementById('agentLoading');
    loader.classList.remove('hidden');
    try {
      const res = await this.api('/workflow/api/agent/parse/', { method: 'POST', body: JSON.stringify({ prompt, model }) });
      this.agentParsed = res.parsed;
      document.getElementById('agentPreviewJson').textContent = JSON.stringify(this.agentParsed, null, 2);
      document.getElementById('agentPreview').classList.remove('hidden');
      if (res.usage) {
        const usd = parseFloat(res.usage.cost_usd || 0);
        const inTok = res.usage.input_tokens ?? 0;
        const outTok = res.usage.output_tokens ?? 0;
        document.getElementById('agentCostInfo').textContent = `Modell: ${res.usage.model} • Tokens: in ${inTok}, out ${outTok} • Kosten ca.: $${usd.toFixed(6)}`;
      } else {
        document.getElementById('agentCostInfo').textContent = '';
      }
    } catch (e) {
      alert('Fehler bei AI-Vorschlag: ' + e.message);
    } finally {
      btn.disabled = false;
      loader.classList.add('hidden');
    }
  }

  async loadAgentModels() {
    try {
      // Check for API key first
      await this.checkApiKey();
      
      const grid = document.getElementById('modelSelectionGrid');
      if (!grid) return;
      
      // Define AI models with pricing
      const models = [
        {
          id: 'openai/gpt-4-turbo-preview',
          name: 'GPT-4 Turbo',
          provider: 'OpenAI',
          description: 'Beste Wahl für komplexe Workflows',
          context: 128000,
          pricing: { input: 10.0, output: 30.0 },
          speed: 'medium',
          quality: 'excellent',
          recommended: true
        },
        {
          id: 'openai/gpt-4',
          name: 'GPT-4',
          provider: 'OpenAI',
          description: 'Hochwertige Workflow-Generierung',
          context: 8192,
          pricing: { input: 30.0, output: 60.0 },
          speed: 'slow',
          quality: 'excellent'
        },
        {
          id: 'openai/gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'OpenAI',
          description: 'Schnell und kostengünstig',
          context: 16385,
          pricing: { input: 0.5, output: 1.5 },
          speed: 'fast',
          quality: 'good',
          budget: true
        },
        {
          id: 'anthropic/claude-3-opus',
          name: 'Claude 3 Opus',
          provider: 'Anthropic',
          description: 'Exzellent für detaillierte Workflows',
          context: 200000,
          pricing: { input: 15.0, output: 75.0 },
          speed: 'medium',
          quality: 'excellent'
        },
        {
          id: 'anthropic/claude-3-sonnet',
          name: 'Claude 3 Sonnet',
          provider: 'Anthropic',
          description: 'Ausgewogene Leistung',
          context: 200000,
          pricing: { input: 3.0, output: 15.0 },
          speed: 'fast',
          quality: 'very_good'
        },
        {
          id: 'google/gemini-pro',
          name: 'Gemini Pro',
          provider: 'Google',
          description: 'Googles fortschrittliches Modell',
          context: 32768,
          pricing: { input: 1.0, output: 2.0 },
          speed: 'fast',
          quality: 'very_good'
        },
        {
          id: 'meta-llama/llama-3-70b-instruct',
          name: 'Llama 3 70B',
          provider: 'Meta',
          description: 'Open Source Alternative',
          context: 8192,
          pricing: { input: 0.8, output: 0.8 },
          speed: 'medium',
          quality: 'good',
          open_source: true
        },
        {
          id: 'openai/gpt-4o-mini',
          name: 'GPT-4o Mini',
          provider: 'OpenAI',
          description: 'Kompakt und effizient',
          context: 128000,
          pricing: { input: 0.15, output: 0.6 },
          speed: 'fast',
          quality: 'good',
          budget: true
        }
      ];
      
      this.renderModelCards(models);
      
      // Set default selection
      const saved = localStorage.getItem('agentModel');
      const defaultModel = saved || 'openai/gpt-4-turbo-preview';
      document.getElementById('agentModelSelect').value = defaultModel;
      
      // Select the default card
      const defaultCard = grid.querySelector(`[data-model-id="${defaultModel}"]`);
      if (defaultCard) {
        defaultCard.classList.add('selected');
      }
    } catch (e) {
      console.warn('Konnte Modellliste nicht laden:', e);
    }
  }
  
  renderModelCards(models) {
    const grid = document.getElementById('modelSelectionGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    models.forEach(model => {
      const card = document.createElement('div');
      card.className = 'model-card';
      card.setAttribute('data-model-id', model.id);
      
      // Add special classes
      if (model.recommended) card.classList.add('recommended');
      if (model.budget) card.classList.add('budget');
      
      // Create quality indicator
      const qualityDots = this.getQualityIndicator(model.quality);
      
      // Create speed indicator
      const speedBars = this.getSpeedIndicator(model.speed);
      
      card.innerHTML = `
        <div class="model-header">
          <span class="model-name">${model.name}</span>
          <span class="model-provider">${model.provider}</span>
        </div>
        <div class="model-description">${model.description}</div>
        <div class="model-specs">
          <div class="model-spec">
            <span>Context: ${this.formatContext(model.context)}</span>
          </div>
          <div class="model-spec">
            ${qualityDots}
          </div>
          <div class="model-spec">
            ${speedBars}
          </div>
        </div>
        <div class="model-pricing">
          <div class="price-item">
            <span class="price-label">Input</span>
            <span class="price-value">$${model.pricing.input}<span class="price-unit">/1M</span></span>
          </div>
          <div class="price-item">
            <span class="price-label">Output</span>
            <span class="price-value">$${model.pricing.output}<span class="price-unit">/1M</span></span>
          </div>
          <div class="price-item">
            <span class="price-label">~Workflow</span>
            <span class="price-value">$${this.calculateWorkflowCost(model.pricing)}</span>
          </div>
        </div>
      `;
      
      card.addEventListener('click', () => this.selectModel(model.id, card));
      grid.appendChild(card);
    });
  }
  
  formatContext(tokens) {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return `${tokens}`;
  }
  
  getQualityIndicator(quality) {
    const levels = {
      'excellent': 5,
      'very_good': 4,
      'good': 3,
      'fair': 2,
      'basic': 1
    };
    
    const dots = levels[quality] || 3;
    let html = '<span class="quality-indicator" title="Qualität">';
    
    for (let i = 0; i < 5; i++) {
      html += `<span class="quality-dot ${i < dots ? 'filled' : ''}"></span>`;
    }
    
    html += '</span>';
    return html;
  }
  
  getSpeedIndicator(speed) {
    const speedClass = speed || 'medium';
    const label = speed === 'fast' ? '⚡ Schnell' : speed === 'slow' ? '🐢 Langsam' : '⏱ Mittel';
    
    return `
      <span class="speed-indicator ${speedClass}" title="${label}">
        <span class="speed-bar"></span>
        <span class="speed-bar"></span>
        <span class="speed-bar"></span>
      </span>
    `;
  }
  
  calculateWorkflowCost(pricing) {
    // Assume 800 input tokens and 2000 output tokens for a typical workflow
    const inputCost = (800 * pricing.input) / 1000000;
    const outputCost = (2000 * pricing.output) / 1000000;
    const total = inputCost + outputCost;
    
    if (total < 0.01) {
      return total.toFixed(4);
    } else if (total < 0.1) {
      return total.toFixed(3);
    } else {
      return total.toFixed(2);
    }
  }
  
  selectModel(modelId, cardElement) {
    // Update hidden input
    document.getElementById('agentModelSelect').value = modelId;
    localStorage.setItem('agentModel', modelId);
    
    // Update visual selection
    document.querySelectorAll('.model-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    if (cardElement) {
      cardElement.classList.add('selected');
    }
  }
  
  async checkApiKey() {
    try {
      const response = await fetch('/workflow/api/check-key/', {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const hasApiKey = data.has_api_key;
        
        const warning = document.getElementById('aiWarning');
        const generateBtn = document.getElementById('agentGenerateBtn');
        
        if (!hasApiKey) {
          if (warning) warning.style.display = 'flex';
          if (generateBtn) generateBtn.disabled = true;
        } else {
          if (warning) warning.style.display = 'none';
          if (generateBtn) generateBtn.disabled = false;
        }
        
        return hasApiKey;
      }
    } catch (error) {
      console.error('Error checking API key:', error);
      return false;
    }
  }

  async createFromAgent() {
    if (!this.agentParsed) return;
    const btn = document.getElementById('agentCreateBtn');
    btn.disabled = true;
    try {
      const res = await this.api('/workflow/api/agent/create/', { method: 'POST', body: JSON.stringify({ parsed: this.agentParsed }) });
      // Close modal and reload lists
      document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
      await this.loadTemplates();
      await this.loadWorkflows();
      if (res.created && res.created.workflow_id) {
        this.openWorkflow(res.created.workflow_id);
        document.querySelector(".tab-btn[data-tab='workflows']").click();
      }
    } catch (e) {
      alert('Fehler beim Anlegen: ' + e.message);
    } finally {
      btn.disabled = false;
    }
  }

  bindModals() {
    document.querySelectorAll('[data-modal-close], .modal').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-modal-close') || e.target.classList.contains('modal')) {
          document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        }
      });
    });
  }

  showModal(id) {
    document.getElementById(id).classList.add('active');
  }

  async api(url, options = {}) {
    const opts = {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken
      },
      credentials: 'same-origin',
      ...options
    };
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error('Request failed');
    return await res.json();
  }

  async loadTemplates() {
    const data = await this.api('/workflow/api/templates/');
    this.templates = data.templates;
    const list = document.getElementById('templatesList');
    if (this.templates.length === 0) {
      list.innerHTML = '<div class="card"><h3>Keine Templates</h3><p class="muted">Lege ein neues Template an.</p></div>';
      return;
    }
    list.innerHTML = this.templates.map(t => `
      <div class="card">
        <h3>${this.escape(t.title)}</h3>
        <p class="muted">${this.escape(t.description || '')}</p>
        <div class="actions">
          <button class="btn" onclick="workflowApp.editTemplate(${t.id})">Bearbeiten</button>
          <button class="btn btn-primary" onclick="workflowApp.startWorkflowPrompt(${t.id})">Starten</button>
          <button class="btn btn-secondary" onclick="workflowApp.deleteTemplate(${t.id})">Löschen</button>
        </div>
      </div>
    `).join('');
  }

  async saveTemplate() {
    const title = document.getElementById('tplTitle').value.trim();
    const description = document.getElementById('tplDesc').value.trim();
    if (!title) return;
    const tpl = await this.api('/workflow/api/templates/', { method: 'POST', body: JSON.stringify({ title, description }) });
    this.currentTemplate = tpl.id;
    await this.loadTemplates();
    // After create, allow adding nodes directly
    await this.editTemplate(tpl.id);
  }

  async editTemplate(templateId) {
    this.currentTemplate = templateId;
    const data = await this.api(`/workflow/api/templates/${templateId}/nodes/`);
    const editor = document.getElementById('nodesEditor');
    editor.innerHTML = '';
    const renderNode = (node, container) => {
      const el = document.createElement('div');
      el.className = 'node';
      el.innerHTML = `
        <div class="title">${this.escape(node.title)}</div>
        <small>Zwischenfrist: ${node.due_offset_days} Tage</small>
        <div class="subnodes"></div>
        <div class="form-row">
          <input type="text" class="input sub-title" placeholder="Unterpunkt">
          <input type="number" class="input sub-offset" placeholder="Zwischenfrist (Tage)">
          <button class="btn add-sub">Hinzufügen</button>
        </div>
      `;
      container.appendChild(el);
      const subContainer = el.querySelector('.subnodes');
      node.children.forEach(child => renderNode(child, subContainer));
      el.querySelector('.add-sub').addEventListener('click', async () => {
        const title = el.querySelector('.sub-title').value.trim();
        const offset = parseInt(el.querySelector('.sub-offset').value || '0', 10);
        if (!title) return;
        await this.api(`/workflow/api/templates/${this.currentTemplate}/nodes/`, {
          method: 'POST',
          body: JSON.stringify({ title, parent_id: node.id, due_offset_days: offset })
        });
        this.editTemplate(this.currentTemplate);
      });
    };

    const column = document.createElement('div');
    column.className = 'nodes-column';
    editor.appendChild(column);
    data.nodes.forEach(n => renderNode(n, column));
    this.showModal('templateModal');
  }

  async addMainNode() {
    if (!this.currentTemplate) return;
    const title = document.getElementById('newMainTitle').value.trim();
    const offset = parseInt(document.getElementById('newMainOffset').value || '0', 10);
    if (!title) return;
    await this.api(`/workflow/api/templates/${this.currentTemplate}/nodes/`, {
      method: 'POST',
      body: JSON.stringify({ title, due_offset_days: offset })
    });
    document.getElementById('newMainTitle').value = '';
    document.getElementById('newMainOffset').value = '';
    this.editTemplate(this.currentTemplate);
  }

  async deleteTemplate(id) {
    if (!confirm('Template wirklich löschen?')) return;
    await this.api(`/workflow/api/templates/${id}/delete/`, { method: 'POST' });
    this.loadTemplates();
  }

  startWorkflowPrompt(templateId) {
    this.toStartTemplate = templateId;
    const tpl = this.templates.find(t => t.id === templateId);
    document.getElementById('wfTitle').value = tpl ? tpl.title : '';
    document.getElementById('wfDue').value = '';
    this.showModal('startModal');
    document.getElementById('confirmStartBtn').onclick = () => this.startWorkflow();
  }

  async startWorkflow() {
    const title = document.getElementById('wfTitle').value.trim();
    const due = document.getElementById('wfDue').value;
    if (!due) return;
    await this.api('/workflow/api/workflows/', {
      method: 'POST',
      body: JSON.stringify({ template_id: this.toStartTemplate, title, due_date: due })
    });
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    this.loadWorkflows();
    // switch to workflows tab
    document.querySelector(".tab-btn[data-tab='workflows']").click();
  }

  async loadWorkflows() {
    const data = await this.api('/workflow/api/workflows/');
    this.workflows = data.workflows;
    const list = document.getElementById('workflowsList');
    if (this.workflows.length === 0) {
      list.innerHTML = '<div class="card"><h3>Keine Workflows</h3><p class="muted">Starte einen Workflow aus einem Template.</p></div>';
      return;
    }
    list.innerHTML = this.workflows.map(w => `
      <div class="card">
        <h3>${this.escape(w.title)}</h3>
        <p class="muted">Endfrist: ${this.escape(w.due_date)}</p>
        <div class="actions">
          <button class="btn btn-primary" onclick="workflowApp.openWorkflow(${w.id})">Öffnen</button>
        </div>
      </div>
    `).join('');
  }

  async openWorkflow(id) {
    const data = await this.api(`/workflow/api/workflows/${id}/`);
    const wrap = document.getElementById('workflowDetail');
    const renderItem = (item) => {
      const due = item.due_date ? ` (Fällig: ${item.due_date})` : '';
      return `
        <div class="wf-item">
          <div>
            <strong>${this.escape(item.title)}</strong>${due}
          </div>
          <div class="actions">
            <select onchange="workflowApp.updateItem(${item.id}, {status: this.value})">
              <option value="TODO" ${item.status==='TODO'?'selected':''}>To Do</option>
              <option value="IN_PROGRESS" ${item.status==='IN_PROGRESS'?'selected':''}>In Progress</option>
              <option value="DONE" ${item.status==='DONE'?'selected':''}>Done</option>
            </select>
            <input type="date" value="${item.due_date || ''}" onchange="workflowApp.updateItem(${item.id}, {due_date: this.value||null})" />
          </div>
          ${item.children && item.children.length ? `<div class="wf-children">${item.children.map(renderItem).join('')}</div>` : ''}
        </div>
      `;
    };
    wrap.innerHTML = `
      <div class="card">
        <h3>${this.escape(data.workflow.title)}</h3>
        <p class="muted">Endfrist: ${this.escape(data.workflow.due_date)}</p>
        ${data.items.map(renderItem).join('')}
      </div>
    `;
    wrap.classList.remove('hidden');
  }

  async updateItem(id, patch) {
    await this.api(`/workflow/api/items/${id}/update/`, { method: 'PATCH', body: JSON.stringify(patch) });
  }

  escape(text) {
    const d = document.createElement('div');
    d.textContent = text ?? '';
    return d.innerHTML;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.workflowApp = new WorkflowApp();
});
