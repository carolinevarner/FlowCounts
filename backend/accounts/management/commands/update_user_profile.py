"""
Management command to update a user's profile information (name, display_handle, etc.).
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Update user profile information by email or username.'

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
            '--first-name',
            type=str,
            help='First name to set',
        )
        parser.add_argument(
            '--last-name',
            type=str,
            help='Last name to set',
        )
        parser.add_argument(
            '--display-handle',
            type=str,
            help='Display handle to set',
        )

    def handle(self, *args, **options):
        email = options.get('email') or os.environ.get('UPDATE_PROFILE_EMAIL')
        username = options.get('username') or os.environ.get('UPDATE_PROFILE_USERNAME')
        first_name = options.get('first_name') or os.environ.get('UPDATE_PROFILE_FIRST_NAME')
        last_name = options.get('last_name') or os.environ.get('UPDATE_PROFILE_LAST_NAME')
        display_handle = options.get('display_handle') or os.environ.get('UPDATE_PROFILE_DISPLAY_HANDLE')
        
        self.stdout.write(f'[UPDATE_PROFILE] Starting profile update...')
        self.stdout.write(f'[UPDATE_PROFILE] Email: {email or "NOT SET"}')
        self.stdout.write(f'[UPDATE_PROFILE] Username: {username or "NOT SET"}')
        
        if not email and not username:
            self.stdout.write(
                self.style.ERROR('[UPDATE_PROFILE] ERROR: Please provide either --email or --username')
            )
            return
        
        if not first_name and not last_name and not display_handle:
            self.stdout.write(
                self.style.WARNING('[UPDATE_PROFILE] WARNING: No profile fields to update')
            )
            return
        
        try:
            if email:
                user = User.objects.get(email=email)
            else:
                user = User.objects.get(username=username)
            
            self.stdout.write(f'[UPDATE_PROFILE] Found user: {user.username} ({user.email})')
            
            updated_fields = []
            if first_name:
                user.first_name = first_name
                updated_fields.append('first_name')
            if last_name:
                user.last_name = last_name
                updated_fields.append('last_name')
            if display_handle:
                user.display_handle = display_handle
                updated_fields.append('display_handle')
            
            if updated_fields:
                user.save(update_fields=updated_fields)
                self.stdout.write(
                    self.style.SUCCESS(f'[UPDATE_PROFILE] ✅ SUCCESS! Updated {", ".join(updated_fields)} for user: {user.username} ({user.email})')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('[UPDATE_PROFILE] No fields to update')
                )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'[UPDATE_PROFILE] ❌ User not found with {"email" if email else "username"}: {email or username}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'[UPDATE_PROFILE] ❌ Error: {str(e)}')
            )

