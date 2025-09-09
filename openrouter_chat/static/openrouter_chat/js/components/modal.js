class ModalManager {
  constructor() {
    this.currentModal = null;
  }
  
  show(options) {
    const {
      title,
      content,
      size = 'md',
      buttons = [],
      onClose
    } = options;
    
    // Close existing modal
    if (this.currentModal) {
      this.close();
    }
    
    // Create modal HTML
    const modalHTML = `
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal modal-${size}">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close" id="modalClose">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
          ${buttons.length > 0 ? `
            <div class="modal-footer">
              ${buttons.map((btn, index) => `
                <button class="btn ${btn.className || 'btn-secondary'}" data-button-index="${index}">
                  ${btn.text}
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    // Add to DOM
    const container = document.getElementById('modalContainer');
    container.innerHTML = modalHTML;
    
    this.currentModal = document.getElementById('modalOverlay');
    
    // Add event listeners
    document.getElementById('modalClose').addEventListener('click', () => {
      this.close();
      if (onClose) onClose();
    });
    
    this.currentModal.addEventListener('click', (e) => {
      if (e.target === this.currentModal) {
        this.close();
        if (onClose) onClose();
      }
    });
    
    // Button event listeners
    buttons.forEach((btn, index) => {
      const buttonEl = this.currentModal.querySelector(`[data-button-index="${index}"]`);
      if (buttonEl && btn.onClick) {
        buttonEl.addEventListener('click', btn.onClick);
      }
    });
    
    // ESC key to close
    this.escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        if (onClose) onClose();
      }
    };
    document.addEventListener('keydown', this.escHandler);
  }
  
  close() {
    if (this.currentModal) {
      this.currentModal.remove();
      this.currentModal = null;
    }
    
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler);
      this.escHandler = null;
    }
  }
  
  update(content) {
    if (this.currentModal) {
      const body = this.currentModal.querySelector('.modal-body');
      if (body) {
        body.innerHTML = content;
      }
    }
  }
}

window.Modal = new ModalManager();