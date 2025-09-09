class ChatManager {
  constructor() {
    this.messages = [];
    this.messageIdCounter = 0;
  }
  
  init() {
    this.setupImageUpload();
    this.setupAudioRecording();
  }
  
  renderMessages(messages) {
    this.messages = messages;
    const container = document.getElementById('messagesContainer');
    
    if (messages.length === 0) {
      container.innerHTML = `
        <div class="welcome-message" id="welcomeMessage">
          <h3>Welcome to OpenRouter Chat</h3>
          <p>Select a model and start chatting!</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = messages.map(msg => this.createMessageHTML(msg)).join('');
    this.scrollToBottom();
  }
  
  addMessage(role, content, isStreaming = false) {
    const messageId = `msg-${++this.messageIdCounter}`;
    const container = document.getElementById('messagesContainer');
    
    // Remove welcome message if exists
    const welcome = document.getElementById('welcomeMessage');
    if (welcome) welcome.remove();
    
    const messageHTML = this.createMessageHTML({
      id: messageId,
      role,
      content,
      isStreaming
    });
    
    container.insertAdjacentHTML('beforeend', messageHTML);
    this.scrollToBottom();
    
    return messageId;
  }
  
  createMessageHTML(message) {
    const isUser = message.role === 'user';
    const content = message.isStreaming 
      ? `${Markdown.parse(message.content)}<span class="loading-dots"><span></span><span></span><span></span></span>`
      : Markdown.parse(message.content);
    
    return `
      <div class="message ${message.role}" ${message.id ? `id="${message.id}"` : ''}>
        <div class="message-avatar"></div>
        <div class="message-content">
          <div class="message-text">${content}</div>
          ${message.model || message.cost_usd ? `
            <div class="message-info">
              ${message.model ? `<span>Model: ${message.model}</span>` : ''}
              ${message.input_tokens ? `<span>Tokens: ${message.input_tokens}/${message.output_tokens}</span>` : ''}
              ${message.cost_usd ? `<span>Cost: $${message.cost_usd.toFixed(6)}</span>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  updateMessage(messageId, content) {
    const messageEl = document.getElementById(messageId);
    if (messageEl) {
      const textEl = messageEl.querySelector('.message-text');
      if (textEl) {
        const isStreaming = messageEl.querySelector('.loading-dots');
        if (isStreaming) {
          textEl.innerHTML = `${Markdown.parse(content)}<span class="loading-dots"><span></span><span></span><span></span></span>`;
        } else {
          textEl.innerHTML = Markdown.parse(content);
        }
      }
    }
    this.scrollToBottom();
  }
  
  stopStreaming(messageId) {
    const messageEl = document.getElementById(messageId);
    if (messageEl) {
      const loadingDots = messageEl.querySelector('.loading-dots');
      if (loadingDots) {
        loadingDots.remove();
      }
    }
  }
  
  clearInput() {
    const input = document.getElementById('messageInput');
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('sendBtn').disabled = true;
  }
  
  scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    container.scrollTop = container.scrollHeight;
  }
  
  updateTokenInfo(tokens, cost) {
    const tokenCounter = document.getElementById('tokenCounter');
    const costEstimate = document.getElementById('costEstimate');
    
    if (tokens) {
      tokenCounter.textContent = `Tokens: ${tokens.input || 0}/${tokens.output || 0}`;
    }
    
    if (cost !== undefined) {
      costEstimate.textContent = `Cost: $${cost.toFixed(6)}`;
    }
  }
  
  setupImageUpload() {
    const attachBtn = document.getElementById('attachImageBtn');
    
    attachBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          // Convert to base64
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target.result;
            this.attachImage(base64);
          };
          reader.readAsDataURL(file);
        }
      };
      
      input.click();
    });
  }
  
  attachImage(base64) {
    // Show image preview in input area
    const messageInput = document.getElementById('messageInput');
    messageInput.dataset.attachedImage = base64;
    
    // Show preview
    alert('Image attached! (Feature in development)');
  }
  
  setupAudioRecording() {
    const recordBtn = document.getElementById('recordAudioBtn');
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    
    recordBtn.addEventListener('click', async () => {
      if (!isRecording) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          
          mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
          };
          
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            audioChunks = [];
            this.processAudio(audioBlob);
          };
          
          mediaRecorder.start();
          isRecording = true;
          recordBtn.classList.add('recording');
          recordBtn.style.color = 'var(--error)';
        } catch (error) {
          console.error('Failed to start recording:', error);
          alert('Microphone access denied');
        }
      } else {
        if (mediaRecorder) {
          mediaRecorder.stop();
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          isRecording = false;
          recordBtn.classList.remove('recording');
          recordBtn.style.color = '';
        }
      }
    });
  }
  
  processAudio(audioBlob) {
    // Use Web Speech API for transcription
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const messageInput = document.getElementById('messageInput');
        messageInput.value = transcript;
        messageInput.dispatchEvent(new Event('input'));
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        alert('Speech recognition failed');
      };
      
      // Note: Direct audio blob processing with Web Speech API is limited
      // In production, you'd send to a transcription service
      alert('Audio recorded! Transcription feature in development.');
    } else {
      alert('Speech recognition not supported in this browser');
    }
  }
}

window.Chat = new ChatManager();