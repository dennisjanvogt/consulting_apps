class PromptsManager {
  constructor() {
    this.prompts = [];
    this.currentPrompt = Storage.getSystemPrompt();
  }
  
  async showModal() {
    try {
      const response = await API.getPrompts();
      this.prompts = response.prompts;
      
      Modal.show({
        title: 'System Prompts',
        size: 'lg',
        content: this.renderPromptEditor(),
        buttons: [
          {
            text: 'Cancel',
            onClick: () => Modal.close()
          },
          {
            text: 'Save as New',
            className: 'btn-secondary',
            onClick: () => this.saveAsNew()
          },
          {
            text: 'Apply',
            className: 'btn-primary',
            onClick: () => {
              this.applyPrompt();
              Modal.close();
            }
          }
        ]
      });
      
      this.setupPromptEvents();
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  }
  
  renderPromptEditor() {
    return `
      <div class="form-group">
        <label>System Prompt</label>
        <textarea id="promptEditor" class="prompt-editor" 
                  placeholder="Enter system prompt...">${this.escapeHtml(this.currentPrompt)}</textarea>
        <div class="prompt-variables">
          <span class="variable-chip" data-var="{{date}}">{{date}}</span>
          <span class="variable-chip" data-var="{{time}}">{{time}}</span>
          <span class="variable-chip" data-var="{{user_name}}">{{user_name}}</span>
        </div>
      </div>
      
      <div class="prompt-library">
        <h4>Saved Prompts</h4>
        <div class="prompt-list">
          ${this.prompts.length > 0 ? this.prompts.map(prompt => `
            <div class="prompt-item" data-prompt-id="${prompt.id}">
              <div class="prompt-item-name">${this.escapeHtml(prompt.name)}</div>
              ${prompt.category ? `<div class="prompt-item-category">${this.escapeHtml(prompt.category)}</div>` : ''}
            </div>
          `).join('') : '<div class="empty-state">No saved prompts</div>'}
        </div>
      </div>
    `;
  }
  
  setupPromptEvents() {
    // Variable chips
    document.querySelectorAll('.variable-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const editor = document.getElementById('promptEditor');
        const variable = chip.dataset.var;
        
        // Insert at cursor position
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        
        editor.value = text.substring(0, start) + variable + text.substring(end);
        editor.selectionStart = editor.selectionEnd = start + variable.length;
        editor.focus();
      });
    });
    
    // Prompt items
    document.querySelectorAll('.prompt-item').forEach(item => {
      item.addEventListener('click', () => {
        const promptId = parseInt(item.dataset.promptId);
        const prompt = this.prompts.find(p => p.id === promptId);
        
        if (prompt) {
          document.getElementById('promptEditor').value = prompt.content;
          
          // Mark as selected
          document.querySelectorAll('.prompt-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        }
      });
    });
  }
  
  applyPrompt() {
    const editor = document.getElementById('promptEditor');
    let prompt = editor.value;
    
    // Replace variables
    const now = new Date();
    prompt = prompt
      .replace(/\{\{date\}\}/g, now.toLocaleDateString())
      .replace(/\{\{time\}\}/g, now.toLocaleTimeString())
      .replace(/\{\{user_name\}\}/g, window.app.currentUser?.username || 'User');
    
    this.currentPrompt = prompt;
    Storage.setSystemPrompt(prompt);
    window.app.systemPrompt = prompt;
  }
  
  async saveAsNew() {
    const editor = document.getElementById('promptEditor');
    const content = editor.value;
    
    if (!content.trim()) {
      alert('Please enter a prompt');
      return;
    }
    
    Modal.show({
      title: 'Save System Prompt',
      size: 'sm',
      content: `
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="promptName" class="parameter-input" 
                 placeholder="Enter prompt name">
        </div>
        <div class="form-group">
          <label>Category (optional)</label>
          <input type="text" id="promptCategory" class="parameter-input" 
                 placeholder="Enter category">
        </div>
        <div class="form-group checkbox">
          <input type="checkbox" id="promptDefault">
          <label for="promptDefault">Set as default</label>
        </div>
      `,
      buttons: [
        {
          text: 'Cancel',
          onClick: () => Modal.close()
        },
        {
          text: 'Save',
          className: 'btn-primary',
          onClick: async () => {
            const name = document.getElementById('promptName').value;
            const category = document.getElementById('promptCategory').value;
            const isDefault = document.getElementById('promptDefault').checked;
            
            if (!name) {
              alert('Please enter a name');
              return;
            }
            
            try {
              await API.createPrompt(name, content, category, isDefault);
              Modal.close();
              this.showModal(); // Refresh the main modal
            } catch (error) {
              alert('Failed to save prompt');
            }
          }
        }
      ]
    });
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

window.Prompts = new PromptsManager();