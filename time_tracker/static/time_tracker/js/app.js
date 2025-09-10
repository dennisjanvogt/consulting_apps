// Time Tracker App
class TimeTracker {
    constructor() {
        this.currentView = 'dashboard';
        this.timerInterval = null;
        this.timerStartTime = null;
        this.isTimerRunning = false;
        this.currentTimerTask = null;
        
        this.clients = [];
        this.projects = [];
        this.tasks = [];
        this.entries = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.checkTimerStatus();
        this.startTimerUpdates();
    }
    
    // Setup Event Listeners
    setupEventListeners() {
        // Initialize sidebar elements
        const burgerBtn = document.getElementById('burgerMenu');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        // Toggle sidebar function
        const toggleSidebar = () => {
            if (!sidebar) return;
            
            const isCollapsed = sidebar.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Open sidebar
                sidebar.classList.remove('collapsed');
                if (window.innerWidth <= 768 && overlay) {
                    overlay.classList.add('active');
                }
            } else {
                // Close sidebar
                sidebar.classList.add('collapsed');
                if (overlay) {
                    overlay.classList.remove('active');
                }
            }
            
            // Save state for desktop only
            if (window.innerWidth > 768) {
                localStorage.setItem('sidebarCollapsed', !isCollapsed);
            }
        };
        
        // Burger button click handler
        if (burgerBtn) {
            burgerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSidebar();
            });
        }
        
        // Close sidebar when clicking overlay
        if (overlay) {
            overlay.addEventListener('click', () => {
                if (sidebar) {
                    sidebar.classList.add('collapsed');
                    overlay.classList.remove('active');
                }
            });
        }
        
        // Initialize sidebar state
        const initSidebar = () => {
            if (!sidebar) return;
            
            if (window.innerWidth > 768) {
                // Desktop: restore saved state
                const savedState = localStorage.getItem('sidebarCollapsed');
                if (savedState === 'true') {
                    sidebar.classList.add('collapsed');
                } else {
                    sidebar.classList.remove('collapsed');
                }
                if (overlay) overlay.classList.remove('active');
            } else {
                // Mobile: always start collapsed
                sidebar.classList.add('collapsed');
                if (overlay) overlay.classList.remove('active');
            }
        };
        
        // Initialize on load
        initSidebar();
        
        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                initSidebar();
            }, 250);
        });
        
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
        
        // Timer controls
        document.getElementById('startTimer').addEventListener('click', () => {
            this.showTimerModal();
        });
        
        document.getElementById('stopTimer').addEventListener('click', () => {
            this.stopTimer();
        });
        
        document.getElementById('confirmStartTimer').addEventListener('click', () => {
            const taskId = document.getElementById('timerTaskSelect').value;
            const description = document.getElementById('timerDescription').value;
            if (taskId) {
                this.startTimer(taskId, description);
                this.closeModal('timerModal');
            }
        });
        
        // Quick entry
        document.getElementById('quickEntry').addEventListener('click', () => {
            this.showEntryModal();
        });
        
        // Timeline date picker
        const timelineDatePicker = document.getElementById('timelineDatePicker');
        if (timelineDatePicker) {
            timelineDatePicker.valueAsDate = new Date();
            timelineDatePicker.addEventListener('change', () => {
                this.loadTimeline(timelineDatePicker.value);
                this.loadDaySummary(timelineDatePicker.value);
            });
        }
        
        // New Task button
        const newTaskBtn = document.getElementById('newTask');
        if (newTaskBtn) {
            newTaskBtn.addEventListener('click', () => {
                this.showTaskModal();
            });
        }
        
        // Client management
        document.getElementById('newClient').addEventListener('click', () => {
            this.showClientModal();
        });
        
        document.getElementById('saveClient').addEventListener('click', () => {
            this.saveClient();
        });
        
        // Project management
        document.getElementById('newProject').addEventListener('click', () => {
            this.showProjectModal();
        });
        
        document.getElementById('saveProject').addEventListener('click', () => {
            this.saveProject();
        });
        
        // Task management
        document.getElementById('saveTask').addEventListener('click', () => {
            this.saveTask();
        });
        
        // Entry management
        document.getElementById('newEntry').addEventListener('click', () => {
            this.showEntryModal();
        });
        
        document.getElementById('saveEntry').addEventListener('click', () => {
            this.saveEntry();
        });
        
        // Modal close buttons
        document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.currentTarget.dataset.modal || 
                                e.currentTarget.closest('.modal').id;
                if (modalId && !e.currentTarget.classList.contains('btn-primary')) {
                    this.closeModal(modalId);
                }
            });
        });
        
        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // Filter changes
        document.getElementById('filterClient').addEventListener('change', () => {
            this.loadEntries();
        });
        
        document.getElementById('filterProject').addEventListener('change', () => {
            this.loadEntries();
        });
        
        document.getElementById('filterDateFrom').addEventListener('change', () => {
            this.loadEntries();
        });
        
        document.getElementById('filterDateTo').addEventListener('change', () => {
            this.loadEntries();
        });
    }
    
    // View Management
    switchView(view) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Update view containers
        document.querySelectorAll('.view-container').forEach(container => {
            container.classList.remove('active');
        });
        
        const viewElement = document.getElementById(`${view}View`);
        if (viewElement) {
            viewElement.classList.add('active');
        }
        
        this.currentView = view;
        
        // Load view-specific data
        switch(view) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'timeline':
                this.loadTimelineView();
                break;
            case 'entries':
                this.loadEntries();
                break;
            case 'tasks':
                this.loadTasksView();
                break;
            case 'clients':
                this.loadClients();
                break;
            case 'projects':
                this.loadProjects();
                break;
            case 'reports':
                this.loadReports();
                break;
        }
    }
    
    // Timer Functions
    async checkTimerStatus() {
        try {
            const response = await this.apiCall('/api/timer/status/');
            if (response.is_running) {
                this.isTimerRunning = true;
                this.timerStartTime = new Date(response.start_time);
                this.currentTimerTask = {
                    id: response.task_id,
                    name: response.task_name,
                    project: response.project_name,
                    client: response.client_name,
                    description: response.description
                };
                this.updateTimerDisplay();
                document.getElementById('startTimer').style.display = 'none';
                document.getElementById('stopTimer').style.display = 'block';
                
                // Show description field with current description
                const descContainer = document.getElementById('timerDescriptionContainer');
                const descInput = document.getElementById('timerLiveDescription');
                descContainer.style.display = 'block';
                descInput.value = response.description || localStorage.getItem('timerDescription') || '';
                
                // Save description on change
                descInput.addEventListener('input', () => {
                    this.currentTimerTask.description = descInput.value;
                    localStorage.setItem('timerDescription', descInput.value);
                });
            }
        } catch (error) {
            console.error('Error checking timer status:', error);
        }
    }
    
    startTimerUpdates() {
        // Update timer every second
        setInterval(() => {
            if (this.isTimerRunning) {
                this.updateTimerDisplay();
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        if (!this.isTimerRunning || !this.timerStartTime) return;
        
        const now = new Date();
        const elapsed = Math.floor((now - this.timerStartTime) / 1000);
        
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timerDisplay').textContent = display;
        
        if (this.currentTimerTask) {
            document.getElementById('timerTask').textContent = 
                `${this.currentTimerTask.client} > ${this.currentTimerTask.project} > ${this.currentTimerTask.name}`;
        }
    }
    
    async showTimerModal() {
        await this.loadTasks();
        const select = document.getElementById('timerTaskSelect');
        select.innerHTML = '<option value="">Choose a task...</option>';
        
        this.tasks.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.display_name;
            select.appendChild(option);
        });
        
        this.showModal('timerModal');
    }
    
    async startTimer(taskId, description) {
        try {
            const response = await this.apiCall('/api/timer/start/', 'POST', {
                task_id: taskId,
                description: description
            });
            
            this.isTimerRunning = true;
            this.timerStartTime = new Date(response.start_time);
            this.currentTimerTask = {
                id: response.task_id,
                name: response.task_name,
                project: response.project_name,
                client: response.client_name,
                description: description
            };
            
            document.getElementById('startTimer').style.display = 'none';
            document.getElementById('stopTimer').style.display = 'block';
            
            // Show description field and set initial value
            const descContainer = document.getElementById('timerDescriptionContainer');
            const descInput = document.getElementById('timerLiveDescription');
            descContainer.style.display = 'block';
            descInput.value = description || '';
            
            // Save description on change
            descInput.addEventListener('input', () => {
                this.currentTimerTask.description = descInput.value;
                // Save to localStorage for persistence
                localStorage.setItem('timerDescription', descInput.value);
            });
            
            this.updateTimerDisplay();
            this.showNotification('Timer started', 'success');
        } catch (error) {
            console.error('Error starting timer:', error);
            this.showNotification('Failed to start timer', 'error');
        }
    }
    
    async stopTimer() {
        try {
            // Get the current description value
            const descriptionInput = document.getElementById('timerLiveDescription');
            const description = descriptionInput ? descriptionInput.value : '';
            
            // Send description with stop request
            const response = await this.apiCall('/api/timer/stop/', 'POST', {
                description: description
            });
            
            this.isTimerRunning = false;
            this.timerStartTime = null;
            this.currentTimerTask = null;
            
            document.getElementById('timerDisplay').textContent = '00:00:00';
            document.getElementById('timerTask').textContent = 'No task selected';
            document.getElementById('startTimer').style.display = 'block';
            document.getElementById('stopTimer').style.display = 'none';
            
            // Hide and clear description field
            const descContainer = document.getElementById('timerDescriptionContainer');
            const descInput = document.getElementById('timerLiveDescription');
            descContainer.style.display = 'none';
            descInput.value = '';
            localStorage.removeItem('timerDescription');
            
            this.showNotification(`Timer stopped. Duration: ${response.duration}`, 'success');
            
            // Reload current view to show new entry
            if (this.currentView === 'dashboard') {
                this.loadDashboard();
            } else if (this.currentView === 'timesheet') {
                this.loadEntries();
            }
        } catch (error) {
            console.error('Error stopping timer:', error);
            this.showNotification('Failed to stop timer', 'error');
        }
    }
    
    // Data Loading Functions
    async loadInitialData() {
        await this.loadStatistics();
        await this.loadDashboard();
    }
    
    async loadDashboard() {
        await Promise.all([
            this.loadStatistics(),
            this.loadRecentEntries()
        ]);
    }
    
    async loadTimelineView() {
        const date = document.getElementById('timelineDatePicker').value || new Date().toISOString().split('T')[0];
        await Promise.all([
            this.loadTimeline(date),
            this.loadDaySummary(date)
        ]);
    }
    
    async loadDaySummary(date = null) {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const response = await this.apiCall(`/api/entries/?date_from=${targetDate}&date_to=${targetDate}`);
            const container = document.getElementById('daySummary');
            
            if (!container) return;
            
            if (response.entries.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No entries for this day</p></div>';
                return;
            }
            
            container.innerHTML = '';
            response.entries.forEach(entry => {
                const entryDate = new Date(entry.start_time);
                const element = document.createElement('div');
                element.className = 'entry-item';
                element.innerHTML = `
                    <div class="entry-info">
                        <div class="entry-client">${entry.client_name}</div>
                        <div class="entry-task">${entry.project_name} - ${entry.task_name}</div>
                        <div class="entry-description">${entry.description || 'No description'}</div>
                    </div>
                    <div class="entry-meta">
                        <div class="entry-duration">${entry.duration}</div>
                        <div class="entry-time">${entryDate.toLocaleTimeString()}</div>
                        <div class="entry-actions">
                            <button class="btn-icon" onclick="tracker.editEntry(${entry.id})" title="Edit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="btn-icon btn-danger" onclick="tracker.deleteEntry(${entry.id})" title="Delete">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(element);
            });
        } catch (error) {
            console.error('Error loading day summary:', error);
        }
    }
    
    async loadTasksView() {
        try {
            await this.loadTasks();
            const grid = document.getElementById('tasksGrid');
            
            if (!grid) return;
            
            if (this.tasks.length === 0) {
                grid.innerHTML = '<div class="empty-state"><i class="fas fa-tasks"></i><p>No tasks yet</p><button class="btn btn-primary" onclick="timeTracker.showTaskModal()">Add First Task</button></div>';
                return;
            }
            
            grid.innerHTML = '';
            this.tasks.forEach(task => {
                const card = document.createElement('div');
                card.className = 'project-card';
                card.innerHTML = `
                    <div class="card-header">
                        <div>
                            <div class="card-title">${task.name}</div>
                            <div class="text-secondary">${task.project_name}</div>
                            <div class="text-secondary" style="font-size: 0.8rem;">${task.client_name}</div>
                        </div>
                        ${task.is_completed ? 
                            '<div class="card-badge" style="background: var(--success); color: white;">Completed</div>' : 
                            '<div class="card-badge">Active</div>'
                        }
                    </div>
                    <div class="card-meta">
                        ${task.description ? `<div>${task.description}</div>` : ''}
                        ${task.estimated_hours ? `<div><i class="fas fa-clock"></i> ${task.estimated_hours}h estimated</div>` : ''}
                    </div>
                    <div class="card-stats">
                        <div class="card-stat">
                            <div class="card-stat-label">Logged</div>
                            <div class="card-stat-value">${task.total_hours}h</div>
                        </div>
                    </div>
                `;
                card.addEventListener('click', () => {
                    // Start timer with this task
                    document.getElementById('timerTaskSelect').value = task.id;
                    this.showModal('timerModal');
                });
                grid.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading tasks view:', error);
        }
    }
    
    async loadStatistics() {
        try {
            const stats = await this.apiCall('/api/statistics/');
            
            // Update sidebar stats (if elements exist)
            const todayHoursEl = document.getElementById('todayHours');
            const weekHoursEl = document.getElementById('weekHours');
            const monthRevenueEl = document.getElementById('monthRevenue');
            
            if (todayHoursEl) todayHoursEl.textContent = stats.today.duration;
            if (weekHoursEl) weekHoursEl.textContent = stats.week.duration;
            if (monthRevenueEl) monthRevenueEl.textContent = `$${stats.month.revenue}`;
            
            // Update dashboard stats
            const todayDurationEl = document.getElementById('todayDuration');
            const todayRevenueEl = document.getElementById('todayRevenue');
            const weekDurationEl = document.getElementById('weekDuration');
            const weekRevenueEl = document.getElementById('weekRevenue');
            const monthDurationEl = document.getElementById('monthDuration');
            const monthRevenueMainEl = document.getElementById('monthRevenueMain');
            
            if (todayDurationEl) todayDurationEl.textContent = stats.today.duration;
            if (todayRevenueEl) todayRevenueEl.textContent = `$${stats.today.revenue}`;
            if (weekDurationEl) weekDurationEl.textContent = stats.week.duration;
            if (weekRevenueEl) weekRevenueEl.textContent = `$${stats.week.revenue}`;
            if (monthDurationEl) monthDurationEl.textContent = stats.month.duration;
            if (monthRevenueMainEl) monthRevenueMainEl.textContent = `$${stats.month.revenue}`;
            
            // Load active projects count
            const projects = await this.apiCall('/api/projects/?status=active');
            const activeProjectsEl = document.getElementById('activeProjects');
            if (activeProjectsEl) activeProjectsEl.textContent = projects.projects.length;
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }
    
    async loadTimeline(date = null) {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const response = await this.apiCall(`/api/timeline/?date=${targetDate}`);
            
            const timelineHours = document.querySelector('.timeline-hours');
            const timelineTracks = document.getElementById('timelineTracks');
            
            // Generate hour markers
            timelineHours.innerHTML = '';
            for (let i = 0; i < 24; i++) {
                const hour = document.createElement('div');
                hour.className = 'timeline-hour';
                hour.textContent = `${i}:00`;
                timelineHours.appendChild(hour);
            }
            
            // Clear existing tracks
            timelineTracks.innerHTML = '';
            
            // Add timeline entries
            response.timeline.forEach(entry => {
                const element = document.createElement('div');
                element.className = 'timeline-entry';
                element.style.left = `${(entry.start_hour / 24) * 100}%`;
                element.style.width = `${(entry.duration_hours / 24) * 100}%`;
                element.style.backgroundColor = entry.color;
                element.style.top = `${10 + (Math.random() * 60)}%`;
                element.textContent = entry.task_name;
                element.title = `${entry.client_name} - ${entry.project_name}\n${entry.task_name}\n${entry.description || 'No description'}`;
                
                timelineTracks.appendChild(element);
            });
            
            if (response.timeline.length === 0) {
                timelineTracks.innerHTML = '<div class="empty-state"><p>No time entries for this day</p></div>';
            }
        } catch (error) {
            console.error('Error loading timeline:', error);
        }
    }
    
    async loadRecentEntries() {
        try {
            const response = await this.apiCall('/api/entries/');
            const container = document.getElementById('recentEntries');
            
            if (response.entries.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No recent entries</p></div>';
                return;
            }
            
            container.innerHTML = '';
            response.entries.slice(0, 5).forEach(entry => {
                const entryDate = new Date(entry.start_time);
                const element = document.createElement('div');
                element.className = 'entry-item';
                element.innerHTML = `
                    <div class="entry-info">
                        <div class="entry-client">${entry.client_name}</div>
                        <div class="entry-task">${entry.project_name} - ${entry.task_name}</div>
                        <div class="entry-description">${entry.description || 'No description'}</div>
                    </div>
                    <div class="entry-meta">
                        <div class="entry-duration">${entry.duration}</div>
                        <div class="entry-time">${entryDate.toLocaleDateString()} ${entryDate.toLocaleTimeString()}</div>
                    </div>
                `;
                container.appendChild(element);
            });
        } catch (error) {
            console.error('Error loading recent entries:', error);
        }
    }
    
    async loadEntries() {
        try {
            const params = new URLSearchParams();
            
            const clientId = document.getElementById('filterClient').value;
            if (clientId) params.append('client_id', clientId);
            
            const projectId = document.getElementById('filterProject').value;
            if (projectId) params.append('project_id', projectId);
            
            const dateFrom = document.getElementById('filterDateFrom').value;
            if (dateFrom) params.append('date_from', dateFrom);
            
            const dateTo = document.getElementById('filterDateTo').value;
            if (dateTo) params.append('date_to', dateTo);
            
            const response = await this.apiCall(`/api/entries/?${params}`);
            const tbody = document.getElementById('entriesTableBody');
            
            if (response.entries.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No entries found</td></tr>';
                return;
            }
            
            tbody.innerHTML = '';
            response.entries.forEach(entry => {
                const entryDate = new Date(entry.start_time);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${entryDate.toLocaleDateString()}</td>
                    <td>${entry.client_name}</td>
                    <td>${entry.project_name}</td>
                    <td>${entry.task_name}</td>
                    <td>${entry.description || '-'}</td>
                    <td>${entry.duration}</td>
                    <td>$${entry.revenue}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn" onclick="timeTracker.editEntry(${entry.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" onclick="timeTracker.deleteEntry(${entry.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading entries:', error);
        }
    }
    
    async loadClients() {
        try {
            const response = await this.apiCall('/api/clients/');
            this.clients = response.clients;
            
            const grid = document.getElementById('clientsGrid');
            
            if (this.clients.length === 0) {
                grid.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No clients yet</p><button class="btn btn-primary" onclick="timeTracker.showClientModal()">Add First Client</button></div>';
                return;
            }
            
            grid.innerHTML = '';
            this.clients.forEach(client => {
                const card = document.createElement('div');
                card.className = 'client-card';
                card.innerHTML = `
                    <div class="card-header">
                        <div>
                            <div class="card-title">${client.name}</div>
                            ${client.company ? `<div class="text-secondary">${client.company}</div>` : ''}
                        </div>
                        <div class="card-badge" style="background: ${client.color}20; color: ${client.color}">
                            $${client.hourly_rate}/hr
                        </div>
                    </div>
                    <div class="card-meta">
                        ${client.email ? `<div><i class="fas fa-envelope"></i> ${client.email}</div>` : ''}
                        <div><i class="fas fa-folder"></i> ${client.project_count} projects</div>
                    </div>
                    <div class="card-stats">
                        <div class="card-stat">
                            <div class="card-stat-label">Total Hours</div>
                            <div class="card-stat-value">${client.total_hours}h</div>
                        </div>
                        <div class="card-stat">
                            <div class="card-stat-label">Revenue</div>
                            <div class="card-stat-value">$${client.total_revenue}</div>
                        </div>
                    </div>
                `;
                card.addEventListener('click', () => this.editClient(client.id));
                grid.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    }
    
    async loadProjects() {
        try {
            const response = await this.apiCall('/api/projects/');
            this.projects = response.projects;
            
            const grid = document.getElementById('projectsGrid');
            
            if (this.projects.length === 0) {
                grid.innerHTML = '<div class="empty-state"><i class="fas fa-folder"></i><p>No projects yet</p><button class="btn btn-primary" onclick="timeTracker.showProjectModal()">Add First Project</button></div>';
                return;
            }
            
            grid.innerHTML = '';
            this.projects.forEach(project => {
                const card = document.createElement('div');
                card.className = 'project-card';
                
                let statusColor = '#00d4ff';
                if (project.status === 'paused') statusColor = '#ffaa00';
                if (project.status === 'completed') statusColor = '#00ff88';
                if (project.status === 'archived') statusColor = '#666';
                
                card.innerHTML = `
                    <div class="card-header">
                        <div>
                            <div class="card-title">${project.name}</div>
                            <div class="text-secondary">${project.client_name}</div>
                        </div>
                        <div class="card-badge" style="background: ${statusColor}20; color: ${statusColor}">
                            ${project.status}
                        </div>
                    </div>
                    <div class="card-meta">
                        ${project.description ? `<div>${project.description}</div>` : ''}
                        ${project.hourly_rate ? `<div><i class="fas fa-dollar-sign"></i> $${project.hourly_rate}/hr</div>` : ''}
                        ${project.budget_hours ? `<div><i class="fas fa-clock"></i> ${project.budget_hours}h budget</div>` : ''}
                    </div>
                    <div class="card-stats">
                        <div class="card-stat">
                            <div class="card-stat-label">Hours</div>
                            <div class="card-stat-value">${project.total_hours}h</div>
                        </div>
                        <div class="card-stat">
                            <div class="card-stat-label">Revenue</div>
                            <div class="card-stat-value">$${project.total_revenue}</div>
                        </div>
                        ${project.budget_percentage !== null ? `
                        <div class="card-stat">
                            <div class="card-stat-label">Budget Used</div>
                            <div class="card-stat-value">${Math.round(project.budget_percentage)}%</div>
                        </div>
                        ` : ''}
                    </div>
                `;
                card.addEventListener('click', () => this.showTasksForProject(project.id));
                grid.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }
    
    async loadTasks() {
        try {
            const response = await this.apiCall('/api/tasks/');
            this.tasks = response.tasks;
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }
    
    async loadReports() {
        const reportContent = document.getElementById('reportContent');
        reportContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <p>Reports feature coming soon</p>
                <p class="text-secondary">Generate detailed reports, invoices, and analytics</p>
            </div>
        `;
    }
    
    // Client Management
    showClientModal(clientId = null) {
        if (clientId) {
            // Edit mode - load client data
            const client = this.clients.find(c => c.id === clientId);
            if (client) {
                document.getElementById('clientModalTitle').textContent = 'Edit Client';
                document.getElementById('clientName').value = client.name;
                document.getElementById('clientCompany').value = client.company || '';
                document.getElementById('clientEmail').value = client.email || '';
                document.getElementById('clientPhone').value = client.phone || '';
                document.getElementById('clientAddress').value = client.address || '';
                document.getElementById('clientHourlyRate').value = client.hourly_rate;
                document.getElementById('clientColor').value = client.color;
                document.getElementById('saveClient').dataset.clientId = clientId;
            }
        } else {
            // New mode
            document.getElementById('clientModalTitle').textContent = 'New Client';
            document.getElementById('clientName').value = '';
            document.getElementById('clientCompany').value = '';
            document.getElementById('clientEmail').value = '';
            document.getElementById('clientPhone').value = '';
            document.getElementById('clientAddress').value = '';
            document.getElementById('clientHourlyRate').value = '100.00';
            document.getElementById('clientColor').value = '#1E3A5F';
            delete document.getElementById('saveClient').dataset.clientId;
        }
        
        this.showModal('clientModal');
    }
    
    async editClient(clientId) {
        try {
            const response = await this.apiCall(`/api/clients/${clientId}/`);
            document.getElementById('clientModalTitle').textContent = 'Edit Client';
            document.getElementById('clientName').value = response.name;
            document.getElementById('clientCompany').value = response.company || '';
            document.getElementById('clientEmail').value = response.email || '';
            document.getElementById('clientPhone').value = response.phone || '';
            document.getElementById('clientAddress').value = response.address || '';
            document.getElementById('clientHourlyRate').value = response.hourly_rate;
            document.getElementById('clientColor').value = response.color;
            document.getElementById('saveClient').dataset.clientId = clientId;
            this.showModal('clientModal');
        } catch (error) {
            console.error('Error loading client:', error);
        }
    }
    
    async saveClient() {
        const clientId = document.getElementById('saveClient').dataset.clientId;
        const data = {
            name: document.getElementById('clientName').value,
            company: document.getElementById('clientCompany').value,
            email: document.getElementById('clientEmail').value,
            phone: document.getElementById('clientPhone').value,
            address: document.getElementById('clientAddress').value,
            hourly_rate: document.getElementById('clientHourlyRate').value,
            color: document.getElementById('clientColor').value
        };
        
        try {
            if (clientId) {
                // Update existing client
                await this.apiCall(`/api/clients/${clientId}/`, 'PUT', data);
                this.showNotification('Client updated successfully', 'success');
            } else {
                // Create new client
                await this.apiCall('/api/clients/', 'POST', data);
                this.showNotification('Client created successfully', 'success');
            }
            
            this.closeModal('clientModal');
            this.loadClients();
        } catch (error) {
            console.error('Error saving client:', error);
            this.showNotification('Failed to save client', 'error');
        }
    }
    
    // Project Management
    async showProjectModal() {
        // Load clients for dropdown
        await this.loadClients();
        
        const select = document.getElementById('projectClient');
        select.innerHTML = '<option value="">Select a client...</option>';
        
        this.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            select.appendChild(option);
        });
        
        // Reset form
        document.getElementById('projectModalTitle').textContent = 'New Project';
        document.getElementById('projectName').value = '';
        document.getElementById('projectDescription').value = '';
        document.getElementById('projectHourlyRate').value = '';
        document.getElementById('projectDailyRate').value = '';
        document.getElementById('projectBudgetHours').value = '';
        document.getElementById('projectStatus').value = 'active';
        document.getElementById('projectColor').value = '#3A5F1E';
        
        this.showModal('projectModal');
    }
    
    async saveProject() {
        const data = {
            client_id: document.getElementById('projectClient').value,
            name: document.getElementById('projectName').value,
            description: document.getElementById('projectDescription').value,
            hourly_rate: document.getElementById('projectHourlyRate').value || null,
            daily_rate: document.getElementById('projectDailyRate').value || null,
            budget_hours: document.getElementById('projectBudgetHours').value || null,
            status: document.getElementById('projectStatus').value,
            color: document.getElementById('projectColor').value
        };
        
        try {
            await this.apiCall('/api/projects/', 'POST', data);
            this.showNotification('Project created successfully', 'success');
            this.closeModal('projectModal');
            this.loadProjects();
        } catch (error) {
            console.error('Error saving project:', error);
            this.showNotification('Failed to save project', 'error');
        }
    }
    
    async showTasksForProject(projectId) {
        // Load projects for task creation
        await this.loadProjects();
        
        const select = document.getElementById('taskProject');
        select.innerHTML = '<option value="">Select a project...</option>';
        
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = `${project.client_name} - ${project.name}`;
            if (project.id === projectId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        this.showModal('taskModal');
    }
    
    async showTaskModal() {
        // Load projects for task creation
        await this.loadProjects();
        
        const select = document.getElementById('taskProject');
        select.innerHTML = '<option value="">Select a project...</option>';
        
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = `${project.client_name} - ${project.name}`;
            select.appendChild(option);
        });
        
        // Reset form
        document.getElementById('taskModalTitle').textContent = 'New Task';
        document.getElementById('taskName').value = '';
        document.getElementById('taskDescription').value = '';
        document.getElementById('taskEstimatedHours').value = '';
        
        this.showModal('taskModal');
    }
    
    async saveTask() {
        const data = {
            project_id: document.getElementById('taskProject').value,
            name: document.getElementById('taskName').value,
            description: document.getElementById('taskDescription').value,
            estimated_hours: document.getElementById('taskEstimatedHours').value || null
        };
        
        try {
            await this.apiCall('/api/tasks/', 'POST', data);
            this.showNotification('Task created successfully', 'success');
            this.closeModal('taskModal');
            await this.loadTasks();
            if (this.currentView === 'tasks') {
                this.loadTasksView();
            }
        } catch (error) {
            console.error('Error saving task:', error);
            this.showNotification('Failed to save task', 'error');
        }
    }
    
    // Entry Management
    async showEntryModal() {
        await this.loadTasks();
        
        const select = document.getElementById('entryTask');
        select.innerHTML = '<option value="">Select a task...</option>';
        
        this.tasks.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.display_name;
            select.appendChild(option);
        });
        
        // Set default date and time
        const now = new Date();
        document.getElementById('entryDate').valueAsDate = now;
        document.getElementById('entryStartTime').value = '09:00';
        document.getElementById('entryEndTime').value = '17:00';
        document.getElementById('entryDescription').value = '';
        document.getElementById('entryBillable').checked = true;
        
        this.showModal('entryModal');
    }
    
    async saveEntry() {
        const date = document.getElementById('entryDate').value;
        const startTime = document.getElementById('entryStartTime').value;
        const endTime = document.getElementById('entryEndTime').value;
        
        const data = {
            task_id: document.getElementById('entryTask').value,
            start_time: `${date}T${startTime}:00`,
            end_time: `${date}T${endTime}:00`,
            description: document.getElementById('entryDescription').value,
            is_billable: document.getElementById('entryBillable').checked
        };
        
        try {
            await this.apiCall('/api/entries/', 'POST', data);
            this.showNotification('Entry created successfully', 'success');
            this.closeModal('entryModal');
            
            if (this.currentView === 'dashboard') {
                this.loadDashboard();
            } else if (this.currentView === 'timesheet') {
                this.loadEntries();
            }
        } catch (error) {
            console.error('Error saving entry:', error);
            this.showNotification('Failed to save entry', 'error');
        }
    }
    
    async deleteEntry(entryId) {
        if (!confirm('Are you sure you want to delete this entry?')) return;
        
        try {
            await this.apiCall(`/api/entries/${entryId}/`, 'DELETE');
            this.showNotification('Entry deleted successfully', 'success');
            this.loadEntries();
        } catch (error) {
            console.error('Error deleting entry:', error);
            this.showNotification('Failed to delete entry', 'error');
        }
    }
    
    // Modal Management
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
    
    // Notifications
    async editEntry(entryId) {
        try {
            const entry = await this.apiCall(`/api/entries/${entryId}/`);
            // For now, just show a message - you can implement a modal later
            const newDescription = prompt('Edit description:', entry.description);
            if (newDescription !== null) {
                await this.apiCall(`/api/entries/${entryId}/`, 'PUT', {
                    description: newDescription
                });
                this.loadDashboard();
                this.showNotification('Entry updated', 'success');
            }
        } catch (error) {
            console.error('Error editing entry:', error);
            this.showNotification('Failed to edit entry', 'error');
        }
    }
    
    async deleteEntry(entryId) {
        if (confirm('Are you sure you want to delete this entry?')) {
            try {
                await this.apiCall(`/api/entries/${entryId}/`, 'DELETE');
                this.loadDashboard();
                this.showNotification('Entry deleted', 'success');
            } catch (error) {
                console.error('Error deleting entry:', error);
                this.showNotification('Failed to delete entry', 'error');
            }
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#00d4ff'};
            color: #000;
            border-radius: 0.5rem;
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // API Helper
    async apiCall(url, method = 'GET', data = null) {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        
        const options = {
            method: method,
            headers: {
                'X-CSRFToken': csrfToken,
            }
        };
        
        if (data && method !== 'GET') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`/time-tracker${url}`, options);
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        
        if (method === 'DELETE') {
            return {};
        }
        
        return await response.json();
    }
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize app
let timeTracker;
document.addEventListener('DOMContentLoaded', () => {
    timeTracker = new TimeTracker();
});