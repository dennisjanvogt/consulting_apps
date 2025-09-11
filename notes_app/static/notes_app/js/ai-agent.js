// AI Agent JavaScript for Notes & Docs App

let aiTemplates = [];
let aiModels = [];
let hasApiKey = false;

// Initialize AI Agent
document.addEventListener('DOMContentLoaded', function() {
    initializeAIAgent();
});

async function initializeAIAgent() {
    // Add event listener for AI Agent button
    const aiAgentBtn = document.getElementById('aiAgentBtn');
    if (aiAgentBtn) {
        aiAgentBtn.addEventListener('click', showAIAgentModal);
    }
    
    // Check for API key
    await checkApiKey();
    
    // Load templates and models
    await loadAITemplates();
    await loadAIModels();
    
    // Add enhance button to editor if note is loaded
    addEnhanceButton();
}

// Check if API key is configured
async function checkApiKey() {
    try {
        const response = await apiCall('/notes/api/ai/check-key/');
        if (response) {
            hasApiKey = response.has_api_key;
            
            const warning = document.getElementById('aiWarning');
            const generateBtn = document.getElementById('aiGenerateBtn');
            
            if (!hasApiKey) {
                if (warning) warning.style.display = 'flex';
                if (generateBtn) generateBtn.disabled = true;
                
                // Update warning text with link to OpenRouter app
                const warningText = document.getElementById('aiWarningText');
                if (warningText) {
                    warningText.innerHTML = 'No API key found. Please <a href="/openrouter/" target="_blank">configure your OpenRouter API key</a> first.';
                }
            } else {
                if (warning) warning.style.display = 'none';
                if (generateBtn) generateBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error checking API key:', error);
    }
}

// Load AI templates
async function loadAITemplates() {
    try {
        const response = await apiCall('/notes/api/ai/templates/');
        if (response && response.templates) {
            aiTemplates = response.templates;
            
            const select = document.getElementById('aiTemplateSelect');
            if (select) {
                select.innerHTML = '';
                
                aiTemplates.forEach(template => {
                    const option = document.createElement('option');
                    option.value = template.id;
                    option.textContent = `${template.icon} ${template.name}`;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading AI templates:', error);
    }
}

// Load AI models
async function loadAIModels() {
    try {
        const response = await apiCall('/notes/api/ai/models/');
        if (response && response.models) {
            aiModels = response.models;
            renderModelCards();
        }
    } catch (error) {
        console.error('Error loading AI models:', error);
    }
}

// Render model cards
function renderModelCards() {
    // Render for both modals
    renderModelCardsForGrid('modelSelectionGrid', 'aiModelSelect');
    renderModelCardsForGrid('enhanceModelSelectionGrid', 'aiEnhanceModelSelect');
}

// Render model cards for a specific grid
function renderModelCardsForGrid(gridId, selectId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    grid.innerHTML = '';
    
    aiModels.forEach(model => {
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
                    <span class="price-label">~4K Doc</span>
                    <span class="price-value">$${calculateDocCost(model.pricing)}</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => selectModel(model.id, card, selectId));
        grid.appendChild(card);
    });
}

// Format context window size
function formatContext(tokens) {
    if (tokens >= 1000000) {
        return `${(tokens / 1000).toFixed(0)}K`;
    } else if (tokens >= 1000) {
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

// Calculate estimated cost for a 4K token document
function calculateDocCost(pricing) {
    // Assume 1K input (prompt) and 3K output (generated doc)
    const inputCost = (1000 * pricing.input) / 1000000;
    const outputCost = (3000 * pricing.output) / 1000000;
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
function selectModel(modelId, cardElement, selectId) {
    // Update hidden input
    const selectInput = document.getElementById(selectId || 'aiModelSelect');
    if (selectInput) {
        selectInput.value = modelId;
    }
    
    // Update visual selection - only within the same parent grid
    if (cardElement) {
        const parentGrid = cardElement.parentElement;
        parentGrid.querySelectorAll('.model-card').forEach(card => {
            card.classList.remove('selected');
        });
        cardElement.classList.add('selected');
    }
}

// Show AI Agent modal
async function showAIAgentModal() {
    // Check API key again
    await checkApiKey();
    
    if (!hasApiKey) {
        if (confirm('No API key found. Would you like to configure your OpenRouter API key now?')) {
            window.open('/openrouter/', '_blank');
        }
        return;
    }
    
    // Load folders for dropdown
    await loadFoldersForAI();
    
    // Show modal
    document.getElementById('aiAgentModal').classList.add('active');
}

// Load folders for AI modal
async function loadFoldersForAI() {
    try {
        const response = await apiCall('/notes/api/folders/');
        if (response && response.folders) {
            const select = document.getElementById('aiFolderSelect');
            if (select) {
                select.innerHTML = '<option value="">Root (No Folder)</option>';
                
                function addFoldersToSelect(folders, level = 0) {
                    folders.forEach(folder => {
                        const option = document.createElement('option');
                        option.value = folder.id;
                        option.textContent = '  '.repeat(level) + folder.name;
                        option.style.paddingLeft = `${level * 20}px`;
                        select.appendChild(option);
                        
                        if (folder.children && folder.children.length > 0) {
                            addFoldersToSelect(folder.children, level + 1);
                        }
                    });
                }
                
                addFoldersToSelect(response.folders);
            }
        }
    } catch (error) {
        console.error('Error loading folders:', error);
    }
}

// Generate AI document
async function generateAIDocument() {
    const templateType = document.getElementById('aiTemplateSelect').value;
    const topic = document.getElementById('aiTopic').value;
    const description = document.getElementById('aiDescription').value;
    const folderId = document.getElementById('aiFolderSelect').value;
    const model = document.getElementById('aiModelSelect').value;
    
    if (!topic || !description) {
        alert('Please enter both a topic and description for the document.');
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
        const response = await apiCall('/notes/api/ai/generate/', 'POST', {
            template_type: templateType,
            topic: topic,
            description: description,
            folder_id: folderId || null,
            model: model
        });
        
        if (response && response.success) {
            // Close modal
            closeModal('aiAgentModal');
            
            // Clear form
            document.getElementById('aiTopic').value = '';
            document.getElementById('aiDescription').value = '';
            
            // Load the new note
            await loadNote(response.note_id);
            
            // Reload notes list
            await loadNotes();
            
            // Show success message
            showNotification(`AI Document "${response.title}" generated successfully!`, 'success');
            
            // Show cost if available
            if (response.cost) {
                showNotification(`Cost: $${response.cost.toFixed(4)} | Tokens: ${response.tokens.total}`, 'info');
            }
        } else {
            showNotification(response?.error || 'Failed to generate document', 'error');
        }
    } catch (error) {
        console.error('Error generating AI document:', error);
        showNotification('Error generating document: ' + error.message, 'error');
    } finally {
        // Reset button
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

// Add enhance button to editor
function addEnhanceButton() {
    // Check if enhance button already exists
    if (document.getElementById('enhanceNoteBtn')) return;
    
    const editorActions = document.querySelector('.editor-actions');
    if (editorActions) {
        const enhanceBtn = document.createElement('button');
        enhanceBtn.className = 'btn-icon';
        enhanceBtn.id = 'enhanceNoteBtn';
        enhanceBtn.title = 'Enhance with AI';
        enhanceBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
        `;
        enhanceBtn.addEventListener('click', showEnhanceModal);
        
        // Insert before export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            editorActions.insertBefore(enhanceBtn, exportBtn);
        } else {
            editorActions.appendChild(enhanceBtn);
        }
    }
}

// Show enhance modal
async function showEnhanceModal() {
    if (!currentNote) {
        showNotification('Please select a note to enhance', 'warning');
        return;
    }
    
    // Check API key
    await checkApiKey();
    
    if (!hasApiKey) {
        if (confirm('No API key found. Would you like to configure your OpenRouter API key now?')) {
            window.open('/openrouter/', '_blank');
        }
        return;
    }
    
    // Render model cards if not already done
    if (aiModels.length > 0) {
        renderModelCardsForGrid('enhanceModelSelectionGrid', 'aiEnhanceModelSelect');
    }
    
    document.getElementById('aiEnhanceModal').classList.add('active');
}

// Enhance document with AI
async function enhanceWithAI() {
    if (!currentNote) return;
    
    const instruction = document.getElementById('aiEnhanceInstruction').value;
    const model = document.getElementById('aiEnhanceModelSelect').value;
    
    if (!instruction) {
        alert('Please enter enhancement instructions.');
        return;
    }
    
    // Show loading state
    const modal = document.getElementById('aiEnhanceModal');
    const enhanceBtn = modal.querySelector('.btn-ai-generate');
    const originalText = enhanceBtn.innerHTML;
    enhanceBtn.disabled = true;
    enhanceBtn.innerHTML = `
        <svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="10.472">
                <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 12 12;360 12 12" keyTimes="0;1"></animateTransform>
            </circle>
        </svg>
        Enhancing...
    `;
    
    try {
        const response = await apiCall('/notes/api/ai/enhance/', 'POST', {
            note_id: currentNote.id,
            instruction: instruction,
            model: model
        });
        
        if (response && response.success) {
            // Close modal
            closeModal('aiEnhanceModal');
            
            // Clear form
            document.getElementById('aiEnhanceInstruction').value = '';
            
            // Reload the note
            await loadNote(currentNote.id);
            
            // Show success message
            showNotification('Document enhanced successfully!', 'success');
        } else {
            showNotification(response?.error || 'Failed to enhance document', 'error');
        }
    } catch (error) {
        console.error('Error enhancing document:', error);
        showNotification('Error enhancing document: ' + error.message, 'error');
    } finally {
        // Reset button
        enhanceBtn.disabled = false;
        enhanceBtn.innerHTML = originalText;
    }
}

// Show notification (if not already defined in app.js)
if (typeof showNotification === 'undefined') {
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}