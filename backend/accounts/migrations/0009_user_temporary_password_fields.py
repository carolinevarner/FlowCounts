# Generated migration for temporary password tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_errormessage_errorlog'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_temporary_password',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='password_must_change_by',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='last_expiration_reminder_sent',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

