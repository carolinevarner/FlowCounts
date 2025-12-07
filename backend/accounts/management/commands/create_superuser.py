"""
Management command to create a superuser from environment variables.
Useful for deployment when shell access is not available.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates a superuser from environment variables (SUPERUSER_USERNAME, SUPERUSER_EMAIL, SUPERUSER_PASSWORD)'

    def handle(self, *args, **options):
        username = os.environ.get('SUPERUSER_USERNAME', 'admin')
        email = os.environ.get('SUPERUSER_EMAIL', 'admin@example.com')
        password = os.environ.get('SUPERUSER_PASSWORD')
        
        if not password:
            self.stdout.write(
                self.style.ERROR('SUPERUSER_PASSWORD environment variable not set. Skipping superuser creation.')
            )
            return
        
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'User {username} already exists. Skipping creation.')
            )
        else:
            try:
                User.objects.create_superuser(username=username, email=email, password=password)
                self.stdout.write(
                    self.style.SUCCESS(f'Superuser {username} created successfully!')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creating superuser: {str(e)}')
                )



