// Notes & Docs App - Main JavaScript
let currentNote = null;
let currentFolder = null;
let notes = [];
let folders = [];
let tags = [];
let autosaveTimer = null;
let isPreviewMode = false;

// Get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const csrftoken = getCookie('csrftoken');

// API Functions
async function apiCall(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'X-CSRFToken': csrftoken,
            'Content-Type': 'application/json',
        },
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        showNotification('Error: ' + error.message, 'error');
        return null;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadFolders();
    loadNotes();
    loadTags();
    initializeEventListeners();
    initializeEditor();
});

// Load folders
async function loadFolders() {
    const data = await apiCall('/notes/api/folders/');
    if (data) {
        folders = data.folders;
        renderFolders();
    }
}

// Render folders
function renderFolders() {
    const folderTree = document.getElementById('folderTree');
    folderTree.innerHTML = '';
    
    // Add "All Notes" item
    const allNotesItem = document.createElement('div');
    allNotesItem.className = 'folder-item' + (currentFolder === null ? ' active' : '');
    allNotesItem.innerHTML = `
        <svg class="folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        </svg>
        <span class="folder-name">All Notes</span>
        <span class="folder-count">${notes.length}</span>
    `;
    allNotesItem.onclick = () => selectFolder(null);
    folderTree.appendChild(allNotesItem);
    
    // Render folder tree
    function renderFolderLevel(folders, parentElement, level = 0) {
        folders.forEach(folder => {
            const folderItem = document.createElement('div');
            folderItem.className = 'folder-item' + (level > 0 ? ' nested' : '') + 
                                  (currentFolder === folder.id ? ' active' : '');
            folderItem.style.paddingLeft = `${(level + 1) * 1.5}rem`;
            folderItem.innerHTML = `
                <svg class="folder-icon" viewBox="0 0 24 24" fill="${folder.color}" stroke="${folder.color}" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="folder-name">${folder.name}</span>
                <span class="folder-count">${folder.note_count || 0}</span>
            `;
            folderItem.onclick = () => selectFolder(folder.id);
            parentElement.appendChild(folderItem);
            
            if (folder.children && folder.children.length > 0) {
                renderFolderLevel(folder.children, parentElement, level + 1);
            }
        });
    }
    
    renderFolderLevel(folders, folderTree);
}

// Select folder
function selectFolder(folderId) {
    currentFolder = folderId;
    renderFolders();
    loadNotes();
}

// Load notes
async function loadNotes() {
    let url = '/notes/api/notes/';
    const params = new URLSearchParams();
    
    if (currentFolder) {
        params.append('folder', currentFolder);
    }
    
    const searchInput = document.getElementById('searchInput').value;
    if (searchInput) {
        params.append('search', searchInput);
    }
    
    if (params.toString()) {
        url += '?' + params.toString();
    }
    
    const data = await apiCall(url);
    if (data) {
        notes = data.notes;
        renderNotes();
    }
}

// Render notes
function renderNotes() {
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = '';
    
    if (notes.length === 0) {
        notesList.innerHTML = '<div class="empty-state">No notes found</div>';
        return;
    }
    
    notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item' + (currentNote && currentNote.id === note.id ? ' active' : '');
        noteItem.innerHTML = `
            <div class="note-item-header">
                <div class="note-title">
                    ${note.is_favorite ? '<span class="note-favorite">★</span>' : ''}
                    ${note.title}
                </div>
            </div>
            <div class="note-preview">${note.content}</div>
            <div class="note-meta">
                <span>${note.folder_name || 'Unfiled'}</span>
                <span>${formatDate(note.updated_at)}</span>
            </div>
        `;
        noteItem.onclick = () => loadNote(note.id);
        notesList.appendChild(noteItem);
    });
}

// Load single note
async function loadNote(noteId) {
    const data = await apiCall(`/notes/api/notes/${noteId}/`);
    if (data) {
        currentNote = data;
        displayNote();
        renderNotes(); // Update active state
    }
}

// Display note in editor
function displayNote() {
    if (!currentNote) return;
    
    document.getElementById('noteTitle').value = currentNote.title;
    document.getElementById('editor').value = currentNote.content;
    document.getElementById('wordCount').textContent = `${currentNote.word_count} words`;
    
    // Update favorite button
    const favoriteBtn = document.getElementById('toggleFavorite');
    if (currentNote.is_favorite) {
        favoriteBtn.classList.add('active');
        favoriteBtn.querySelector('svg').setAttribute('fill', 'currentColor');
    } else {
        favoriteBtn.classList.remove('active');
        favoriteBtn.querySelector('svg').setAttribute('fill', 'none');
    }
    
    if (isPreviewMode) {
        updatePreview();
    }
}

// Create new note
async function createNote() {
    const title = prompt('Enter note title:');
    if (!title) return;
    
    const data = await apiCall('/notes/api/notes/create/', 'POST', {
        title: title,
        content: '',
        folder_id: currentFolder
    });
    
    if (data) {
        await loadNotes();
        await loadNote(data.id);
    }
}

// Save note
async function saveNote() {
    if (!currentNote) return;
    
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('editor').value;
    
    const data = await apiCall(`/notes/api/notes/${currentNote.id}/update/`, 'PUT', {
        title: title,
        content: content,
        is_favorite: currentNote.is_favorite
    });
    
    if (data) {
        showSaveStatus('saved');
        currentNote.title = title;
        currentNote.content = content;
        currentNote.word_count = content.split(/\s+/).filter(word => word.length > 0).length;
        document.getElementById('wordCount').textContent = `${currentNote.word_count} words`;
        await loadNotes();
    }
}

// Delete note
async function deleteNote() {
    if (!currentNote) return;
    
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    const data = await apiCall(`/notes/api/notes/${currentNote.id}/delete/`, 'DELETE');
    
    if (data) {
        currentNote = null;
        document.getElementById('noteTitle').value = '';
        document.getElementById('editor').value = '';
        await loadNotes();
    }
}

// Toggle favorite
async function toggleFavorite() {
    if (!currentNote) return;
    
    currentNote.is_favorite = !currentNote.is_favorite;
    
    const data = await apiCall(`/notes/api/notes/${currentNote.id}/update/`, 'PUT', {
        is_favorite: currentNote.is_favorite
    });
    
    if (data) {
        displayNote();
        await loadNotes();
    }
}

// Load tags
async function loadTags() {
    const data = await apiCall('/notes/api/tags/');
    if (data) {
        tags = data.tags;
        renderTags();
    }
}

// Render tags
function renderTags() {
    const tagsList = document.getElementById('tagsList');
    tagsList.innerHTML = '';
    
    tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.style.borderColor = tag.color;
        tagElement.textContent = tag.name;
        tagElement.onclick = () => filterByTag(tag.name);
        tagsList.appendChild(tagElement);
    });
}

// Filter by tag
function filterByTag(tagName) {
    // TODO: Implement tag filtering
    console.log('Filter by tag:', tagName);
}

// Initialize event listeners
function initializeEventListeners() {
    // Header buttons
    document.getElementById('newNoteBtn').addEventListener('click', createNote);
    document.getElementById('toggleFavorites').addEventListener('click', toggleFavoritesFilter);
    document.getElementById('toggleView').addEventListener('click', toggleViewMode);
    
    // Search
    document.getElementById('searchInput').addEventListener('input', debounce(loadNotes, 300));
    
    // Editor actions
    document.getElementById('saveBtn').addEventListener('click', saveNote);
    document.getElementById('deleteNoteBtn').addEventListener('click', deleteNote);
    document.getElementById('toggleFavorite').addEventListener('click', toggleFavorite);
    document.getElementById('togglePreview').addEventListener('click', togglePreview);
    document.getElementById('exportBtn').addEventListener('click', showExportModal);
    
    // Folder actions
    document.getElementById('newFolderBtn').addEventListener('click', showNewFolderModal);
    
    // Sort
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        sortNotes(e.target.value);
    });
    
    // Auto-save
    document.getElementById('editor').addEventListener('input', () => {
        showSaveStatus('typing');
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => {
            if (currentNote) {
                saveNote();
            }
        }, 2000);
    });
    
    document.getElementById('noteTitle').addEventListener('input', () => {
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => {
            if (currentNote) {
                saveNote();
            }
        }, 2000);
    });
}

// Initialize editor
function initializeEditor() {
    const toolbarButtons = document.querySelectorAll('.toolbar-btn');
    toolbarButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            applyFormatting(action);
        });
    });
}

// Apply formatting
function applyFormatting(action) {
    const editor = document.getElementById('editor');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    let replacement = '';
    
    switch(action) {
        case 'bold':
            replacement = `**${selectedText}**`;
            break;
        case 'italic':
            replacement = `*${selectedText}*`;
            break;
        case 'h1':
            replacement = `# ${selectedText}`;
            break;
        case 'h2':
            replacement = `## ${selectedText}`;
            break;
        case 'h3':
            replacement = `### ${selectedText}`;
            break;
        case 'ul':
            replacement = `- ${selectedText}`;
            break;
        case 'ol':
            replacement = `1. ${selectedText}`;
            break;
        case 'checklist':
            replacement = `- [ ] ${selectedText}`;
            break;
        case 'quote':
            replacement = `> ${selectedText}`;
            break;
        case 'code':
            replacement = `\`${selectedText}\``;
            break;
        case 'link':
            const url = prompt('Enter URL:');
            if (url) {
                replacement = `[${selectedText}](${url})`;
            } else {
                return;
            }
            break;
        case 'table':
            replacement = `| Header 1 | Header 2 |\n| -------- | -------- |\n| ${selectedText} | Cell 2 |`;
            break;
    }
    
    editor.value = editor.value.substring(0, start) + replacement + editor.value.substring(end);
    editor.focus();
    editor.setSelectionRange(start, start + replacement.length);
}

// Toggle preview
function togglePreview() {
    isPreviewMode = !isPreviewMode;
    const editorPanel = document.getElementById('editorPanel');
    const previewPanel = document.getElementById('previewPanel');
    
    if (isPreviewMode) {
        editorPanel.classList.add('hidden');
        previewPanel.classList.remove('hidden');
        updatePreview();
    } else {
        editorPanel.classList.remove('hidden');
        previewPanel.classList.add('hidden');
    }
}

// Update preview
async function updatePreview() {
    const content = document.getElementById('editor').value;
    const previewContent = document.getElementById('previewContent');
    
    // Enhanced markdown to HTML conversion
    let html = content;
    
    // Code blocks (```code```) - must be before inline code
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, lang, code) {
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .trim();
        return `<pre><code class="language-${lang || 'plaintext'}">${escapedCode}</code></pre>`;
    });
    
    // Headers
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr>');
    html = html.replace(/^\*\*\*$/gim, '<hr>');
    
    // Lists
    html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
    html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
    html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');
    
    // Wrap consecutive list items
    html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
        return '<ul>' + match + '</ul>';
    });
    
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Links and images
    html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1">');
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Inline code (after code blocks)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    
    // Tables
    html = html.replace(/\|(.+)\|/g, function(match, content) {
        const cells = content.split('|').map(cell => cell.trim());
        if (cells.every(cell => cell.match(/^-+$/))) {
            return ''; // Skip separator rows
        }
        const cellTags = cells.map(cell => `<td>${cell}</td>`).join('');
        return `<tr>${cellTags}</tr>`;
    });
    
    // Wrap table rows
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g, function(match) {
        return '<table>' + match + '</table>';
    });
    
    // Paragraphs
    html = html.split('\n\n').map(paragraph => {
        paragraph = paragraph.trim();
        // Don't wrap if already wrapped in block element
        if (paragraph.startsWith('<h') || paragraph.startsWith('<ul') || 
            paragraph.startsWith('<ol') || paragraph.startsWith('<blockquote') ||
            paragraph.startsWith('<pre') || paragraph.startsWith('<table') ||
            paragraph.startsWith('<hr')) {
            return paragraph;
        }
        // Handle single line breaks within paragraphs
        return '<p>' + paragraph.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
    
    previewContent.innerHTML = html;
}

// Show new folder modal
function showNewFolderModal() {
    document.getElementById('newFolderModal').classList.add('active');
}

// Create folder
async function createFolder() {
    const name = document.getElementById('folderName').value;
    const parentId = document.getElementById('parentFolder').value;
    const colorButtons = document.querySelectorAll('.color-option');
    let selectedColor = '#3F1E5F';
    
    colorButtons.forEach(btn => {
        if (btn.classList.contains('active')) {
            selectedColor = btn.dataset.color;
        }
    });
    
    if (!name) {
        alert('Please enter a folder name');
        return;
    }
    
    const data = await apiCall('/notes/api/folders/create/', 'POST', {
        name: name,
        parent_id: parentId || null,
        color: selectedColor
    });
    
    if (data) {
        closeModal('newFolderModal');
        await loadFolders();
    }
}

// Show export modal
function showExportModal() {
    if (!currentNote) return;
    document.getElementById('exportModal').classList.add('active');
}

// Export note
async function exportNote(format) {
    if (!currentNote) return;
    
    const url = `/notes/api/notes/${currentNote.id}/export/?format=${format}`;
    window.open(url, '_blank');
    closeModal('exportModal');
}

// Modal functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Color picker
document.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Export options
document.querySelectorAll('.export-option').forEach(btn => {
    btn.addEventListener('click', () => {
        exportNote(btn.dataset.format);
    });
});

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return `${minutes}m ago`;
        }
        return `${hours}h ago`;
    } else if (days === 1) {
        return 'Yesterday';
    } else if (days < 7) {
        return `${days} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function showSaveStatus(status) {
    const saveStatus = document.getElementById('saveStatus');
    
    switch(status) {
        case 'typing':
            saveStatus.textContent = 'Typing...';
            saveStatus.className = 'save-status';
            break;
        case 'saving':
            saveStatus.textContent = 'Saving...';
            saveStatus.className = 'save-status saving';
            break;
        case 'saved':
            saveStatus.textContent = 'All changes saved';
            saveStatus.className = 'save-status';
            break;
        case 'error':
            saveStatus.textContent = 'Error saving';
            saveStatus.className = 'save-status error';
            break;
    }
}

function showNotification(message, type = 'info') {
    // TODO: Implement notification system
    console.log(`${type}: ${message}`);
}

function toggleFavoritesFilter() {
    // TODO: Implement favorites filter
    console.log('Toggle favorites filter');
}

function toggleViewMode() {
    // TODO: Implement view mode toggle (list/grid)
    console.log('Toggle view mode');
}

function sortNotes(sortBy) {
    switch(sortBy) {
        case 'updated':
            notes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            break;
        case 'created':
            notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'title':
            notes.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'favorites':
            notes.sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0));
            break;
    }
    renderNotes();
}