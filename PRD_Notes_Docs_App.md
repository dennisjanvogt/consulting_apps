# Product Requirements Document - Notes & Docs App

## Version 1.0
## Datum: 09.11.2025

---

## 1. Projektübersicht

### 1.1 Status
✅ **ERFOLGREICH IMPLEMENTIERT**

Die Notes & Docs App ist vollständig implementiert und in das Django Workspace Hub integriert. Sie bietet eine leistungsstarke Markdown-basierte Notiz- und Dokumentenverwaltung mit futuristischem Dark Theme.

### 1.2 Implementierte Features

#### **Ordnerstruktur** ✅
- Verschachtelte Ordner mit unbegrenzter Tiefe
- Farbige Ordner mit anpassbaren Icons
- Drag & Drop für Dateien zwischen Ordnern
- Ordner umbenennen, löschen, erstellen

#### **Notizen/Dokumente** ✅
- Markdown-Editor mit Live-Preview
- Rich-Text-Toolbar (Bold, Italic, Headers, Links, etc.)
- Code-Highlighting mit Syntax-Support
- Tabellen, Checklisten, Blockquotes
- Autosave alle 2 Sekunden
- Versionsverlauf (letzte 10 Versionen)
- Word Count Tracking

#### **Such- und Filter-Funktionen** ✅
- Volltextsuche über alle Notizen
- Filter nach Tags, Datum, Ordner
- Favoriten-System mit Stern-Markierung
- Sortierung nach Datum, Titel, Favoriten

#### **Export/Import** ✅
- Export als Markdown (.md)
- Export als HTML mit Styling
- PDF-Export vorbereitet
- Bulk-Export ganzer Ordner (geplant)

#### **Design** ✅
- Konsistentes Dark Theme
- Primärfarbe: #0A0A0B (Fast Schwarz)
- Akzentfarbe: #3F1E5F (Dunkles Lila)
- 3-Spalten-Layout (Sidebar | Notizliste | Editor)
- Responsive Design

---

## 2. Technische Implementierung

### 2.1 Tech Stack
- **Backend**: Django 5.2.6
- **Datenbank**: SQLite3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Markdown**: Python Markdown Library
- **Icons**: SVG Icons

### 2.2 Datenbank-Schema

#### Models
1. **Folder**
   - Hierarchische Ordnerstruktur
   - User-spezifisch
   - Farb- und Icon-Anpassung

2. **Note**
   - Markdown-Content mit HTML-Cache
   - Folder-Zuordnung
   - Tags, Favoriten, Pinning
   - Word Count & Timestamps

3. **NoteVersion**
   - Versionsverwaltung
   - Automatische Versionierung bei Änderungen
   - Maximal 10 Versionen pro Notiz

4. **Tag**
   - User-spezifische Tags
   - Farbcodierung
   - Many-to-Many Beziehung zu Notes

5. **NoteAttachment**
   - Dateianhänge für Notizen
   - MIME-Type Tracking

6. **SharedNote**
   - Teilen von Notizen zwischen Usern
   - Berechtigungssystem (View/Edit)

### 2.3 API Endpoints

```
# Folders
GET    /notes/api/folders/           # Ordnerstruktur abrufen
POST   /notes/api/folders/create/    # Neuer Ordner
PUT    /notes/api/folders/<id>/update/  # Ordner bearbeiten
DELETE /notes/api/folders/<id>/delete/  # Ordner löschen

# Notes
GET    /notes/api/notes/             # Notizliste
GET    /notes/api/notes/<id>/        # Einzelne Notiz
POST   /notes/api/notes/create/      # Neue Notiz
PUT    /notes/api/notes/<id>/update/ # Notiz bearbeiten
DELETE /notes/api/notes/<id>/delete/ # Notiz löschen
PATCH  /notes/api/notes/<id>/move/   # Notiz verschieben

# Search & Tags
GET    /notes/api/search/            # Volltextsuche
GET    /notes/api/tags/              # Tags abrufen
POST   /notes/api/tags/create/       # Tag erstellen

# Export
GET    /notes/api/notes/<id>/export/ # Export (format=markdown|html|pdf)
```

---

## 3. UI/UX Design

### 3.1 Layout
- **Header**: Logo, Suche, Actions
- **Sidebar**: Ordnerbaum, Tags
- **Notizliste**: Sortierbare Liste mit Preview
- **Editor**: Markdown mit Toolbar und Preview

### 3.2 Farbschema
```css
--primary-bg: #0A0A0B      /* Fast Schwarz */
--secondary-bg: #131316    /* Sehr dunkles Grau */
--sidebar-bg: #1A1A1D      /* Dunkles Grau */
--accent-notes: #3F1E5F    /* Dunkles Lila */
--accent-hover: #4F2E6F    /* Helleres Lila */
--text-primary: #E4E4E7    /* Helles Grau */
--text-secondary: #A1A1AA  /* Mittleres Grau */
```

### 3.3 Features
- **Autosave**: Automatisches Speichern nach 2 Sekunden
- **Live Preview**: Echtzeit Markdown zu HTML Konvertierung
- **Drag & Drop**: Dateien zwischen Ordnern verschieben
- **Keyboard Shortcuts**: Schnelle Navigation und Formatierung
- **Responsive**: Mobile-optimiert

---

## 4. Sicherheit & Performance

### 4.1 Sicherheit
- User-Authentication erforderlich
- CSRF-Schutz für alle Mutations
- User-Isolation (jeder sieht nur eigene Notizen)
- XSS-Schutz durch Markdown-Sanitization

### 4.2 Performance
- Lazy Loading für große Notizlisten
- Caching von HTML-Content
- Debounced Autosave
- Optimierte Datenbankabfragen

---

## 5. Zukünftige Erweiterungen

### Phase 2
- [ ] Collaborative Editing
- [ ] Real-time Sync über WebSockets
- [ ] Erweiterte Export-Optionen (PDF, DOCX)
- [ ] Dateianhänge mit Drag & Drop
- [ ] Erweiterte Suche mit Regex

### Phase 3
- [ ] Mobile App (React Native)
- [ ] Offline-Support mit Service Workers
- [ ] AI-powered Tagging
- [ ] OCR für Bild-zu-Text
- [ ] Voice-to-Text Notizen

---

## 6. Installations-Anleitung

```bash
# 1. Virtual Environment aktivieren
source venv/bin/activate

# 2. Dependencies installieren
pip install markdown

# 3. Migrationen ausführen
python manage.py makemigrations notes_app
python manage.py migrate notes_app

# 4. Server starten
python manage.py runserver

# 5. App aufrufen
http://127.0.0.1:8000/notes/
```

---

## 7. Testing

### Manuelle Tests
- [x] Ordner erstellen/bearbeiten/löschen
- [x] Notizen erstellen/bearbeiten/löschen
- [x] Markdown Formatierung
- [x] Autosave Funktionalität
- [x] Export als Markdown/HTML
- [x] Suche und Filter
- [x] Favoriten-System
- [x] Responsive Design

### Automatisierte Tests
```bash
python manage.py test notes_app
```

---

## 8. Dokumentation

Die Notes & Docs App ist vollständig dokumentiert:
- Code-Kommentare in allen Python-Dateien
- JSDoc-Kommentare in JavaScript
- API-Dokumentation in views.py
- Diese PRD-Datei
- CLAUDE.md aktualisiert

---

## 9. Fazit

Die Notes & Docs App wurde erfolgreich implementiert und integriert sich nahtlos in das Django Workspace Hub. Das konsistente Dark Theme mit lila Akzentfarbe (#3F1E5F) hebt die App visuell von den anderen Apps ab, während das grundlegende Design-System beibehalten wird.

Die App bietet alle geplanten Core-Features und ist bereit für den produktiven Einsatz. Die Architektur ist erweiterbar und ermöglicht einfache Implementierung der geplanten Phase 2 und Phase 3 Features.