class SidebarManager {
  constructor() {
    this.sessions = [];
    this.isCollapsed = Storage.getSidebarState();
  }
  
  init() {
    if (this.isCollapsed) {
      document.getElementById('sidebar').classList.add('collapsed');
    }
  }
  
  toggle() {
    const sidebar = document.getElementById('sidebar');
    this.isCollapsed = !this.isCollapsed;
    
    if (this.isCollapsed) {
      sidebar.classList.add('collapsed');
    } else {
      sidebar.classList.remove('collapsed');
    }
    
    Storage.setSidebarState(this.isCollapsed);
  }
  
  renderSessions(sessions) {
    this.sessions = sessions;
    const container = document.getElementById('sessionsList');
    
    if (sessions.length === 0) {
      container.innerHTML = '<div class="empty-state">No sessions yet</div>';
      return;
    }
    
    container.innerHTML = sessions.map(session => {
      const modelName = DateUtils.formatModelName(session.model || session.title);
      const timestamp = DateUtils.formatTimestamp(session.updated_at || session.created_at);
      
      return `
        <div class="session-item" data-session-id="${session.id}">
          <div class="session-info">
            <span class="session-model">${this.escapeHtml(modelName)}</span>
            <span class="session-time">${timestamp}</span>
          </div>
          <div class="session-actions">
            <button class="btn-icon" data-action="edit" data-session-id="${session.id}" title="Rename">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-icon" data-action="delete" data-session-id="${session.id}" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    // Add event listeners
    container.querySelectorAll('.session-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.session-actions')) {
          const sessionId = parseInt(item.dataset.sessionId);
          window.app.loadSession(sessionId);
        }
      });
    });
    
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sessionId = parseInt(btn.dataset.sessionId);
        this.editSession(sessionId);
      });
    });
    
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sessionId = parseInt(btn.dataset.sessionId);
        this.deleteSession(sessionId);
      });
    });
  }
  
  setActiveSession(sessionId) {
    document.querySelectorAll('.session-item').forEach(item => {
      if (parseInt(item.dataset.sessionId) === sessionId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
  
  editSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    Modal.show({
      title: 'Rename Session',
      size: 'sm',
      content: `
        <div class="form-group">
          <label>Session Name</label>
          <input type="text" id="sessionNameInput" class="parameter-input" 
                 value="${this.escapeHtml(session.title)}">
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
            const newTitle = document.getElementById('sessionNameInput').value;
            
            if (newTitle && newTitle !== session.title) {
              try {
                await API.updateSession(sessionId, newTitle);
                await window.app.loadSessions();
                Modal.close();
              } catch (error) {
                alert('Failed to rename session');
              }
            }
          }
        }
      ]
    });
  }
  
  async deleteSession(sessionId) {
    if (confirm('Are you sure you want to delete this session?')) {
      try {
        await API.deleteSession(sessionId);
        
        // If deleting current session, load another or create new
        if (window.app.currentSession === sessionId) {
          await window.app.loadSessions();
        } else {
          // Just refresh the list
          const response = await API.getSessions();
          this.renderSessions(response.sessions);
        }
      } catch (error) {
        alert('Failed to delete session');
      }
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

window.Sidebar = new SidebarManager();