# Product Requirements Document - Minimalistisches Kanban Board

## 1. Produktübersicht

### 1.1 Produktname
**Minimal Kanban Board**

### 1.2 Vision
Ein minimalistisches, futuristisch gestaltetes Kanban-Board zur effizienten Verwaltung von Aufgaben in getrennten Work- und Private-Bereichen.

### 1.3 Zielgruppe
- Einzelpersonen, die ihre beruflichen und privaten Aufgaben organisieren möchten
- Nutzer, die eine klare visuelle Trennung zwischen Arbeit und Privatleben bevorzugen

## 2. Funktionale Anforderungen

### 2.1 Kanban-Board Struktur

#### 2.1.1 Spalten (5 Stück)
1. **Backlog** - Sammlung aller zukünftigen Aufgaben
2. **To-Do** - Aufgaben, die als nächstes bearbeitet werden sollen
3. **In Progress** - Aktuell in Bearbeitung befindliche Aufgaben
4. **In Review / No Review** - Aufgaben zur Überprüfung oder direkt fertig
5. **Done** - Abgeschlossene Aufgaben

#### 2.1.2 Board-Modi
- **Work Board** - Für berufliche Aufgaben
- **Private Board** - Für persönliche Aufgaben
- Umschaltung über Toggle-Switch in der Hauptnavigation

### 2.2 Task-Management

#### 2.2.1 Task-Eigenschaften
- **Titel** (Pflichtfeld, max. 100 Zeichen)
- **Beschreibung** (Optional, max. 500 Zeichen)
- **Priorität** (Hoch, Mittel, Niedrig)
- **Erstelldatum** (Automatisch)
- **Board-Typ** (Work/Private)
- **Status** (Backlog/To-Do/In Progress/In Review/Done)

#### 2.2.2 Task-Operationen
- **Erstellen** - Über "+" Button oder Shortcut
- **Bearbeiten** - Doppelklick oder Edit-Icon
- **Löschen** - Delete-Icon mit Bestätigung
- **Verschieben** - Drag & Drop zwischen Spalten
- **Archivieren** - Automatisch nach 30 Tagen in Done

### 2.3 Modal-System

#### 2.3.1 Task-Erstellung Modal
- Formular mit allen Task-Eigenschaften
- Validierung in Echtzeit
- Speichern/Abbrechen Buttons

#### 2.3.2 Task-Bearbeitung Modal
- Vorausgefülltes Formular
- Änderungshistorie (optional für v2)
- Speichern/Abbrechen/Löschen Buttons

#### 2.3.3 Lösch-Bestätigung Modal
- Warnung mit Task-Titel
- Bestätigen/Abbrechen Buttons

## 3. Technische Anforderungen

### 3.1 Tech-Stack
- **Backend**: Django 5.0+
- **Datenbank**: SQLite3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Python-Umgebung**: Virtual Environment (venv)

### 3.2 Architektur

#### 3.2.1 Django-Struktur
```
kanban_project/
├── manage.py
├── kanban_project/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── kanban_app/
│   ├── models.py (Task, Board)
│   ├── views.py
│   ├── urls.py
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   └── templates/
└── db.sqlite3
```

#### 3.2.2 Datenmodell
```python
Task:
- id: Integer (PK)
- title: String(100)
- description: Text(500)
- priority: Enum(HIGH, MEDIUM, LOW)
- status: Enum(BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE)
- board_type: Enum(WORK, PRIVATE)
- created_at: DateTime
- updated_at: DateTime

Board:
- id: Integer (PK)
- type: Enum(WORK, PRIVATE)
- user_id: Foreign Key (für zukünftige Multi-User Unterstützung)
```

### 3.3 API-Endpunkte
- `GET /api/tasks/{board_type}` - Alle Tasks eines Boards
- `POST /api/tasks/` - Neuen Task erstellen
- `PUT /api/tasks/{id}` - Task aktualisieren
- `DELETE /api/tasks/{id}` - Task löschen
- `PATCH /api/tasks/{id}/move` - Task zwischen Spalten verschieben

## 4. Design-Anforderungen

### 4.1 Farbschema
- **Primär**: #0A0A0A (Fast Schwarz)
- **Sekundär**: #1A1A1A (Sehr dunkles Grau)
- **Akzent**: #1E3A5F (Dunkles Blau)
- **Text**: #E0E0E0 (Helles Grau)
- **Erfolg**: #0F4C2A (Dunkelgrün)
- **Warnung**: #4C2A0F (Dunkelorange)

### 4.2 UI-Komponenten

#### 4.2.1 Layout
- Single Page Application
- Responsive Grid (5 Spalten)
- Minimale Abstände (8px Grid-System)
- Keine sichtbaren Rahmen, nur subtile Schatten

#### 4.2.2 Typography
- Font: System Font Stack (San Francisco, Segoe UI, Roboto)
- Größen: 12px (Klein), 14px (Normal), 18px (Überschriften)
- Gewicht: 300 (Light), 400 (Regular), 600 (Semibold)

#### 4.2.3 Interaktionen
- Hover-Effekte: Leichte Aufhellung (opacity: 0.8)
- Transitions: 200ms ease-in-out
- Drag & Drop: Ghost-Element mit 50% Opacity
- Modals: Backdrop mit blur(4px)

### 4.3 Responsive Design
- Desktop First (1920px)
- Tablet (768px - 1919px): 3 Spalten mit horizontalem Scroll
- Mobile (< 768px): 1 Spalte mit Tab-Navigation

## 5. Nicht-funktionale Anforderungen

### 5.1 Performance
- Ladezeit: < 2 Sekunden
- Task-Operationen: < 200ms Response Time
- Smooth Drag & Drop (60 FPS)

### 5.2 Sicherheit
- CSRF-Schutz (Django built-in)
- SQL-Injection Prävention (Django ORM)
- XSS-Schutz (Template Escaping)

### 5.3 Benutzerfreundlichkeit
- Keyboard Shortcuts (Strg+N für neuen Task)
- Undo-Funktion für kritische Aktionen
- Auto-Save bei Drag & Drop
- Visuelles Feedback für alle Aktionen

## 6. Zukünftige Erweiterungen (v2.0)
- Multi-User Support mit Authentifizierung
- Task-Labels und Filterung
- Zeiterfassung pro Task
- Export-Funktion (CSV, JSON)
- Dark/Light Mode Toggle
- Mobile App (React Native)
- Benachrichtigungen
- Kommentare zu Tasks
- Dateianhänge

## 7. Erfolgskriterien
- Alle 5 Spalten funktionsfähig
- Drag & Drop zwischen allen Spalten
- Work/Private Toggle funktioniert
- Alle CRUD-Operationen über Modals
- Responsive auf Desktop
- Ladezeit unter 2 Sekunden
- Keine Browser-Popups, nur UI-Modals