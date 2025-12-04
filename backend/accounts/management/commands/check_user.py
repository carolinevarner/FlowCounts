"""
Management command to check if a user exists and show their status.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Check if a user exists by email or username and show their status.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email address of the user to check',
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Username of the user to check',
        )

    def handle(self, *args, **options):
        email = options.get('email') or os.environ.get('CHECK_USER_EMAIL')
        username = options.get('username') or os.environ.get('CHECK_USER_USERNAME')
        
        if not email and not username:
            self.stdout.write(
                self.style.ERROR('Please provide either --email or --username')
            )
            return
        
        try:
            if email:
                user = User.objects.get(email=email)
            else:
                user = User.objects.get(username=username)
            
            self.stdout.write(self.style.SUCCESS(f'\nUser found:'))
            self.stdout.write(f'  Username: {user.username}')
            self.stdout.write(f'  Email: {user.email}')
            self.stdout.write(f'  Is Active: {user.is_active}')
            self.stdout.write(f'  Failed Attempts: {user.failed_attempts}')
            self.stdout.write(f'  Suspend From: {user.suspend_from}')
            self.stdout.write(f'  Suspend To: {user.suspend_to}')
            self.stdout.write(f'  Role: {user.role}')
            self.stdout.write(f'  Has Password Set: {bool(user.password)}')
            
            if not user.is_active:
                self.stdout.write(self.style.WARNING('  ⚠️ User is INACTIVE'))
            if user.failed_attempts > 0:
                self.stdout.write(self.style.WARNING(f'  ⚠️ User has {user.failed_attempts} failed attempts'))
            if user.suspend_from or user.suspend_to:
                self.stdout.write(self.style.WARNING(f'  ⚠️ User is suspended'))
                
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User NOT FOUND with {"email" if email else "username"}: {email or username}')
            )
            self.stdout.write('\nAvailable users:')
            for u in User.objects.all()[:10]:
                self.stdout.write(f'  - {u.username} ({u.email})')
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error checking user: {str(e)}')
            )

