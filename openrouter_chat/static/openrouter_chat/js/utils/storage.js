class StorageManager {
  constructor() {
    this.prefix = 'openrouter_chat_';
  }
  
  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  }
  
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Storage error:', error);
      return defaultValue;
    }
  }
  
  remove(key) {
    localStorage.removeItem(this.prefix + key);
  }
  
  clear() {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key));
  }
  
  // Specific storage methods
  getCurrentSession() {
    return this.get('current_session');
  }
  
  setCurrentSession(sessionId) {
    this.set('current_session', sessionId);
  }
  
  getCurrentModel() {
    return this.get('current_model', 'openai/gpt-3.5-turbo');
  }
  
  setCurrentModel(model) {
    this.set('current_model', model);
  }
  
  getModelParameters() {
    return this.get('model_parameters', {
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });
  }
  
  setModelParameters(parameters) {
    this.set('model_parameters', parameters);
  }
  
  getSystemPrompt() {
    return this.get('system_prompt', '');
  }
  
  setSystemPrompt(prompt) {
    this.set('system_prompt', prompt);
  }
  
  getTheme() {
    return this.get('theme', 'dark');
  }
  
  setTheme(theme) {
    this.set('theme', theme);
  }
  
  getSidebarState() {
    return this.get('sidebar_collapsed', false);
  }
  
  setSidebarState(collapsed) {
    this.set('sidebar_collapsed', collapsed);
  }
}

window.Storage = new StorageManager();