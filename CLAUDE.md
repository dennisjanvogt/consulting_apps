# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Django Workspace Hub with multiple integrated applications:
- **Kanban Board** - Task management with drag & drop
- **OpenRouter Chat** - AI chat interface with multiple model support
- **Storage App** - File storage management
- **Time Tracker** - Time tracking functionality
- **Authentication** - Centralized user authentication

## Development Commands

```bash
# Virtual Environment
source venv/bin/activate         # Activate virtual environment

# Database Management
python manage.py makemigrations  # Create new migrations
python manage.py migrate         # Apply migrations to database

# Development Server
python manage.py runserver       # Start server on http://127.0.0.1:8000

# Testing
python manage.py test            # Run all tests
python manage.py test kanban_app # Run specific app tests
python manage.py shell           # Django shell for debugging

# Management Commands
python manage.py encrypt_api_keys  # Encrypt API keys in OpenRouter app
```

## Architecture

### Project Structure
- `overhead/` - Main Django project configuration (settings.py, urls.py)
- `kanban_app/` - Kanban board application  
- `openrouter_chat/` - OpenRouter AI chat interface
- `storage_app/` - File storage management
- `time_tracker/` - Time tracking application
- `authentication/` - Central authentication system
- `db.sqlite3` - SQLite database
- `venv/` - Python virtual environment

### Key URLs
- `/` - Landing page with app cards
- `/auth/` - Authentication (login/logout/register)
- `/kanban/` - Kanban board application
- `/openrouter/` - OpenRouter chat interface
- `/storage/` - Storage application
- `/time-tracker/` - Time tracking app
- `/admin/` - Django admin interface

### Kanban App API Endpoints
All require authentication:
- `GET /kanban/api/tasks/board/<board_type>/` - Fetch tasks (WORK/PRIVATE)
- `POST /kanban/api/tasks/create/` - Create new task
- `PUT /kanban/api/tasks/<id>/update/` - Update task
- `DELETE /kanban/api/tasks/<id>/delete/` - Delete task  
- `PATCH /kanban/api/tasks/<id>/move/` - Move task (drag & drop)

### Database Models

**kanban_app.Task**
- user (ForeignKey to User)
- title, description
- priority (HIGH/MEDIUM/LOW)
- status (BACKLOG/TODO/IN_PROGRESS/IN_REVIEW/DONE)
- board_type (WORK/PRIVATE)
- position (for ordering)
- timestamps (created_at, updated_at)

**openrouter_chat.ChatSession**
- user, title, model
- messages (related)
- timestamps

**openrouter_chat.Message**
- session (ForeignKey)
- role (user/assistant/system)
- content, model
- token counts and cost tracking

## Technical Requirements

- Django 5.2.6+
- Python 3.12
- SQLite3
- Authentication required for all apps
- CSRF protection on all POST/PUT/DELETE/PATCH requests
- Media files stored in `/media/` directory
- Static files per app: `<app>/static/<app>/`
- Templates per app: `<app>/templates/<app>/`

## Key Implementation Notes

- Always use `pk` instead of `id` when using get_object_or_404
- User foreign keys should cascade on delete
- All views require @login_required decorator
- Frontend uses vanilla JavaScript (no frameworks)
- Dark futuristic theme across all applications
- Modal system for forms (avoid browser popups)
- API responses should return JsonResponse
- Decimal fields for financial data (costs)