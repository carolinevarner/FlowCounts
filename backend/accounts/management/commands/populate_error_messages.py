"""
Management command to populate the database with error messages.
"""
from django.core.management.base import BaseCommand
from accounts.error_utils import create_default_error_messages


class Command(BaseCommand):
    help = 'Populate the database with default error messages'

    def handle(self, *args, **options):
        """Populate the database with default error messages."""
        try:
            create_default_error_messages()
            self.stdout.write(
                self.style.SUCCESS('Successfully populated error messages in the database.')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to populate error messages: {str(e)}')
            )

