# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

Django-based Kanban Board application with the following structure:
- `kanban_project/` - Main Django project configuration
- `kanban_app/` - Main application with models, views, templates
- `venv/` - Python virtual environment
- SQLite database for data persistence

## Development Commands

### Virtual Environment & Dependencies
```bash
source venv/bin/activate  # Activate virtual environment
pip install django        # Install Django (if needed)
```

### Database Operations
```bash
python manage.py makemigrations  # Create new migrations
python manage.py migrate         # Apply migrations
```

### Running the Application
```bash
python manage.py runserver       # Start development server on http://127.0.0.1:8000
```

### Creating Test Data
```bash
python manage.py shell           # Open Django shell for testing
```

## Architecture Overview

### Models (kanban_app/models.py)
- **Task**: Main model with fields for title, description, priority, status, board_type, timestamps, and position
- Status options: BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE
- Board types: WORK, PRIVATE

### Views (kanban_app/views.py)
- `index` - Renders main HTML template
- `get_tasks` - GET API for fetching tasks by board type
- `create_task` - POST API for creating new tasks
- `update_task` - PUT API for updating existing tasks
- `delete_task` - DELETE API for removing tasks
- `move_task` - PATCH API for drag & drop functionality

### URLs
- `/` - Main application
- `/api/tasks/board/<board_type>/` - Get tasks for specific board
- `/api/tasks/create/` - Create new task
- `/api/tasks/<id>/update/` - Update task
- `/api/tasks/<id>/delete/` - Delete task
- `/api/tasks/<id>/move/` - Move task between columns

### Frontend
- Single Page Application using vanilla JavaScript
- Drag & Drop functionality between columns
- Modal system for all CRUD operations (no browser popups)
- Dark theme with minimalist futuristic design
- Work/Private board toggle

## Important Notes

- Always use `pk` instead of `id` when querying Django models with get_object_or_404
- URL patterns must be specific to avoid conflicts between different HTTP methods
- CSRF token is required for all POST/PUT/DELETE/PATCH requests
- Static files are served from `kanban_app/static/kanban_app/`
- Templates are in `kanban_app/templates/kanban_app/`