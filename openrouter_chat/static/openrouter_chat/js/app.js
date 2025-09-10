/**
 * OpenRouter Chat Application
 * Clean, modern JavaScript implementation
 */

class ChatApp {
    constructor() {
        this.currentSession = null;
        this.sessions = [];
        this.messages = [];
        this.selectedModel = 'openai/gpt-3.5-turbo';
        this.availableModels = [];
        this.systemPrompt = '';
        this.apiKey = '';
        this.isLoading = false;
        
        this.promptTemplates = {
            helpful: 'Du bist ein hilfreicher und freundlicher Assistent. Beantworte Fragen präzise und verständlich.',
            creative: 'Du bist ein kreativer Assistent mit Fokus auf innovative Lösungen und originelle Ideen. Denke außerhalb der Box.',
            technical: 'Du bist ein technischer Experte. Gib detaillierte, technisch präzise Antworten mit Code-Beispielen wenn relevant.',
            concise: 'Du bist ein präziser Assistent. Gib kurze, direkte Antworten ohne unnötige Ausschweifungen.'
        };
        
        this.elements = {
            sidebar: document.getElementById('sidebar'),
            sessionsList: document.getElementById('sessionsList'),
            messagesContainer: document.getElementById('messagesContainer'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            charCount: document.getElementById('charCount'),
            selectedModelName: document.getElementById('selectedModelName'),
            settingsModal: document.getElementById('settingsModal'),
            modelModal: document.getElementById('modelModal'),
            promptModal: document.getElementById('promptModal'),
            apiKeyInput: document.getElementById('apiKey'),
            systemPromptInput: document.getElementById('systemPrompt'),
            loadingOverlay: document.getElementById('loadingOverlay')
        };
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadModels();
        await this.loadSessions();
        this.loadSystemPrompt();
        this.checkApiKey();
    }
    
    setupEventListeners() {
        // Sidebar toggle - new button in sidebar
        const sidebarToggle = document.getElementById('sidebarToggleNew');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSidebar();
            });
        }
        
        // Old toggle button fallback
        const oldToggle = document.getElementById('sidebarToggle');
        if (oldToggle) {
            oldToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
        
        // New chat
        document.getElementById('newChatBtn').addEventListener('click', () => {
            this.createNewSession();
        });
        
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showModal('settings');
        });
        
        // Save API Key
        document.getElementById('saveApiKey').addEventListener('click', () => {
            this.saveApiKey();
        });
        
        // Clear chat
        document.getElementById('clearChatBtn').addEventListener('click', () => {
            this.clearCurrentChat();
        });
        
        // Export chat
        document.getElementById('exportChatBtn').addEventListener('click', () => {
            this.exportChat();
        });
        
        // Model selection button
        document.getElementById('modelSelectBtn').addEventListener('click', () => {
            this.showModal('model');
        });
        
        // System prompt button
        document.getElementById('promptBtn').addEventListener('click', () => {
            this.showModal('prompt');
        });
        
        // System prompt save
        document.getElementById('savePrompt').addEventListener('click', () => {
            this.saveSystemPrompt();
        });
        
        // System prompt reset
        document.getElementById('resetPrompt').addEventListener('click', () => {
            this.elements.systemPromptInput.value = '';
            this.systemPrompt = '';
            localStorage.removeItem('systemPrompt');
        });
        
        // Template buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.target.dataset.template;
                if (this.promptTemplates[template]) {
                    this.elements.systemPromptInput.value = this.promptTemplates[template];
                }
            });
        });
        
        // Model search
        const modelSearch = document.getElementById('modelSearch');
        if (modelSearch) {
            modelSearch.addEventListener('input', (e) => {
                this.filterModels(e.target.value);
            });
        }
        
        // Message input
        this.elements.messageInput.addEventListener('input', (e) => {
            this.handleInputChange(e);
        });
        
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Send button
        this.elements.sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Modal close
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.dataset.modal);
            });
        });
        
        // Modal backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
        
        // Load saved model preference
        const savedModel = localStorage.getItem('selectedModel');
        if (savedModel) {
            this.selectedModel = savedModel;
            this.updateSelectedModelDisplay();
        }
    }
    
    async loadModels() {
        try {
            const response = await this.apiRequest('/api/models/');
            this.availableModels = response.models || [];
            this.renderModels();
        } catch (error) {
            console.error('Failed to load models:', error);
        }
    }
    
    renderModels() {
        const grid = document.getElementById('modelsGrid');
        if (!grid) return;
        
        grid.innerHTML = this.availableModels.map(model => {
            const isSelected = model.id === this.selectedModel;
            const capabilities = model.capabilities || [];
            return `
                <div class="model-card ${isSelected ? 'selected' : ''}" data-model-id="${model.id}">
                    <div class="model-name">${this.escapeHtml(model.name)}</div>
                    <div class="model-provider">${this.escapeHtml(model.provider)}</div>
                    <div class="model-features">
                        <span class="model-badge">Context: ${model.context.toLocaleString()}</span>
                        ${capabilities.includes('vision') ? '<span class="model-badge">👁️ Vision</span>' : ''}
                        ${capabilities.includes('code') ? '<span class="model-badge">💻 Code</span>' : ''}
                    </div>
                    <div class="model-pricing">
                        <div class="price-item">
                            <span class="price-label">Input</span>
                            <span class="price-value">$${model.pricing.prompt.toFixed(3)}/1M</span>
                        </div>
                        <div class="price-item">
                            <span class="price-label">Output</span>
                            <span class="price-value">$${model.pricing.completion.toFixed(3)}/1M</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        grid.querySelectorAll('.model-card').forEach(card => {
            card.addEventListener('click', () => {
                const modelId = card.dataset.modelId;
                this.selectModel(modelId);
            });
        });
    }
    
    selectModel(modelId) {
        this.selectedModel = modelId;
        localStorage.setItem('selectedModel', modelId);
        
        // Update UI
        document.querySelectorAll('.model-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.modelId === modelId);
        });
        
        this.updateSelectedModelDisplay();
        this.closeModal('model');
    }
    
    updateSelectedModelDisplay() {
        const model = this.availableModels.find(m => m.id === this.selectedModel);
        if (model && this.elements.selectedModelName) {
            this.elements.selectedModelName.textContent = model.name;
        }
    }
    
    filterModels(searchTerm) {
        const cards = document.querySelectorAll('.model-card');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const match = text.includes(searchTerm.toLowerCase());
            card.style.display = match ? '' : 'none';
        });
    }
    
    loadSystemPrompt() {
        const saved = localStorage.getItem('systemPrompt');
        if (saved) {
            this.systemPrompt = saved;
            if (this.elements.systemPromptInput) {
                this.elements.systemPromptInput.value = saved;
            }
        }
    }
    
    saveSystemPrompt() {
        this.systemPrompt = this.elements.systemPromptInput.value;
        localStorage.setItem('systemPrompt', this.systemPrompt);
        this.closeModal('prompt');
        this.showSuccess('System Prompt gespeichert');
    }
    
    toggleSidebar() {
        this.elements.sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', this.elements.sidebar.classList.contains('collapsed'));
    }
    
    showModal(modalName) {
        const modal = document.getElementById(`${modalName}Modal`);
        if (modal) {
            modal.classList.add('show');
        }
    }
    
    closeModal(modalName) {
        const modal = document.getElementById(`${modalName}Modal`);
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    handleInputChange(e) {
        // Auto-resize textarea
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
        
        // Update character count
        const charCount = e.target.value.length;
        this.elements.charCount.textContent = charCount;
        
        // Enable/disable send button
        this.elements.sendBtn.disabled = charCount === 0 || this.isLoading;
    }
    
    async loadSessions() {
        try {
            const response = await this.apiRequest('/api/sessions/');
            this.sessions = response.sessions || [];
            this.renderSessions();
            
            // Load first session or create new one
            if (this.sessions.length > 0) {
                await this.loadSession(this.sessions[0].id);
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    }
    
    renderSessions() {
        if (this.sessions.length === 0) {
            this.elements.sessionsList.innerHTML = `
                <div class="session-empty">
                    Keine Chats vorhanden
                </div>
            `;
            return;
        }
        
        this.elements.sessionsList.innerHTML = this.sessions.map(session => `
            <div class="session-item ${session.id === this.currentSession ? 'active' : ''}" 
                 data-session-id="${session.id}">
                <div class="session-title">${this.escapeHtml(session.title)}</div>
                <div class="session-time">${this.formatTime(session.updated_at)}</div>
            </div>
        `).join('');
        
        // Add click handlers
        this.elements.sessionsList.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', () => {
                const sessionId = parseInt(item.dataset.sessionId);
                this.loadSession(sessionId);
            });
        });
    }
    
    async loadSession(sessionId) {
        try {
            this.currentSession = sessionId;
            
            // Update active state in sidebar
            document.querySelectorAll('.session-item').forEach(item => {
                item.classList.toggle('active', parseInt(item.dataset.sessionId) === sessionId);
            });
            
            // Load messages
            const response = await this.apiRequest(`/api/sessions/${sessionId}/messages/`);
            this.messages = response.messages || [];
            this.renderMessages();
        } catch (error) {
            console.error('Failed to load session:', error);
        }
    }
    
    async createNewSession() {
        try {
            const response = await this.apiRequest('/api/sessions/create/', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'Neuer Chat',
                    model: this.selectedModel
                })
            });
            
            // Add to sessions list
            this.sessions.unshift(response);
            this.renderSessions();
            
            // Load the new session
            await this.loadSession(response.id);
        } catch (error) {
            console.error('Failed to create session:', error);
        }
    }
    
    renderMessages() {
        if (this.messages.length === 0) {
            this.elements.messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <h1>Willkommen beim OpenRouter Chat</h1>
                    <p>Wähle ein AI-Modell und starte eine Unterhaltung</p>
                </div>
            `;
            return;
        }
        
        this.elements.messagesContainer.innerHTML = this.messages.map(msg => this.createMessageHTML(msg)).join('');
        this.scrollToBottom();
    }
    
    createMessageHTML(message) {
        const isUser = message.role === 'user';
        const avatarChar = isUser ? 'U' : 'A';
        const messageClass = isUser ? 'user' : 'assistant';
        
        // Parse markdown for assistant messages
        const content = !isUser && typeof marked !== 'undefined' 
            ? marked.parse(message.content) 
            : this.escapeHtml(message.content);
        
        return `
            <div class="message ${messageClass}">
                <div class="message-avatar">${avatarChar}</div>
                <div class="message-content">
                    <div class="message-text">${content}</div>
                </div>
            </div>
        `;
    }
    
    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || this.isLoading) return;
        
        // Check for API key
        if (!this.apiKey) {
            this.showModal('settings');
            return;
        }
        
        // Create session if needed
        if (!this.currentSession) {
            await this.createNewSession();
        }
        
        // Add user message to UI
        this.messages.push({
            role: 'user',
            content: message
        });
        this.renderMessages();
        
        // Clear input
        this.elements.messageInput.value = '';
        this.handleInputChange({ target: this.elements.messageInput });
        
        // Show typing indicator only (no loading overlay)
        this.showTypingIndicator();
        
        try {
            // Send to backend
            const response = await this.apiRequest('/api/chat/send/', {
                method: 'POST',
                body: JSON.stringify({
                    session_id: this.currentSession,
                    message: message,
                    model: this.selectedModel,
                    system_prompt: this.systemPrompt
                })
            });
            
            // Add assistant message
            this.messages.push({
                role: 'assistant',
                content: response.message
            });
            this.renderMessages();
            
            // Update session title if it's the first message
            if (this.messages.length === 2) {
                const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
                this.sessions.find(s => s.id === this.currentSession).title = title;
                this.renderSessions();
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            // Show specific error message
            let errorMessage = 'Fehler beim Senden der Nachricht';
            if (error.message) {
                if (error.message.includes('Invalid or expired API key')) {
                    errorMessage = 'Ungültiger API-Schlüssel. Bitte aktualisiere deinen OpenRouter API-Schlüssel in den Einstellungen.';
                    // Open settings modal
                    setTimeout(() => this.showModal('settings'), 1000);
                } else if (error.message.includes('Insufficient credits')) {
                    errorMessage = 'Nicht genügend Credits. Bitte füge Credits zu deinem OpenRouter-Konto hinzu.';
                } else if (error.message.includes('Rate limit')) {
                    errorMessage = 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.';
                } else {
                    errorMessage = error.message;
                }
            }
            this.showError(errorMessage);
            
            // Remove the failed user message from UI
            this.messages.pop();
            this.renderMessages();
        } finally {
            // Remove typing indicator if still present
            this.hideTypingIndicator();
        }
    }
    
    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message assistant typing';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="message-avatar">A</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        this.elements.messagesContainer.appendChild(indicator);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    async clearCurrentChat() {
        if (!this.currentSession) return;
        
        if (confirm('Möchtest du diesen Chat wirklich löschen?')) {
            try {
                // Delete session from backend
                await this.apiRequest(`/api/sessions/${this.currentSession}/delete/`, {
                    method: 'DELETE'
                });
                
                // Remove from local sessions list
                this.sessions = this.sessions.filter(s => s.id !== this.currentSession);
                this.renderSessions();
                
                // Clear messages
                this.messages = [];
                this.currentSession = null;
                this.renderMessages();
                
                // Create new session or load another one
                if (this.sessions.length > 0) {
                    await this.loadSession(this.sessions[0].id);
                } else {
                    await this.createNewSession();
                }
            } catch (error) {
                console.error('Failed to delete chat:', error);
                this.showError('Fehler beim Löschen des Chats');
            }
        }
    }
    
    exportChat() {
        if (this.messages.length === 0) {
            alert('Keine Nachrichten zum Exportieren');
            return;
        }
        
        const markdown = this.messages.map(msg => {
            const role = msg.role === 'user' ? '**User:**' : '**Assistant:**';
            return `${role}\n${msg.content}\n`;
        }).join('\n---\n\n');
        
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    async saveApiKey() {
        const apiKey = this.elements.apiKeyInput.value.trim();
        if (!apiKey) return;
        
        this.setLoading(true);
        
        try {
            await this.apiRequest('/api/settings/api-key/', {
                method: 'POST',
                body: JSON.stringify({ api_key: apiKey })
            });
            
            this.apiKey = apiKey;
            localStorage.setItem('hasApiKey', 'true');
            this.closeModal('settings');
            this.showSuccess('API Key gespeichert');
            
            // Reload models now that we have an API key
            await this.loadModels();
        } catch (error) {
            console.error('Failed to save API key:', error);
            this.showError('Fehler beim Speichern des API Keys');
        } finally {
            this.setLoading(false);
        }
    }
    
    checkApiKey() {
        // Check if user has API key from backend
        const apiKeyFromBackend = this.elements.apiKeyInput.value;
        if (apiKeyFromBackend && apiKeyFromBackend.startsWith('sk-')) {
            this.apiKey = apiKeyFromBackend;
            localStorage.setItem('hasApiKey', 'true');
        } else {
            // No valid API key found
            const hasApiKey = localStorage.getItem('hasApiKey');
            if (!hasApiKey) {
                // Show settings modal after a delay for first-time users
                setTimeout(() => {
                    this.showModal('settings');
                }, 1000);
            }
        }
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.elements.sendBtn.disabled = loading || !this.elements.messageInput.value;
        
        if (loading) {
            this.elements.loadingOverlay.classList.add('show');
        } else {
            this.elements.loadingOverlay.classList.remove('show');
            this.hideTypingIndicator();
        }
    }
    
    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }
    
    showError(message) {
        // Simple error display - could be improved with toast notifications
        alert(message);
    }
    
    showSuccess(message) {
        // Simple success display - could be improved with toast notifications
        console.log(message);
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Gerade eben';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} Min`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} Std`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} Tage`;
        
        return date.toLocaleDateString('de-DE');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async apiRequest(endpoint, options = {}) {
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
                ...options.headers
            },
            credentials: 'same-origin'
        };
        
        const response = await fetch(`/openrouter${endpoint}`, config);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }
        
        return await response.json();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});