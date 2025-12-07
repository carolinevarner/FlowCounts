"""
Management command to unsuspend a user by email or username.
Useful for deployment when shell access is not available.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Unsuspend a user by email or username. Can be used with environment variables or command arguments.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email address of the user to unsuspend',
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Username of the user to unsuspend',
        )

    def handle(self, *args, **options):
        email = options.get('email') or os.environ.get('UNSUSPEND_EMAIL')
        username = options.get('username') or os.environ.get('UNSUSPEND_USERNAME')
        
        if not email and not username:
            self.stdout.write(
                self.style.ERROR('Please provide either --email or --username, or set UNSUSPEND_EMAIL or UNSUSPEND_USERNAME environment variable.')
            )
            return
        
        try:
            if email:
                user = User.objects.get(email=email)
            else:
                user = User.objects.get(username=username)
            
            # Clear suspension
            user.suspend_from = None
            user.suspend_to = None
            user.is_active = True
            user.failed_attempts = 0
            user.save(update_fields=['suspend_from', 'suspend_to', 'is_active', 'failed_attempts'])
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully unsuspended user: {user.username} ({user.email})')
            )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User not found with {"email" if email else "username"}: {email or username}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error unsuspending user: {str(e)}')
            )



