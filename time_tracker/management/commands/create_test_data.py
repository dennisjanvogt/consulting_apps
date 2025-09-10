from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from time_tracker.models import Client, Project, Task, TimeEntry
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import random


class Command(BaseCommand):
    help = 'Creates test data for time tracker'

    def handle(self, *args, **options):
        # Get or create a test user
        user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@example.com',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            user.set_password('admin')
            user.save()
            self.stdout.write(self.style.SUCCESS('Created admin user (password: admin)'))
        
        # Create Clients
        clients_data = [
            {
                'name': 'Tech Solutions GmbH',
                'company': 'Tech Solutions GmbH',
                'email': 'contact@techsolutions.de',
                'phone': '+49 30 12345678',
                'address': 'Friedrichstraße 123\n10117 Berlin',
                'hourly_rate': Decimal('150.00'),
                'color': '#1E3A5F'
            },
            {
                'name': 'Digital Marketing Agency',
                'company': 'DMA Berlin',
                'email': 'info@dma-berlin.de',
                'phone': '+49 30 98765432',
                'address': 'Kurfürstendamm 45\n10719 Berlin',
                'hourly_rate': Decimal('120.00'),
                'color': '#2E4A7F'
            },
            {
                'name': 'StartUp Innovations',
                'company': 'StartUp Innovations UG',
                'email': 'hello@startup-innovations.com',
                'phone': '+49 30 55667788',
                'address': 'Torstraße 89\n10119 Berlin',
                'hourly_rate': Decimal('100.00'),
                'color': '#1E3A5F'
            },
            {
                'name': 'E-Commerce Solutions',
                'company': 'E-Commerce Solutions AG',
                'email': 'support@ecommerce.de',
                'phone': '+49 30 11223344',
                'address': 'Potsdamer Platz 5\n10785 Berlin',
                'hourly_rate': Decimal('175.00'),
                'color': '#2E4A7F'
            }
        ]
        
        clients = []
        for client_data in clients_data:
            client, created = Client.objects.get_or_create(
                user=user,
                name=client_data['name'],
                defaults=client_data
            )
            clients.append(client)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created client: {client.name}'))
        
        # Create Projects
        projects_data = [
            # Tech Solutions Projects
            {
                'client': clients[0],
                'name': 'Website Redesign',
                'description': 'Complete redesign of company website with modern stack',
                'hourly_rate': None,  # Uses client rate
                'budget_hours': Decimal('80'),
                'status': 'active'
            },
            {
                'client': clients[0],
                'name': 'Mobile App Development',
                'description': 'Native iOS and Android app for customer portal',
                'hourly_rate': Decimal('180.00'),
                'budget_hours': Decimal('200'),
                'status': 'active'
            },
            # Digital Marketing Agency Projects
            {
                'client': clients[1],
                'name': 'SEO Optimization',
                'description': 'Technical SEO audit and implementation',
                'hourly_rate': None,
                'budget_hours': Decimal('40'),
                'status': 'active'
            },
            {
                'client': clients[1],
                'name': 'Social Media Dashboard',
                'description': 'Custom analytics dashboard for social media metrics',
                'hourly_rate': Decimal('140.00'),
                'budget_hours': Decimal('60'),
                'status': 'paused'
            },
            # StartUp Innovations Projects
            {
                'client': clients[2],
                'name': 'MVP Development',
                'description': 'Minimum viable product for SaaS platform',
                'hourly_rate': None,
                'budget_hours': Decimal('120'),
                'status': 'active'
            },
            {
                'client': clients[2],
                'name': 'API Integration',
                'description': 'Integration with third-party payment and shipping APIs',
                'hourly_rate': Decimal('110.00'),
                'budget_hours': None,
                'status': 'active'
            },
            # E-Commerce Solutions Projects
            {
                'client': clients[3],
                'name': 'Shopping Cart Optimization',
                'description': 'Performance optimization and checkout flow improvement',
                'hourly_rate': None,
                'budget_hours': Decimal('50'),
                'status': 'active'
            },
            {
                'client': clients[3],
                'name': 'Inventory Management System',
                'description': 'Custom inventory tracking and reporting system',
                'hourly_rate': Decimal('200.00'),
                'budget_hours': Decimal('150'),
                'status': 'completed'
            }
        ]
        
        projects = []
        for project_data in projects_data:
            project, created = Project.objects.get_or_create(
                user=user,
                client=project_data['client'],
                name=project_data['name'],
                defaults=project_data
            )
            projects.append(project)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created project: {project.name}'))
        
        # Create Tasks
        tasks_data = [
            # Website Redesign Tasks
            {'project': projects[0], 'name': 'Requirements Analysis', 'description': 'Gather and document all requirements', 'estimated_hours': Decimal('8')},
            {'project': projects[0], 'name': 'UI/UX Design', 'description': 'Create mockups and design system', 'estimated_hours': Decimal('24')},
            {'project': projects[0], 'name': 'Frontend Development', 'description': 'Implement React components', 'estimated_hours': Decimal('32')},
            {'project': projects[0], 'name': 'Backend API', 'description': 'Develop RESTful API endpoints', 'estimated_hours': Decimal('16')},
            
            # Mobile App Tasks
            {'project': projects[1], 'name': 'App Architecture', 'description': 'Design app architecture and data flow', 'estimated_hours': Decimal('16')},
            {'project': projects[1], 'name': 'iOS Development', 'description': 'Native iOS app development', 'estimated_hours': Decimal('80')},
            {'project': projects[1], 'name': 'Android Development', 'description': 'Native Android app development', 'estimated_hours': Decimal('80')},
            {'project': projects[1], 'name': 'Testing & QA', 'description': 'Comprehensive testing on both platforms', 'estimated_hours': Decimal('24')},
            
            # SEO Optimization Tasks
            {'project': projects[2], 'name': 'Technical Audit', 'description': 'Complete technical SEO audit', 'estimated_hours': Decimal('8')},
            {'project': projects[2], 'name': 'On-Page Optimization', 'description': 'Optimize meta tags, headers, content', 'estimated_hours': Decimal('16')},
            {'project': projects[2], 'name': 'Site Speed Optimization', 'description': 'Improve loading times and performance', 'estimated_hours': Decimal('16')},
            
            # Social Media Dashboard Tasks
            {'project': projects[3], 'name': 'Data Architecture', 'description': 'Design database schema for metrics', 'estimated_hours': Decimal('12')},
            {'project': projects[3], 'name': 'API Integrations', 'description': 'Connect to social media APIs', 'estimated_hours': Decimal('24')},
            {'project': projects[3], 'name': 'Dashboard UI', 'description': 'Build interactive dashboard components', 'estimated_hours': Decimal('24')},
            
            # MVP Development Tasks
            {'project': projects[4], 'name': 'User Authentication', 'description': 'Implement secure auth system', 'estimated_hours': Decimal('16')},
            {'project': projects[4], 'name': 'Core Features', 'description': 'Build main application features', 'estimated_hours': Decimal('64')},
            {'project': projects[4], 'name': 'Admin Panel', 'description': 'Create administration interface', 'estimated_hours': Decimal('24')},
            {'project': projects[4], 'name': 'Deployment Setup', 'description': 'Configure CI/CD and hosting', 'estimated_hours': Decimal('16')},
            
            # API Integration Tasks
            {'project': projects[5], 'name': 'Payment Gateway', 'description': 'Integrate Stripe payment processing', 'estimated_hours': Decimal('20')},
            {'project': projects[5], 'name': 'Shipping APIs', 'description': 'Connect DHL and UPS APIs', 'estimated_hours': Decimal('16')},
            {'project': projects[5], 'name': 'Webhook Handlers', 'description': 'Implement webhook processing', 'estimated_hours': Decimal('12')},
            
            # Shopping Cart Tasks
            {'project': projects[6], 'name': 'Performance Analysis', 'description': 'Analyze current performance bottlenecks', 'estimated_hours': Decimal('8')},
            {'project': projects[6], 'name': 'Database Optimization', 'description': 'Optimize queries and indexes', 'estimated_hours': Decimal('16')},
            {'project': projects[6], 'name': 'Frontend Optimization', 'description': 'Optimize React components and state', 'estimated_hours': Decimal('16')},
            {'project': projects[6], 'name': 'A/B Testing', 'description': 'Implement and analyze A/B tests', 'estimated_hours': Decimal('10')},
            
            # Inventory Management Tasks
            {'project': projects[7], 'name': 'Database Design', 'description': 'Design inventory database schema', 'estimated_hours': Decimal('12'), 'is_completed': True},
            {'project': projects[7], 'name': 'CRUD Operations', 'description': 'Implement basic CRUD functionality', 'estimated_hours': Decimal('24'), 'is_completed': True},
            {'project': projects[7], 'name': 'Reporting Module', 'description': 'Build reporting and analytics', 'estimated_hours': Decimal('32'), 'is_completed': True},
            {'project': projects[7], 'name': 'Import/Export', 'description': 'CSV and Excel import/export', 'estimated_hours': Decimal('16'), 'is_completed': True},
        ]
        
        tasks = []
        for task_data in tasks_data:
            task, created = Task.objects.get_or_create(
                user=user,
                project=task_data['project'],
                name=task_data['name'],
                defaults={
                    'description': task_data['description'],
                    'estimated_hours': task_data['estimated_hours'],
                    'is_completed': task_data.get('is_completed', False)
                }
            )
            tasks.append(task)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created task: {task.name}'))
        
        # Create some sample time entries for the past week
        today = timezone.now()
        for i in range(7):
            date = today - timedelta(days=i)
            
            # Create 2-4 entries per day
            num_entries = random.randint(2, 4)
            for j in range(num_entries):
                # Random task
                task = random.choice(tasks[:20])  # Only use active tasks
                
                # Random start time between 8 AM and 6 PM
                hour = random.randint(8, 17)
                minute = random.choice([0, 15, 30, 45])
                start_time = date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                # Random duration between 30 minutes and 3 hours
                duration_minutes = random.choice([30, 45, 60, 90, 120, 150, 180])
                end_time = start_time + timedelta(minutes=duration_minutes)
                
                # Skip if end time is too late
                if end_time.hour > 20:
                    continue
                
                descriptions = [
                    'Working on implementation',
                    'Bug fixes and improvements',
                    'Code review and refactoring',
                    'Meeting with client',
                    'Documentation update',
                    'Testing and debugging',
                    'Feature development',
                    'Performance optimization'
                ]
                
                entry, created = TimeEntry.objects.get_or_create(
                    user=user,
                    task=task,
                    start_time=start_time,
                    defaults={
                        'end_time': end_time,
                        'description': random.choice(descriptions),
                        'is_billable': random.choice([True, True, True, False]),  # 75% billable
                    }
                )
                
                if created:
                    self.stdout.write(self.style.SUCCESS(f'Created time entry for {task.name} on {date.date()}'))
        
        self.stdout.write(self.style.SUCCESS('\n✅ Test data created successfully!'))
        self.stdout.write(self.style.SUCCESS(f'- {len(clients)} Clients'))
        self.stdout.write(self.style.SUCCESS(f'- {len(projects)} Projects'))
        self.stdout.write(self.style.SUCCESS(f'- {len(tasks)} Tasks'))
        self.stdout.write(self.style.SUCCESS(f'- Multiple time entries for the past week'))
        self.stdout.write(self.style.SUCCESS('\nYou can now login with:'))
        self.stdout.write(self.style.SUCCESS('Username: admin'))
        self.stdout.write(self.style.SUCCESS('Password: admin'))