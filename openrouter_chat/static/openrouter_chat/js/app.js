class App {
  constructor() {
    this.currentUser = null;
    this.currentSession = null;
    this.currentModel = Storage.getCurrentModel();
    this.systemPrompt = Storage.getSystemPrompt();
    this.modelParameters = Storage.getModelParameters();
    this.isStreaming = false;
  }
  
  async init() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    
    if (token) {
      API.setToken(token);
      try {
        const response = await API.getSession();
        this.currentUser = response.user;
        await this.showChatInterface();
      } catch (error) {
        console.error('Session invalid:', error);
        this.showAuthInterface();
      }
    } else {
      this.showAuthInterface();
    }
    
    this.setupEventListeners();
  }
  
  showAuthInterface() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('chatContainer').classList.add('hidden');
    Auth.init();
  }
  
  async showChatInterface() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('chatContainer').classList.remove('hidden');
    
    // Update user info
    document.getElementById('userName').textContent = this.currentUser.username || 'User';
    document.getElementById('userEmail').textContent = this.currentUser.email;
    
    // Initialize components
    await Sidebar.init();
    Chat.init();
    
    // Load sessions
    await this.loadSessions();
    
    // Check for API key
    if (!this.currentUser.hasApiKey) {
      this.showApiKeyModal();
    }
  }
  
  async loadSessions() {
    try {
      const response = await API.getSessions();
      Sidebar.renderSessions(response.sessions);
      
      // Load current session or create new one
      const savedSessionId = Storage.getCurrentSession();
      const session = response.sessions.find(s => s.id === savedSessionId);
      
      if (session) {
        await this.loadSession(session.id);
      } else if (response.sessions.length > 0) {
        await this.loadSession(response.sessions[0].id);
      } else {
        await this.createNewSession();
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }
  
  async loadSession(sessionId) {
    try {
      this.currentSession = sessionId;
      Storage.setCurrentSession(sessionId);
      
      const response = await API.getSessionMessages(sessionId);
      Chat.renderMessages(response.messages);
      
      // Update UI
      Sidebar.setActiveSession(sessionId);
      
      // Update title
      const sessions = await API.getSessions();
      const session = sessions.sessions.find(s => s.id === sessionId);
      if (session) {
        document.getElementById('chatTitle').textContent = session.title;
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }
  
  async createNewSession() {
    try {
      const response = await API.createSession('New Chat');
      await this.loadSessions();
      await this.loadSession(response.session.id);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }
  
  async sendMessage(message) {
    if (this.isStreaming || !message.trim()) return;
    
    this.isStreaming = true;
    Chat.addMessage('user', message);
    Chat.clearInput();
    
    const assistantMessageId = Chat.addMessage('assistant', '', true);
    
    try {
      let fullResponse = '';
      
      API.streamChat(
        this.currentSession,
        message,
        this.currentModel,
        this.systemPrompt,
        this.modelParameters,
        (chunk) => {
          fullResponse += chunk;
          Chat.updateMessage(assistantMessageId, fullResponse);
        },
        (data) => {
          Chat.stopStreaming(assistantMessageId);
          this.isStreaming = false;
          
          // Update token counter
          if (data.tokens) {
            Chat.updateTokenInfo(data.tokens, data.cost);
          }
        },
        (error) => {
          console.error('Stream error:', error);
          Chat.updateMessage(assistantMessageId, 'Error: ' + error.message);
          Chat.stopStreaming(assistantMessageId);
          this.isStreaming = false;
        }
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      Chat.updateMessage(assistantMessageId, 'Error: ' + error.message);
      Chat.stopStreaming(assistantMessageId);
      this.isStreaming = false;
    }
  }
  
  setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await API.logout();
      this.currentUser = null;
      this.currentSession = null;
      this.showAuthInterface();
    });
    
    // New chat
    document.getElementById('newChatBtn').addEventListener('click', () => {
      this.createNewSession();
    });
    
    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => {
      // Show settings modal
    });
    
    // API Key
    document.getElementById('apiKeyBtn').addEventListener('click', () => {
      this.showApiKeyModal();
    });
    
    // Analytics
    document.getElementById('analyticsBtn').addEventListener('click', () => {
      Analytics.showModal();
    });
    
    // Model selection
    document.getElementById('modelSelectBtn').addEventListener('click', () => {
      Models.showModal();
    });
    
    // System prompt
    document.getElementById('systemPromptBtn').addEventListener('click', () => {
      Prompts.showModal();
    });
    
    // Parameters
    document.getElementById('parametersBtn').addEventListener('click', () => {
      Models.showParametersModal();
    });
    
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      Sidebar.toggle();
    });
    
    // Send message
    document.getElementById('sendBtn').addEventListener('click', () => {
      const input = document.getElementById('messageInput');
      this.sendMessage(input.value);
    });
    
    // Message input
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(e.target.value);
      }
    });
    
    // Auto-resize textarea
    document.getElementById('messageInput').addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
      
      // Enable/disable send button
      document.getElementById('sendBtn').disabled = !e.target.value.trim() || this.isStreaming;
    });
  }
  
  showApiKeyModal() {
    Modal.show({
      title: 'OpenRouter API Key',
      size: 'sm',
      content: `
        <div class="form-group">
          <label>API Key</label>
          <input type="password" id="apiKeyInput" class="api-key-input" 
                 placeholder="sk-or-..." value="${this.currentUser.hasApiKey ? '••••••••' : ''}">
          <div class="api-key-info">
            Get your API key from <a href="https://openrouter.ai/keys" target="_blank">OpenRouter</a>
          </div>
          <div id="apiKeyStatus"></div>
        </div>
      `,
      buttons: [
        {
          text: 'Cancel',
          onClick: () => Modal.close()
        },
        {
          text: 'Validate',
          className: 'btn-secondary',
          onClick: async () => {
            const apiKey = document.getElementById('apiKeyInput').value;
            const statusEl = document.getElementById('apiKeyStatus');
            
            try {
              const response = await API.validateApiKey(apiKey);
              if (response.valid) {
                statusEl.className = 'api-key-status valid';
                statusEl.textContent = 'API key is valid!';
              } else {
                statusEl.className = 'api-key-status invalid';
                statusEl.textContent = 'Invalid API key';
              }
            } catch (error) {
              statusEl.className = 'api-key-status invalid';
              statusEl.textContent = 'Failed to validate API key';
            }
          }
        },
        {
          text: 'Save',
          className: 'btn-primary',
          onClick: async () => {
            const apiKey = document.getElementById('apiKeyInput').value;
            
            if (apiKey && !apiKey.includes('•')) {
              try {
                await API.updateApiKey(apiKey);
                this.currentUser.hasApiKey = true;
                Modal.close();
              } catch (error) {
                alert('Failed to save API key');
              }
            }
          }
        }
      ]
    });
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  app.init();
});