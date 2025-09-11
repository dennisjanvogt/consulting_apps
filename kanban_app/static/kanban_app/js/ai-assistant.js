// AI Assistant for Kanban App

let aiModels = [];
let hasApiKey = false;

// AI Model definitions with pricing
const AI_MODELS = [
    {
        id: 'openai/gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        description: 'Best for complex task breakdowns',
        context: 128000,
        pricing: { input: 10.0, output: 30.0 },
        speed: 'medium',
        quality: 'excellent',
        recommended: true
    },
    {
        id: 'openai/gpt-4',
        name: 'GPT-4',
        provider: 'OpenAI',
        description: 'High quality task generation',
        context: 8192,
        pricing: { input: 30.0, output: 60.0 },
        speed: 'slow',
        quality: 'excellent'
    },
    {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        description: 'Fast and cost-effective',
        context: 16385,
        pricing: { input: 0.5, output: 1.5 },
        speed: 'fast',
        quality: 'good',
        budget: true
    },
    {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        description: 'Excellent for detailed tasks',
        context: 200000,
        pricing: { input: 15.0, output: 75.0 },
        speed: 'medium',
        quality: 'excellent'
    },
    {
        id: 'anthropic/claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: 'Anthropic',
        description: 'Balanced performance',
        context: 200000,
        pricing: { input: 3.0, output: 15.0 },
        speed: 'fast',
        quality: 'very_good'
    },
    {
        id: 'google/gemini-pro',
        name: 'Gemini Pro',
        provider: 'Google',
        description: 'Google\'s advanced model',
        context: 32768,
        pricing: { input: 1.0, output: 2.0 },
        speed: 'fast',
        quality: 'very_good'
    },
    {
        id: 'meta-llama/llama-3-70b-instruct',
        name: 'Llama 3 70B',
        provider: 'Meta',
        description: 'Open source option',
        context: 8192,
        pricing: { input: 0.8, output: 0.8 },
        speed: 'medium',
        quality: 'good',
        open_source: true
    }
];

// Initialize AI Assistant
document.addEventListener('DOMContentLoaded', function() {
    initializeAIAssistant();
});

function initializeAIAssistant() {
    const aiBtn = document.getElementById('aiAssistantBtn');
    const aiModal = document.getElementById('aiAssistantModal');
    const aiModalClose = document.getElementById('aiModalClose');
    const aiCancelBtn = document.getElementById('aiCancelBtn');
    const aiGenerateBtn = document.getElementById('aiGenerateBtn');
    
    if (aiBtn) {
        aiBtn.addEventListener('click', () => {
            checkApiKey();
            renderModelCards();
            aiModal.classList.add('active');
        });
    }
    
    if (aiModalClose) {
        aiModalClose.addEventListener('click', () => {
            aiModal.classList.remove('active');
        });
    }
    
    if (aiCancelBtn) {
        aiCancelBtn.addEventListener('click', () => {
            aiModal.classList.remove('active');
        });
    }
    
    if (aiGenerateBtn) {
        aiGenerateBtn.addEventListener('click', generateAITasks);
    }
    
    // Click outside modal to close
    aiModal?.addEventListener('click', (e) => {
        if (e.target === aiModal) {
            aiModal.classList.remove('active');
        }
    });
}

// Check for API key
async function checkApiKey() {
    try {
        const response = await fetch('/kanban/api/ai/check-key/', {
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            hasApiKey = data.has_api_key;
            
            const warning = document.getElementById('aiWarning');
            const generateBtn = document.getElementById('aiGenerateBtn');
            
            if (!hasApiKey) {
                if (warning) warning.style.display = 'flex';
                if (generateBtn) generateBtn.disabled = true;
            } else {
                if (warning) warning.style.display = 'none';
                if (generateBtn) generateBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error checking API key:', error);
    }
}

// Render model cards
function renderModelCards() {
    const grid = document.getElementById('modelSelectionGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    AI_MODELS.forEach(model => {
        const card = document.createElement('div');
        card.className = 'model-card';
        
        // Add special classes
        if (model.recommended) card.classList.add('recommended');
        if (model.budget) card.classList.add('budget');
        if (model.id === 'openai/gpt-4-turbo-preview') card.classList.add('selected');
        
        // Create quality indicator
        const qualityDots = getQualityIndicator(model.quality);
        
        // Create speed indicator
        const speedBars = getSpeedIndicator(model.speed);
        
        card.innerHTML = `
            <div class="model-header">
                <span class="model-name">${model.name}</span>
                <span class="model-provider">${model.provider}</span>
            </div>
            <div class="model-description">${model.description}</div>
            <div class="model-specs">
                <div class="model-spec">
                    <span>Context: ${formatContext(model.context)}</span>
                </div>
                <div class="model-spec">
                    ${qualityDots}
                </div>
                <div class="model-spec">
                    ${speedBars}
                </div>
            </div>
            <div class="model-pricing">
                <div class="price-item">
                    <span class="price-label">Input</span>
                    <span class="price-value">$${model.pricing.input}<span class="price-unit">/1M</span></span>
                </div>
                <div class="price-item">
                    <span class="price-label">Output</span>
                    <span class="price-value">$${model.pricing.output}<span class="price-unit">/1M</span></span>
                </div>
                <div class="price-item">
                    <span class="price-label">~5 Tasks</span>
                    <span class="price-value">$${calculateTaskCost(model.pricing)}</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => selectModel(model.id, card));
        grid.appendChild(card);
    });
}

// Format context window size
function formatContext(tokens) {
    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(0)}K`;
    }
    return `${tokens}`;
}

// Get quality indicator HTML
function getQualityIndicator(quality) {
    const levels = {
        'excellent': 5,
        'very_good': 4,
        'good': 3,
        'fair': 2,
        'basic': 1
    };
    
    const dots = levels[quality] || 3;
    let html = '<span class="quality-indicator" title="Quality">';
    
    for (let i = 0; i < 5; i++) {
        html += `<span class="quality-dot ${i < dots ? 'filled' : ''}"></span>`;
    }
    
    html += '</span>';
    return html;
}

// Get speed indicator HTML
function getSpeedIndicator(speed) {
    const speedClass = speed || 'medium';
    const label = speed === 'fast' ? '⚡ Fast' : speed === 'slow' ? '🐢 Slow' : '⏱ Medium';
    
    return `
        <span class="speed-indicator ${speedClass}" title="${label}">
            <span class="speed-bar"></span>
            <span class="speed-bar"></span>
            <span class="speed-bar"></span>
        </span>
    `;
}

// Calculate estimated cost for 5 tasks
function calculateTaskCost(pricing) {
    // Assume 500 input tokens and 1500 output tokens for 5 tasks
    const inputCost = (500 * pricing.input) / 1000000;
    const outputCost = (1500 * pricing.output) / 1000000;
    const total = inputCost + outputCost;
    
    if (total < 0.01) {
        return total.toFixed(4);
    } else if (total < 0.1) {
        return total.toFixed(3);
    } else {
        return total.toFixed(2);
    }
}

// Select a model
function selectModel(modelId, cardElement) {
    // Update hidden input
    document.getElementById('aiModelSelect').value = modelId;
    
    // Update visual selection
    document.querySelectorAll('.model-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    if (cardElement) {
        cardElement.classList.add('selected');
    }
}

// Generate AI tasks
async function generateAITasks() {
    const taskType = document.getElementById('aiTaskType').value;
    const description = document.getElementById('aiDescription').value;
    const taskCount = document.getElementById('aiTaskCount').value;
    const targetColumn = document.getElementById('aiTargetColumn').value;
    const model = document.getElementById('aiModelSelect').value;
    
    if (!description) {
        alert('Please enter a description for the tasks to generate.');
        return;
    }
    
    // Show loading state
    const generateBtn = document.getElementById('aiGenerateBtn');
    const originalText = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = `
        <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="10.472">
                <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 12 12;360 12 12" keyTimes="0;1"></animateTransform>
            </circle>
        </svg>
        Generating...
    `;
    
    try {
        const response = await fetch('/kanban/api/ai/generate-tasks/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                task_type: taskType,
                description: description,
                task_count: parseInt(taskCount),
                target_column: targetColumn,
                model: model,
                board_type: window.currentBoard || 'WORK'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
                // Close modal
                document.getElementById('aiAssistantModal').classList.remove('active');
                
                // Clear form
                document.getElementById('aiDescription').value = '';
                
                // Reload tasks
                if (typeof loadTasks === 'function') {
                    await loadTasks();
                } else if (typeof window.loadTasks === 'function') {
                    await window.loadTasks();
                } else {
                    // Fallback: reload the page
                    location.reload();
                }
                
                // Show success message
                showNotification(`Generated ${data.tasks.length} tasks successfully!`);
                
                // Show cost if available
                if (data.cost) {
                    showNotification(`Cost: $${data.cost.toFixed(4)} | Tokens: ${data.tokens}`);
                }
            } else {
                alert(data.error || 'Failed to generate tasks');
            }
        } else {
            alert('Failed to generate tasks. Please try again.');
        }
    } catch (error) {
        console.error('Error generating tasks:', error);
        alert('Error generating tasks: ' + error.message);
    } finally {
        // Reset button
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667EEA, #764BA2);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 300ms ease-out;
        z-index: 2000;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 300ms ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}