from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='WorkflowTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='workflow_templates', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='Workflow',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('due_date', models.DateField()),
                ('status', models.CharField(choices=[('ACTIVE', 'Active'), ('DONE', 'Done'), ('CANCELLED', 'Cancelled')], default='ACTIVE', max_length=10)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('template', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='instances', to='workflow_app.workflowtemplate')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='workflows', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['status', 'due_date', '-created_at']},
        ),
        migrations.CreateModel(
            name='TemplateNode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('order', models.IntegerField(default=0)),
                ('due_offset_days', models.IntegerField(default=0)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='workflow_app.templatenode')),
                ('template', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='nodes', to='workflow_app.workflowtemplate')),
            ],
            options={'ordering': ['order', 'id']},
        ),
        migrations.CreateModel(
            name='WorkflowItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('order', models.IntegerField(default=0)),
                ('status', models.CharField(choices=[('TODO', 'To Do'), ('IN_PROGRESS', 'In Progress'), ('DONE', 'Done')], default='TODO', max_length=12)),
                ('due_date', models.DateField(blank=True, null=True)),
                ('due_offset_days', models.IntegerField(default=0)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='workflow_app.workflowitem')),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='workflow_app.workflow')),
            ],
            options={'ordering': ['order', 'id']},
        ),
    ]

