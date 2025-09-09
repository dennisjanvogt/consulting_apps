class APIClient {
  constructor() {
    this.baseURL = '/api';
    this.token = localStorage.getItem('token');
  }
  
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }
  
  async request(endpoint, options = {}) {
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
  
  // Auth endpoints
  async register(email, password, username) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: { email, password, username }
    });
    this.setToken(response.token);
    return response;
  }
  
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    this.setToken(response.token);
    return response;
  }
  
  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }
  
  async getSession() {
    return await this.request('/auth/session');
  }
  
  async updateApiKey(apiKey) {
    return await this.request('/auth/api-key', {
      method: 'PUT',
      body: { apiKey }
    });
  }
  
  // Session endpoints
  async getSessions() {
    return await this.request('/sessions');
  }
  
  async createSession(title) {
    return await this.request('/sessions', {
      method: 'POST',
      body: { title }
    });
  }
  
  async updateSession(id, title) {
    return await this.request(`/sessions/${id}`, {
      method: 'PUT',
      body: { title }
    });
  }
  
  async deleteSession(id) {
    return await this.request(`/sessions/${id}`, {
      method: 'DELETE'
    });
  }
  
  async getSessionMessages(id) {
    return await this.request(`/sessions/${id}/messages`);
  }
  
  // Chat endpoints
  streamChat(sessionId, message, model, systemPrompt, parameters, onChunk, onComplete, onError) {
    // SSE doesn't support POST body, so we need to use a different approach
    // We'll create a regular fetch request that streams the response
    const requestBody = {
      sessionId,
      message,
      model,
      systemPrompt,
      parameters
    };
    
    fetch(`${this.baseURL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(requestBody)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Stream request failed');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      const processText = (text) => {
        buffer += text;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error) {
                onError(new Error(parsed.error));
              } else if (parsed.done) {
                onComplete(parsed);
              } else if (parsed.content) {
                onChunk(parsed.content);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      };
      
      const read = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            if (buffer) processText('\n');
            return;
          }
          
          processText(decoder.decode(value, { stream: true }));
          read();
        }).catch(onError);
      };
      
      read();
    })
    .catch(onError);
    
    return null; // No EventSource to return
  }
  
  async sendMessage(sessionId, message, model, systemPrompt, parameters) {
    return await this.request('/chat/message', {
      method: 'POST',
      body: {
        sessionId,
        message,
        model,
        systemPrompt,
        parameters
      }
    });
  }
  
  // Model endpoints
  async getModels() {
    return await this.request('/models');
  }
  
  async getModel(name) {
    return await this.request(`/models/${name}`);
  }
  
  async saveModelPreferences(modelName, parameters, isFavorite) {
    return await this.request('/models/preferences', {
      method: 'POST',
      body: { modelName, parameters, isFavorite }
    });
  }
  
  async validateApiKey(apiKey) {
    return await this.request('/models/validate-key', {
      method: 'POST',
      body: { apiKey }
    });
  }
  
  // Prompt endpoints
  async getPrompts() {
    return await this.request('/prompts');
  }
  
  async createPrompt(name, content, category, isDefault) {
    return await this.request('/prompts', {
      method: 'POST',
      body: { name, content, category, isDefault }
    });
  }
  
  async updatePrompt(id, updates) {
    return await this.request(`/prompts/${id}`, {
      method: 'PUT',
      body: updates
    });
  }
  
  async deletePrompt(id) {
    return await this.request(`/prompts/${id}`, {
      method: 'DELETE'
    });
  }
  
  async getDefaultPrompt() {
    return await this.request('/prompts/default');
  }
  
  // Analytics endpoints
  async getUsageStats(period = '30d') {
    return await this.request(`/analytics/usage?period=${period}`);
  }
  
  async getUsageHistory(days = 30) {
    return await this.request(`/analytics/history?days=${days}`);
  }
  
  async getSessionStats(sessionId) {
    return await this.request(`/analytics/sessions/${sessionId}`);
  }
  
  async getAnalyticsSummary() {
    return await this.request('/analytics/summary');
  }
}

window.API = new APIClient();