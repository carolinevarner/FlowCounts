"""
Management command to initialize default error messages in the database.
"""
from django.core.management.base import BaseCommand
from accounts.error_utils import create_default_error_messages


class Command(BaseCommand):
    help = 'Initialize default error messages in the database'

    def handle(self, *args, **options):
        self.stdout.write('Creating default error messages...')
        
        try:
            create_default_error_messages()
            self.stdout.write(
                self.style.SUCCESS('Successfully created default error messages!')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating default error messages: {e}')
            )
