class KanbanApp {
    constructor() {
        this.currentBoard = 'WORK';
        this.tasks = [];
        this.currentTask = null;
        this.draggedTask = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTasks();
    }

    bindEvents() {
        // Board Switch
        document.querySelectorAll('.switch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchBoard(e));
        });

        // Add Task Button
        document.getElementById('addTaskBtn').addEventListener('click', () => this.openTaskModal());

        // Modal Events
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal('taskModal'));
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal('taskModal'));
        document.getElementById('taskForm').addEventListener('submit', (e) => this.handleTaskSubmit(e));

        // Delete Modal Events
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeModal('deleteModal'));
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.deleteTask());

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Drag and Drop Events
        this.initDragAndDrop();
    }

    switchBoard(e) {
        const btn = e.target;
        const board = btn.dataset.board.toUpperCase();
        
        if (board === this.currentBoard) return;

        // Update UI
        document.querySelectorAll('.switch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update current board and reload tasks
        this.currentBoard = board;
        this.loadTasks();
    }

    async loadTasks() {
        try {
            const response = await fetch(`/api/tasks/board/${this.currentBoard}/`);
            const data = await response.json();
            this.tasks = data.tasks;
            this.renderTasks();
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    renderTasks() {
        // Clear all task containers
        document.querySelectorAll('.tasks-container').forEach(container => {
            container.innerHTML = '';
        });

        // Group tasks by status
        const tasksByStatus = {
            'BACKLOG': [],
            'TODO': [],
            'IN_PROGRESS': [],
            'IN_REVIEW': [],
            'DONE': []
        };

        this.tasks.forEach(task => {
            if (tasksByStatus[task.status]) {
                tasksByStatus[task.status].push(task);
            }
        });

        // Render tasks in each column
        Object.keys(tasksByStatus).forEach(status => {
            const container = document.querySelector(`.column[data-status="${status}"] .tasks-container`);
            if (container) {
                tasksByStatus[status].forEach(task => {
                    container.appendChild(this.createTaskElement(task));
                });
            }
        });
    }

    createTaskElement(task) {
        const taskEl = document.createElement('div');
        taskEl.className = `task-card priority-${task.priority}`;
        taskEl.dataset.taskId = task.id;
        taskEl.draggable = true;

        taskEl.innerHTML = `
            <div class="task-title">${this.escapeHtml(task.title)}</div>
            <div class="task-description">${task.description ? this.escapeHtml(task.description) : '<em style="opacity: 0.5;">Keine Beschreibung</em>'}</div>
            <div class="task-actions">
                <button class="task-action-btn edit-btn" onclick="app.openTaskModal(${task.id})">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10z"/>
                    </svg>
                </button>
                <button class="task-action-btn delete-btn" onclick="app.confirmDelete(${task.id})">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1z"/>
                    </svg>
                </button>
            </div>
        `;

        // Drag events
        taskEl.addEventListener('dragstart', (e) => this.handleDragStart(e));
        taskEl.addEventListener('dragend', (e) => this.handleDragEnd(e));

        return taskEl;
    }

    initDragAndDrop() {
        const columns = document.querySelectorAll('.column');
        
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => this.handleDragOver(e));
            column.addEventListener('drop', (e) => this.handleDrop(e));
            column.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });
    }

    handleDragStart(e) {
        this.draggedTask = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.column').forEach(col => {
            col.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        
        const column = e.target.closest('.column');
        if (column) {
            column.classList.add('drag-over');
        }
        
        return false;
    }

    handleDragLeave(e) {
        const column = e.target.closest('.column');
        if (column) {
            column.classList.remove('drag-over');
        }
    }

    async handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        
        const column = e.target.closest('.column');
        if (!column || !this.draggedTask) return;
        
        column.classList.remove('drag-over');
        
        const newStatus = column.dataset.status;
        const taskId = this.draggedTask.dataset.taskId;
        
        // Update task status
        await this.moveTask(taskId, newStatus);
        
        return false;
    }

    async moveTask(taskId, newStatus) {
        try {
            const response = await fetch(`/api/tasks/${taskId}/move/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Update local task data
                const task = this.tasks.find(t => t.id == taskId);
                if (task) {
                    task.status = newStatus;
                }
                this.renderTasks();
            }
        } catch (error) {
            console.error('Error moving task:', error);
        }
    }

    openTaskModal(taskId = null) {
        const modal = document.getElementById('taskModal');
        const form = document.getElementById('taskForm');
        const modalTitle = document.getElementById('modalTitle');
        
        if (taskId) {
            // Edit mode
            this.currentTask = this.tasks.find(t => t.id === taskId);
            modalTitle.textContent = 'Aufgabe bearbeiten';
            
            // Fill form with task data
            form.title.value = this.currentTask.title;
            form.description.value = this.currentTask.description || '';
            form.priority.value = this.currentTask.priority;
            form.status.value = this.currentTask.status;
        } else {
            // Create mode
            this.currentTask = null;
            modalTitle.textContent = 'Neue Aufgabe';
            form.reset();
            form.status.value = 'BACKLOG';
        }
        
        modal.classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    async handleTaskSubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        const taskData = {
            title: form.title.value,
            description: form.description.value,
            priority: form.priority.value,
            status: form.status.value,
            board_type: this.currentBoard
        };
        
        try {
            let response;
            if (this.currentTask) {
                // Update existing task
                response = await fetch(`/api/tasks/${this.currentTask.id}/update/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrftoken
                    },
                    body: JSON.stringify(taskData)
                });
            } else {
                // Create new task
                response = await fetch('/api/tasks/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrftoken
                    },
                    body: JSON.stringify(taskData)
                });
            }
            
            if (response.ok) {
                this.closeModal('taskModal');
                this.loadTasks();
            }
        } catch (error) {
            console.error('Error saving task:', error);
        }
    }

    confirmDelete(taskId) {
        this.currentTask = this.tasks.find(t => t.id === taskId);
        if (this.currentTask) {
            const message = document.getElementById('deleteMessage');
            message.textContent = `Möchten Sie die Aufgabe "${this.currentTask.title}" wirklich löschen?`;
            document.getElementById('deleteModal').classList.add('active');
        }
    }

    async deleteTask() {
        if (!this.currentTask) return;
        
        try {
            const response = await fetch(`/api/tasks/${this.currentTask.id}/delete/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': csrftoken
                }
            });
            
            if (response.ok) {
                this.closeModal('deleteModal');
                this.loadTasks();
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
const app = new KanbanApp();