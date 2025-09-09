class DateFormatter {
  formatTimestamp(timestamp) {
    // SQLite datetime('now') returns UTC timestamps in format YYYY-MM-DD HH:MM:SS
    // We need to append 'Z' to indicate it's UTC time
    let dateStr = timestamp;
    
    if (typeof timestamp === 'string') {
      // Check if timestamp already has timezone info
      if (!timestamp.includes('Z') && !timestamp.includes('+') && !timestamp.includes('-')) {
        // SQLite format: "YYYY-MM-DD HH:MM:SS" is in UTC
        // Convert to ISO format with Z suffix
        dateStr = timestamp.replace(' ', 'T') + 'Z';
      }
    }
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    // Less than 1 minute
    if (diffMins < 1) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diffMins < 60) {
      return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    }
    
    // Less than 24 hours
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    
    // Less than 7 days
    if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    
    // Same year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    // Different year
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  }
  
  formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  }
  
  formatModelName(modelId) {
    if (!modelId) return 'New Chat';
    
    // Extract provider and model name
    const parts = modelId.split('/');
    if (parts.length === 2) {
      const provider = parts[0];
      const model = parts[1];
      
      // Format provider names
      const providerNames = {
        'openai': 'OpenAI',
        'anthropic': 'Claude',
        'google': 'Gemini',
        'x-ai': 'Grok',
        'meta-llama': 'Llama',
        'mistralai': 'Mistral',
        'deepseek': 'DeepSeek'
      };
      
      const providerName = providerNames[provider] || provider;
      
      // Shorten model names
      const shortModel = model
        .replace(/^gpt-/, '')
        .replace(/^claude-/, '')
        .replace(/^gemini-/, '')
        .replace(/^llama-/, '')
        .replace(/-instruct$/, '')
        .replace(/-chat$/, '')
        .replace(/:free$/, ' (free)');
      
      return `${providerName} ${shortModel}`;
    }
    
    // Fallback for unrecognized format
    return modelId.split('/').pop().replace(/-/g, ' ');
  }
}

window.DateUtils = new DateFormatter();