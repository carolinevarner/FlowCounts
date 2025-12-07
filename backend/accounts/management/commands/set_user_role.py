"""
Management command to set a user's role by email or username.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import Role
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Set a user role by email or username. Can be used with environment variables or command arguments.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email address of the user',
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Username of the user',
        )
        parser.add_argument(
            '--role',
            type=str,
            choices=['ADMIN', 'MANAGER', 'ACCOUNTANT'],
            help='Role to set (ADMIN, MANAGER, or ACCOUNTANT)',
        )

    def handle(self, *args, **options):
        email = options.get('email') or os.environ.get('SET_ROLE_EMAIL')
        username = options.get('username') or os.environ.get('SET_ROLE_USERNAME')
        role = options.get('role') or os.environ.get('SET_ROLE')
        
        self.stdout.write(f'[SET_ROLE] Starting role update process...')
        self.stdout.write(f'[SET_ROLE] Email: {email or "NOT SET"}')
        self.stdout.write(f'[SET_ROLE] Username: {username or "NOT SET"}')
        self.stdout.write(f'[SET_ROLE] Role: {role or "NOT SET"}')
        
        if not email and not username:
            self.stdout.write(
                self.style.ERROR('[SET_ROLE] ERROR: Please provide either --email or --username, or set SET_ROLE_EMAIL or SET_ROLE_USERNAME environment variable.')
            )
            return
        
        if not role:
            self.stdout.write(
                self.style.ERROR('[SET_ROLE] ERROR: Please provide --role or set SET_ROLE environment variable.')
            )
            return
        
        if role not in ['ADMIN', 'MANAGER', 'ACCOUNTANT']:
            self.stdout.write(
                self.style.ERROR(f'[SET_ROLE] ERROR: Invalid role "{role}". Must be ADMIN, MANAGER, or ACCOUNTANT.')
            )
            return
        
        try:
            self.stdout.write(f'[SET_ROLE] Looking up user...')
            if email:
                user = User.objects.get(email=email)
                self.stdout.write(f'[SET_ROLE] Found user by email: {user.username}')
            else:
                user = User.objects.get(username=username)
                self.stdout.write(f'[SET_ROLE] Found user by username: {user.email}')
            
            old_role = user.role
            self.stdout.write(f'[SET_ROLE] Current role: {old_role}')
            
            # Set new role
            user.role = role
            user.save(update_fields=['role'])
            
            self.stdout.write(
                self.style.SUCCESS(f'[SET_ROLE] ✅ SUCCESS! Role changed from {old_role} to {role} for user: {user.username} ({user.email})')
            )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'[SET_ROLE] ❌ User not found with {"email" if email else "username"}: {email or username}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'[SET_ROLE] ❌ Error: {str(e)}')
            )
            import traceback
            self.stdout.write(f'[SET_ROLE] Traceback: {traceback.format_exc()}')



