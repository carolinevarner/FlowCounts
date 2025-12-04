"""
Management command to reset a user's password by email or username.
Useful for deployment when you need to set a known password.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Reset a user password by email or username. Can be used with environment variables or command arguments.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email address of the user to reset password for',
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Username of the user to reset password for',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='New password to set (if not provided, uses RESET_PASSWORD env var)',
        )

    def handle(self, *args, **options):
        email = options.get('email') or os.environ.get('RESET_PASSWORD_EMAIL')
        username = options.get('username') or os.environ.get('RESET_PASSWORD_USERNAME')
        password = options.get('password') or os.environ.get('RESET_PASSWORD')
        
        if not email and not username:
            self.stdout.write(
                self.style.ERROR('Please provide either --email or --username, or set RESET_PASSWORD_EMAIL or RESET_PASSWORD_USERNAME environment variable.')
            )
            return
        
        if not password:
            self.stdout.write(
                self.style.ERROR('Please provide --password or set RESET_PASSWORD environment variable.')
            )
            return
        
        try:
            if email:
                user = User.objects.get(email=email)
            else:
                user = User.objects.get(username=username)
            
            # Reset password and unsuspend
            user.set_password(password)
            user.suspend_from = None
            user.suspend_to = None
            user.is_active = True
            user.failed_attempts = 0
            user.save()
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully reset password and unsuspended user: {user.username} ({user.email})')
            )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User not found with {"email" if email else "username"}: {email or username}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error resetting password: {str(e)}')
            )

