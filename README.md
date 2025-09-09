# Minimalistisches Kanban Board

Ein futuristisches, minimalistisches Kanban-Board mit Django und SQLite.

## Features

- ✅ 5 Spalten: Backlog, To-Do, In Progress, In Review, Done
- ✅ Work/Private Board Umschaltung
- ✅ Drag & Drop zwischen Spalten
- ✅ CRUD-Operationen über Modale (keine Browser-Popups)
- ✅ Dunkles, minimalistisches Design
- ✅ Prioritäten (Hoch, Mittel, Niedrig) mit visueller Kennzeichnung
- ✅ SQLite Datenbank
- ✅ Responsive Design

## Installation

1. Virtual Environment aktivieren:
```bash
source venv/bin/activate
```

2. Django installieren (falls noch nicht geschehen):
```bash
pip install django
```

3. Migrationen ausführen:
```bash
python manage.py migrate
```

4. Server starten:
```bash
python manage.py runserver
```

5. Browser öffnen und zu http://127.0.0.1:8000 navigieren

## Verwendung

### Neue Aufgabe erstellen
- Klicken Sie auf den runden "+" Button in der oberen rechten Ecke
- Füllen Sie das Formular aus
- Klicken Sie auf "Speichern"

### Aufgabe bearbeiten
- Hover über eine Aufgabe
- Klicken Sie auf das Stift-Icon
- Bearbeiten Sie die Aufgabe im Modal
- Klicken Sie auf "Speichern"

### Aufgabe löschen
- Hover über eine Aufgabe
- Klicken Sie auf das Papierkorb-Icon
- Bestätigen Sie die Löschung

### Aufgabe verschieben
- Drag & Drop: Ziehen Sie eine Aufgabe in eine andere Spalte
- Oder: Bearbeiten Sie die Aufgabe und ändern Sie den Status

### Board wechseln
- Nutzen Sie den Work/Private Toggle in der oberen Mitte
- Jedes Board hat seine eigenen Aufgaben

## Technologie-Stack

- **Backend**: Django 5.2.6
- **Datenbank**: SQLite3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Design**: Minimalistisch, Futuristisch, Dunkles Theme

## Farbschema

- Primär: #0A0A0A (Fast Schwarz)
- Sekundär: #1A1A1A (Sehr dunkles Grau)
- Akzent: #1E3A5F (Dunkles Blau)
- Text: #E0E0E0 (Helles Grau)

## Entwicklung

Das Projekt nutzt Django's Standard-Entwicklungsserver. Für Produktionsumgebungen sollten entsprechende Anpassungen vorgenommen werden (z.B. DEBUG=False, sichere SECRET_KEY, etc.).