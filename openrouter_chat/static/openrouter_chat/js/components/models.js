class ModelsManager {
  constructor() {
    this.models = [];
    this.filteredModels = [];
    this.currentModel = Storage.getCurrentModel();
    this.parameters = Storage.getModelParameters();
    this.filters = {
      search: '',
      freeOnly: false,
      visionOnly: false,
      voiceOnly: false,
      premiumOnly: false
    };
  }
  
  async showModal() {
    try {
      const response = await API.getModels();
      this.models = response.models;
      this.filteredModels = [...this.models];
      this.filters = {
        search: '',
        freeOnly: false,
        visionOnly: false,
        voiceOnly: false,
        premiumOnly: false
      };
      
      Modal.show({
        title: 'Select Model',
        size: 'lg',
        content: this.renderModelSelection(),
        buttons: [
          {
            text: 'Cancel',
            onClick: () => Modal.close()
          },
          {
            text: 'Select',
            className: 'btn-primary',
            onClick: () => {
              const selected = document.querySelector('.model-card.selected');
              if (selected) {
                const modelId = selected.dataset.modelId;
                this.selectModel(modelId);
                Modal.close();
              }
            }
          }
        ]
      });
      
      this.setupModelCardEvents();
      this.setupFilterEvents();
    } catch (error) {
      console.error('Failed to load models:', error);
      alert('Failed to load models. Please check your API key.');
    }
  }
  
  renderModelSelection() {
    const filterSection = `
      <div class="model-filters">
        <div class="form-group">
          <input type="text" id="modelSearch" placeholder="Search models..." 
                 class="parameter-input" value="${this.filters.search}">
        </div>
        
        <div class="filter-toggles">
          <div class="filter-toggle">
            <label class="toggle-switch">
              <input type="checkbox" id="freeOnlyFilter" ${this.filters.freeOnly ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <label for="freeOnlyFilter" class="filter-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>
              </svg>
              Free Models
            </label>
          </div>
          
          <div class="filter-toggle">
            <label class="toggle-switch">
              <input type="checkbox" id="visionOnlyFilter" ${this.filters.visionOnly ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <label for="visionOnlyFilter" class="filter-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              Vision Support
            </label>
          </div>
          
          <div class="filter-toggle">
            <label class="toggle-switch">
              <input type="checkbox" id="voiceOnlyFilter" ${this.filters.voiceOnly ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <label for="voiceOnlyFilter" class="filter-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"></path>
                <path d="M19 10v2a7 7 0 01-14 0v-2"></path>
              </svg>
              Voice/Audio
            </label>
          </div>
          
          <div class="filter-toggle">
            <label class="toggle-switch">
              <input type="checkbox" id="premiumOnlyFilter" ${this.filters.premiumOnly ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <label for="premiumOnlyFilter" class="filter-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              Premium (OpenAI, Claude, Gemini, Grok)
            </label>
          </div>
        </div>
      </div>
    `;
    
    const modelCards = this.filteredModels.map(model => `
      <div class="model-card ${model.id === this.currentModel ? 'selected' : ''}" 
           data-model-id="${model.id}">
        ${model.is_favorite ? '<span class="model-favorite">★</span>' : ''}
        <div class="model-name">${model.id}</div>
        <div class="model-provider">${model.name || 'Provider'}</div>
        
        <div class="model-features">
          ${model.context_length ? `<span class="model-feature">Context: ${model.context_length}</span>` : ''}
          ${model.capabilities?.vision ? '<span class="model-feature">Vision</span>' : ''}
          ${model.capabilities?.function_calling ? '<span class="model-feature">Functions</span>' : ''}
        </div>
        
        <div class="model-pricing">
          <div class="model-price">
            <span class="model-price-label">Input</span>
            <span class="model-price-value">$${this.formatPrice(model.pricing?.prompt, model.id)}/1K</span>
          </div>
          <div class="model-price">
            <span class="model-price-label">Output</span>
            <span class="model-price-value">$${this.formatPrice(model.pricing?.completion, model.id)}/1K</span>
          </div>
        </div>
      </div>
    `).join('');
    
    return filterSection + '<div class="models-grid">' + modelCards + '</div>';
  }
  
  formatPrice(price, modelId) {
    // Check if it's a free model by ID
    if (modelId && (modelId.includes(':free') || modelId.includes('/free'))) {
      return '0.000000';
    }
    
    if (!price && price !== 0) return '0.000000';
    
    // API returns price as string in dollars per token
    // Convert to price per 1K tokens
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numPrice) || numPrice === 0) {
      return '0.000000';
    }
    
    // Convert from per-token to per-1K-tokens (multiply by 1000)
    return (numPrice * 1000).toFixed(6);
  }
  
  applyFilters() {
    this.filteredModels = this.models.filter(model => {
      // Search filter
      if (this.filters.search && !model.id.toLowerCase().includes(this.filters.search.toLowerCase())) {
        return false;
      }
      
      // Free models filter
      if (this.filters.freeOnly) {
        const inputPrice = this.parsePrice(model.pricing?.prompt);
        const outputPrice = this.parsePrice(model.pricing?.completion);
        if (inputPrice > 0 || outputPrice > 0) {
          return false;
        }
      }
      
      // Vision filter
      if (this.filters.visionOnly && !model.capabilities?.vision) {
        return false;
      }
      
      // Voice/Audio filter
      if (this.filters.voiceOnly) {
        const hasVoice = model.capabilities?.voice || 
                        model.capabilities?.audio ||
                        model.id.toLowerCase().includes('whisper') ||
                        model.id.toLowerCase().includes('audio') ||
                        model.id.toLowerCase().includes('speech') ||
                        model.id.toLowerCase().includes('tts');
        if (!hasVoice) {
          return false;
        }
      }
      
      // Premium providers filter (OpenAI, Claude, Gemini, Grok)
      if (this.filters.premiumOnly) {
        const isPremium = model.id.startsWith('openai/') ||
                         model.id.startsWith('anthropic/') ||
                         model.id.startsWith('google/') ||
                         model.id.startsWith('x-ai/');
        if (!isPremium) {
          return false;
        }
      }
      
      return true;
    });
    
    // Re-render the model cards
    const container = document.querySelector('.models-grid');
    if (container) {
      container.innerHTML = this.filteredModels.map(model => `
        <div class="model-card ${model.id === this.currentModel ? 'selected' : ''}" 
             data-model-id="${model.id}">
          ${model.is_favorite ? '<span class="model-favorite">★</span>' : ''}
          <div class="model-name">${model.id}</div>
          <div class="model-provider">${model.name || 'Provider'}</div>
          
          <div class="model-features">
            ${model.context_length ? `<span class="model-feature">Context: ${model.context_length}</span>` : ''}
            ${model.capabilities?.vision ? '<span class="model-feature">Vision</span>' : ''}
            ${model.capabilities?.function_calling ? '<span class="model-feature">Functions</span>' : ''}
          </div>
          
          <div class="model-pricing">
            <div class="model-price">
              <span class="model-price-label">Input</span>
              <span class="model-price-value">$${this.formatPrice(model.pricing?.prompt, model.id)}/1K</span>
            </div>
            <div class="model-price">
              <span class="model-price-label">Output</span>
              <span class="model-price-value">$${this.formatPrice(model.pricing?.completion, model.id)}/1K</span>
            </div>
          </div>
        </div>
      `).join('');
      
      // Re-attach event listeners
      this.setupModelCardEvents();
    }
  }
  
  parsePrice(price) {
    if (!price && price !== 0) return 0;
    if (typeof price === 'string') return parseFloat(price) || 0;
    if (typeof price === 'number') return price;
    return 0;
  }
  
  setupModelCardEvents() {
    document.querySelectorAll('.model-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });
  }
  
  setupFilterEvents() {
    // Search input
    const searchInput = document.getElementById('modelSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.applyFilters();
      });
    }
    
    // Free models toggle
    const freeFilter = document.getElementById('freeOnlyFilter');
    if (freeFilter) {
      freeFilter.addEventListener('change', (e) => {
        this.filters.freeOnly = e.target.checked;
        this.applyFilters();
      });
    }
    
    // Vision models toggle
    const visionFilter = document.getElementById('visionOnlyFilter');
    if (visionFilter) {
      visionFilter.addEventListener('change', (e) => {
        this.filters.visionOnly = e.target.checked;
        this.applyFilters();
      });
    }
    
    // Voice/Audio models toggle
    const voiceFilter = document.getElementById('voiceOnlyFilter');
    if (voiceFilter) {
      voiceFilter.addEventListener('change', (e) => {
        this.filters.voiceOnly = e.target.checked;
        this.applyFilters();
      });
    }
    
    // Premium providers toggle
    const premiumFilter = document.getElementById('premiumOnlyFilter');
    if (premiumFilter) {
      premiumFilter.addEventListener('change', (e) => {
        this.filters.premiumOnly = e.target.checked;
        this.applyFilters();
      });
    }
  }
  
  selectModel(modelId) {
    this.currentModel = modelId;
    Storage.setCurrentModel(modelId);
    window.app.currentModel = modelId;
    
    // Update UI
    document.getElementById('currentModel').textContent = modelId.split('/').pop();
  }
  
  showParametersModal() {
    Modal.show({
      title: 'Model Parameters',
      size: 'md',
      content: this.renderParameters(),
      buttons: [
        {
          text: 'Reset to Defaults',
          className: 'btn-secondary',
          onClick: () => {
            this.resetParameters();
            Modal.update(this.renderParameters());
          }
        },
        {
          text: 'Cancel',
          onClick: () => Modal.close()
        },
        {
          text: 'Save',
          className: 'btn-primary',
          onClick: () => {
            this.saveParameters();
            Modal.close();
          }
        }
      ]
    });
    
    this.setupParameterEvents();
  }
  
  renderParameters() {
    return `
      <div class="parameter-presets">
        <button class="preset-btn" data-preset="creative">Creative</button>
        <button class="preset-btn" data-preset="balanced">Balanced</button>
        <button class="preset-btn" data-preset="precise">Precise</button>
      </div>
      
      <div class="parameter-group">
        <div class="parameter-label">
          <span class="parameter-name">Temperature</span>
          <span class="parameter-value" id="tempValue">${this.parameters.temperature}</span>
        </div>
        <input type="range" class="parameter-slider" id="temperature" 
               min="0" max="2" step="0.1" value="${this.parameters.temperature}">
      </div>
      
      <div class="parameter-group">
        <div class="parameter-label">
          <span class="parameter-name">Max Tokens</span>
          <span class="parameter-value" id="maxTokensValue">${this.parameters.max_tokens}</span>
        </div>
        <input type="number" class="parameter-input" id="maxTokens" 
               min="1" max="4000" value="${this.parameters.max_tokens}">
      </div>
      
      <div class="parameter-group">
        <div class="parameter-label">
          <span class="parameter-name">Top P</span>
          <span class="parameter-value" id="topPValue">${this.parameters.top_p}</span>
        </div>
        <input type="range" class="parameter-slider" id="topP" 
               min="0" max="1" step="0.01" value="${this.parameters.top_p}">
      </div>
      
      <div class="parameter-group">
        <div class="parameter-label">
          <span class="parameter-name">Frequency Penalty</span>
          <span class="parameter-value" id="freqPenaltyValue">${this.parameters.frequency_penalty}</span>
        </div>
        <input type="range" class="parameter-slider" id="frequencyPenalty" 
               min="-2" max="2" step="0.1" value="${this.parameters.frequency_penalty}">
      </div>
      
      <div class="parameter-group">
        <div class="parameter-label">
          <span class="parameter-name">Presence Penalty</span>
          <span class="parameter-value" id="presPenaltyValue">${this.parameters.presence_penalty}</span>
        </div>
        <input type="range" class="parameter-slider" id="presencePenalty" 
               min="-2" max="2" step="0.1" value="${this.parameters.presence_penalty}">
      </div>
    `;
  }
  
  setupParameterEvents() {
    // Temperature slider
    document.getElementById('temperature').addEventListener('input', (e) => {
      document.getElementById('tempValue').textContent = e.target.value;
    });
    
    // Max tokens input
    document.getElementById('maxTokens').addEventListener('input', (e) => {
      document.getElementById('maxTokensValue').textContent = e.target.value;
    });
    
    // Top P slider
    document.getElementById('topP').addEventListener('input', (e) => {
      document.getElementById('topPValue').textContent = e.target.value;
    });
    
    // Frequency penalty slider
    document.getElementById('frequencyPenalty').addEventListener('input', (e) => {
      document.getElementById('freqPenaltyValue').textContent = e.target.value;
    });
    
    // Presence penalty slider
    document.getElementById('presencePenalty').addEventListener('input', (e) => {
      document.getElementById('presPenaltyValue').textContent = e.target.value;
    });
    
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyPreset(btn.dataset.preset);
      });
    });
  }
  
  applyPreset(preset) {
    const presets = {
      creative: {
        temperature: 1.2,
        max_tokens: 2000,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.5
      },
      balanced: {
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      },
      precise: {
        temperature: 0.3,
        max_tokens: 500,
        top_p: 0.95,
        frequency_penalty: -0.5,
        presence_penalty: -0.5
      }
    };
    
    const values = presets[preset];
    if (values) {
      document.getElementById('temperature').value = values.temperature;
      document.getElementById('tempValue').textContent = values.temperature;
      
      document.getElementById('maxTokens').value = values.max_tokens;
      document.getElementById('maxTokensValue').textContent = values.max_tokens;
      
      document.getElementById('topP').value = values.top_p;
      document.getElementById('topPValue').textContent = values.top_p;
      
      document.getElementById('frequencyPenalty').value = values.frequency_penalty;
      document.getElementById('freqPenaltyValue').textContent = values.frequency_penalty;
      
      document.getElementById('presencePenalty').value = values.presence_penalty;
      document.getElementById('presPenaltyValue').textContent = values.presence_penalty;
      
      // Highlight active preset
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === preset);
      });
    }
  }
  
  saveParameters() {
    this.parameters = {
      temperature: parseFloat(document.getElementById('temperature').value),
      max_tokens: parseInt(document.getElementById('maxTokens').value),
      top_p: parseFloat(document.getElementById('topP').value),
      frequency_penalty: parseFloat(document.getElementById('frequencyPenalty').value),
      presence_penalty: parseFloat(document.getElementById('presencePenalty').value)
    };
    
    Storage.setModelParameters(this.parameters);
    window.app.modelParameters = this.parameters;
  }
  
  resetParameters() {
    this.parameters = {
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };
  }
}

window.Models = new ModelsManager();