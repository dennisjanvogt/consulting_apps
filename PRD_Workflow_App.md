# Product Requirements Document — Workflow App

## Ziel
Eine schlanke, aber leistungsfähige Workflow-App im gleichen Look & Feel wie Storage und OpenRouter: dunkles UI, dezente Akzente in dunklem Blau. Nutzer erstellen Workflow-Templates mit Hauptpunkten und Unterpunkten, definieren Zwischenfristen (x Tage vor Endfrist) und starten daraus Workflows mit Enddatum. Für die laufenden Workflows können Status und Einzeltermine gepflegt werden.

## Kernfunktionen
- Templates verwalten
  - Template anlegen: Titel, Beschreibung
  - Hauptpunkte und Unterpunkte hinzufügen
  - Je Punkt: Zwischenfrist in Tagen vor Endfrist (due_offset_days)
  - Templates löschen
- Workflows starten
  - Aus Template starten mit Titel und Endfrist (due_date)
  - Automatische Übernahme der Struktur in Workflow-Items
  - Je Item: berechnetes Fälligkeitsdatum (Endfrist minus Zwischenfrist)
- Workflows verwalten
  - Liste aktiver Workflows
  - Detailansicht mit hierarchischen Items
  - Je Item: Status (TODO/IN_PROGRESS/DONE) ändern
  - Je Item: Fälligkeitsdatum anpassen (übersteuert die berechnete Frist)

## Datenmodell
- WorkflowTemplate(user, title, description, created_at)
- TemplateNode(template, title, parent, order, due_offset_days)
- Workflow(user, template, title, due_date, status, created_at)
- WorkflowItem(workflow, title, parent, order, status, due_date, due_offset_days)

## API-Endpunkte
- GET/POST `/workflow/api/templates/` — Templates listen/anlegen
- GET/POST `/workflow/api/templates/<id>/nodes/` — Knoten listen/hinzufügen
- POST `/workflow/api/templates/<id>/delete/` — Template löschen
- GET/POST `/workflow/api/workflows/` — Workflows listen/anlegen
- GET `/workflow/api/workflows/<id>/` — Workflow + Items
- PATCH `/workflow/api/items/<id>/update/` — Item aktualisieren (Status, due_date, order, title)

## UI
- Register “Templates” und “Workflows”
- Templates: Kartenliste, Aktionen (Bearbeiten, Starten, Löschen)
- Template-Editor: Haupt- & Unterpunkte mit Zwischenfrist
- Workflows: Kartenliste; Detailansicht mit Hierarchie, Status-Auswahl, Datumsfeld

## Design
- Dunkles Theme, Akzent: Blau (#1E3A5F)
- Gleiche UI-Bausteine wie andere Apps (Header, Cards, Modals, Buttons)

## Nicht-Ziele (vorerst)
- Kollaboration/Sharing
- Benachrichtigungen/Reminders
- Drag & Drop-Ordering (manuell möglich via order-Feld-Erweiterung später)

