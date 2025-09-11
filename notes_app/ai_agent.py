"""
AI Agent for Notes & Docs App
Handles AI-powered document generation using OpenRouter API
"""

import json
import requests
from typing import Dict, Optional, List
from django.contrib.auth.models import User

# Document Templates
DOCUMENT_TEMPLATES = {
    'technical_doc': {
        'name': 'Technical Documentation',
        'icon': '📝',
        'system_prompt': """Du bist ein technischer Dokumentations-Experte. Erstelle strukturierte, klare und vollständige technische Dokumentation.""",
        'user_prompt': """Erstelle eine technische Dokumentation für: {topic}

Beschreibung/Anforderungen: {description}

Bitte strukturiere das Dokument mit folgenden Sections:
1. Übersicht
2. Technische Details
3. Installation/Setup (falls relevant)
4. Verwendung mit Code-Beispielen
5. API-Referenz (falls relevant)
6. Konfiguration
7. Troubleshooting
8. Best Practices
9. Weitere Ressourcen

Verwende Markdown-Formatierung mit Headings, Code-Blocks, Listen und Tabellen wo angebracht."""
    },
    
    'tutorial': {
        'name': 'Tutorial/How-To Guide',
        'icon': '📚',
        'system_prompt': """Du bist ein erfahrener Tutorial-Autor. Erstelle verständliche, schrittweise Anleitungen mit praktischen Beispielen.""",
        'user_prompt': """Erstelle ein Tutorial/How-To Guide für: {topic}

Beschreibung/Anforderungen: {description}

Struktur:
1. Einleitung - Was werden wir lernen?
2. Voraussetzungen
3. Schritt-für-Schritt Anleitung
4. Code-Beispiele und Screenshots-Platzhalter
5. Häufige Fehler und wie man sie vermeidet
6. Zusammenfassung
7. Weiterführende Übungen

Schreibe in einem freundlichen, ermutigenden Ton mit klaren Erklärungen."""
    },
    
    'meeting_notes': {
        'name': 'Meeting Notes',
        'icon': '📊',
        'system_prompt': """Du bist ein professioneller Meeting-Protokollant. Erstelle strukturierte, actionable Meeting Notes.""",
        'user_prompt': """Erstelle Meeting Notes für: {topic}

Details: {description}

Format:
# Meeting: {topic}
## Datum & Teilnehmer
## Agenda
## Diskussionspunkte
## Entscheidungen
## Action Items
- [ ] Task 1 - Verantwortlich: [Name] - Deadline: [Datum]
## Nächste Schritte
## Anhänge/Referenzen"""
    },
    
    'prd': {
        'name': 'Product Requirements Document',
        'icon': '💡',
        'system_prompt': """Du bist ein Product Manager. Erstelle detaillierte, klare Product Requirements Documents.""",
        'user_prompt': """Erstelle ein Product Requirements Document (PRD) für: {topic}

Beschreibung: {description}

Struktur:
1. Executive Summary
2. Problemstellung
3. Ziele und Success Metrics
4. User Stories / Use Cases
5. Funktionale Anforderungen
6. Nicht-funktionale Anforderungen
7. Technische Spezifikationen
8. UI/UX Überlegungen
9. Timeline & Milestones
10. Risiken und Abhängigkeiten
11. Anhänge"""
    },
    
    'research': {
        'name': 'Research Summary',
        'icon': '🔍',
        'system_prompt': """Du bist ein Research Analyst. Erstelle umfassende, gut strukturierte Research Summaries.""",
        'user_prompt': """Erstelle eine Research Summary für: {topic}

Fokus: {description}

Struktur:
1. Executive Summary
2. Hintergrund
3. Methodik
4. Haupterkenntnisse
5. Detaillierte Analyse
6. Vergleiche und Benchmarks
7. Schlussfolgerungen
8. Empfehlungen
9. Quellen und Referenzen"""
    },
    
    'api_doc': {
        'name': 'API Documentation',
        'icon': '📋',
        'system_prompt': """Du bist ein API Documentation Spezialist. Erstelle vollständige, entwicklerfreundliche API-Dokumentation.""",
        'user_prompt': """Erstelle API Dokumentation für: {topic}

Details: {description}

Struktur:
1. API Übersicht
2. Authentication
3. Base URL und Versionierung
4. Endpoints
   - Methode, Path, Beschreibung
   - Request Parameters
   - Request Body (mit Beispielen)
   - Response Format (mit Beispielen)
   - Status Codes
5. Error Handling
6. Rate Limiting
7. Code Examples (curl, Python, JavaScript)
8. SDKs und Libraries
9. Changelog"""
    },
    
    'feature_spec': {
        'name': 'Feature Specification',
        'icon': '🎯',
        'system_prompt': """Du bist ein Software Architect. Erstelle detaillierte Feature Specifications.""",
        'user_prompt': """Erstelle eine Feature Specification für: {topic}

Anforderungen: {description}

Struktur:
1. Feature Übersicht
2. Business Value
3. User Journey
4. Funktionale Spezifikation
5. Technische Implementierung
6. Datenmodell
7. API Design
8. UI/UX Mockups (Beschreibung)
9. Testing Strategy
10. Rollout Plan
11. Success Metrics"""
    },
    
    'user_manual': {
        'name': 'User Manual',
        'icon': '📖',
        'system_prompt': """Du bist ein Technical Writer für Endbenutzer-Dokumentation. Erstelle verständliche, hilfreiche User Manuals.""",
        'user_prompt': """Erstelle ein User Manual für: {topic}

Zielgruppe und Details: {description}

Struktur:
1. Willkommen
2. Erste Schritte
3. Hauptfunktionen (mit Screenshots-Platzhaltern)
4. Schritt-für-Schritt Anleitungen
5. Tipps und Tricks
6. Häufig gestellte Fragen (FAQ)
7. Fehlerbehebung
8. Glossar
9. Support-Kontakt"""
    },
    
    'troubleshooting': {
        'name': 'Troubleshooting Guide',
        'icon': '🔧',
        'system_prompt': """Du bist ein Support-Experte. Erstelle umfassende Troubleshooting Guides.""",
        'user_prompt': """Erstelle einen Troubleshooting Guide für: {topic}

Kontext: {description}

Format:
# Troubleshooting Guide: {topic}

## Häufige Probleme

### Problem 1: [Beschreibung]
**Symptome:**
- 
**Mögliche Ursachen:**
- 
**Lösungsschritte:**
1. 
2. 
**Wenn das nicht hilft:**
- 

[Weitere Probleme im gleichen Format]

## Diagnose-Tools
## Log-Analyse
## Kontakt Support"""
    },
    
    'custom': {
        'name': 'Custom Prompt',
        'icon': '✨',
        'system_prompt': """Du bist ein vielseitiger Dokumentations-Experte. Erstelle das angeforderte Dokument basierend auf den spezifischen Anforderungen.""",
        'user_prompt': """{description}"""
    }
}


class AIAgent:
    """AI Agent for document generation"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        
    def generate_document(
        self, 
        template_type: str, 
        topic: str, 
        description: str,
        model: str = "openai/gpt-4-turbo-preview",
        additional_context: Optional[str] = None
    ) -> Dict:
        """
        Generate a document using AI
        
        Args:
            template_type: Type of document template
            topic: Main topic/title for the document
            description: Detailed requirements or description
            model: AI model to use
            additional_context: Any additional context to include
            
        Returns:
            Dict with title and content
        """
        
        # Get template
        template = DOCUMENT_TEMPLATES.get(template_type, DOCUMENT_TEMPLATES['custom'])
        
        # Prepare messages
        messages = []
        
        # Add system prompt
        messages.append({
            'role': 'system',
            'content': template['system_prompt']
        })
        
        # Format user prompt
        user_prompt = template['user_prompt'].format(
            topic=topic,
            description=description
        )
        
        if additional_context:
            user_prompt += f"\n\nZusätzlicher Kontext:\n{additional_context}"
            
        messages.append({
            'role': 'user',
            'content': user_prompt
        })
        
        # Add title generation request
        messages.append({
            'role': 'user',
            'content': "Bitte beginne deine Antwort mit einem passenden Titel in der ersten Zeile (ohne # Markdown), gefolgt von einer Leerzeile, dann dem formatierten Dokument."
        })
        
        # Call OpenRouter API
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': model,
            'messages': messages,
            'temperature': 0.7,
            'max_tokens': 4000
        }
        
        try:
            response = requests.post(
                self.base_url,
                headers=headers,
                json=data,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if 'choices' in result and len(result['choices']) > 0:
                    content = result['choices'][0]['message']['content']
                    
                    # Extract title and content
                    lines = content.split('\n', 2)
                    title = lines[0].strip().replace('#', '').strip()
                    
                    # If title is empty or too short, generate from topic
                    if len(title) < 3:
                        title = f"{template['name']}: {topic}"
                    
                    # Get the rest as content
                    if len(lines) > 2:
                        doc_content = lines[2]
                    else:
                        doc_content = content
                    
                    # Calculate cost
                    usage = result.get('usage', {})
                    total_cost = 0
                    for cost_field in ['total_cost', 'cost', 'price', 'total_price']:
                        if cost_field in usage:
                            total_cost = usage[cost_field]
                            break
                        if cost_field in result:
                            total_cost = result[cost_field]
                            break
                    
                    return {
                        'success': True,
                        'title': title,
                        'content': doc_content,
                        'template_type': template_type,
                        'template_name': template['name'],
                        'model': model,
                        'tokens': {
                            'input': usage.get('prompt_tokens', 0),
                            'output': usage.get('completion_tokens', 0),
                            'total': usage.get('total_tokens', 0)
                        },
                        'cost': total_cost
                    }
                else:
                    return {
                        'success': False,
                        'error': 'Invalid API response format'
                    }
                    
            else:
                error_data = response.json() if response.text else {}
                return {
                    'success': False,
                    'error': error_data.get('error', {}).get('message', f'API Error: {response.status_code}')
                }
                
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'Request timeout - try again with a shorter prompt'
            }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f'Request failed: {str(e)}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}'
            }
    
    def enhance_document(
        self,
        content: str,
        instruction: str,
        model: str = "openai/gpt-3.5-turbo"
    ) -> Dict:
        """
        Enhance an existing document
        
        Args:
            content: Current document content
            instruction: What to improve/change
            model: AI model to use
            
        Returns:
            Dict with enhanced content
        """
        
        messages = [
            {
                'role': 'system',
                'content': 'Du bist ein Dokumentations-Experte. Verbessere das gegebene Dokument basierend auf den Anweisungen.'
            },
            {
                'role': 'user',
                'content': f"""Hier ist das aktuelle Dokument:

{content}

Anweisung zur Verbesserung:
{instruction}

Bitte gib das verbesserte Dokument zurück, behalte dabei die Grundstruktur bei."""
            }
        ]
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': model,
            'messages': messages,
            'temperature': 0.5,
            'max_tokens': 4000
        }
        
        try:
            response = requests.post(
                self.base_url,
                headers=headers,
                json=data,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if 'choices' in result and len(result['choices']) > 0:
                    enhanced_content = result['choices'][0]['message']['content']
                    
                    return {
                        'success': True,
                        'content': enhanced_content,
                        'model': model
                    }
                else:
                    return {
                        'success': False,
                        'error': 'Invalid API response format'
                    }
                    
            else:
                return {
                    'success': False,
                    'error': f'API Error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Error enhancing document: {str(e)}'
            }
    
    def get_available_models(self) -> List[Dict]:
        """Get list of available AI models with pricing"""
        
        # Models with pricing information (per 1M tokens)
        models = [
            {
                'id': 'openai/gpt-4-turbo-preview',
                'name': 'GPT-4 Turbo',
                'provider': 'OpenAI',
                'description': 'Most capable, best for complex documents',
                'context': 128000,
                'pricing': {'input': 10.0, 'output': 30.0},
                'speed': 'medium',
                'quality': 'excellent',
                'recommended': True
            },
            {
                'id': 'openai/gpt-4',
                'name': 'GPT-4',
                'provider': 'OpenAI',
                'description': 'High quality, detailed documents',
                'context': 8192,
                'pricing': {'input': 30.0, 'output': 60.0},
                'speed': 'slow',
                'quality': 'excellent'
            },
            {
                'id': 'openai/gpt-3.5-turbo',
                'name': 'GPT-3.5 Turbo',
                'provider': 'OpenAI',
                'description': 'Fast and cost-effective',
                'context': 16385,
                'pricing': {'input': 0.5, 'output': 1.5},
                'speed': 'fast',
                'quality': 'good',
                'budget': True
            },
            {
                'id': 'anthropic/claude-3-opus',
                'name': 'Claude 3 Opus',
                'provider': 'Anthropic',
                'description': 'Excellent for technical documentation',
                'context': 200000,
                'pricing': {'input': 15.0, 'output': 75.0},
                'speed': 'medium',
                'quality': 'excellent'
            },
            {
                'id': 'anthropic/claude-3-sonnet',
                'name': 'Claude 3 Sonnet',
                'provider': 'Anthropic',
                'description': 'Balanced performance',
                'context': 200000,
                'pricing': {'input': 3.0, 'output': 15.0},
                'speed': 'fast',
                'quality': 'very_good'
            },
            {
                'id': 'google/gemini-pro',
                'name': 'Gemini Pro',
                'provider': 'Google',
                'description': 'Google\'s advanced model',
                'context': 32768,
                'pricing': {'input': 1.0, 'output': 2.0},
                'speed': 'fast',
                'quality': 'very_good'
            },
            {
                'id': 'meta-llama/llama-3-70b-instruct',
                'name': 'Llama 3 70B',
                'provider': 'Meta',
                'description': 'Open source, high quality',
                'context': 8192,
                'pricing': {'input': 0.8, 'output': 0.8},
                'speed': 'medium',
                'quality': 'good',
                'open_source': True
            }
        ]
        
        return models
    
    @staticmethod
    def get_templates() -> List[Dict]:
        """Get list of available document templates"""
        
        templates = []
        for key, template in DOCUMENT_TEMPLATES.items():
            templates.append({
                'id': key,
                'name': template['name'],
                'icon': template['icon']
            })
        
        return templates