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
        
        self.stdout.write(f'[RESET_PASSWORD] Starting password reset process...')
        self.stdout.write(f'[RESET_PASSWORD] Email: {email or "NOT SET"}')
        self.stdout.write(f'[RESET_PASSWORD] Username: {username or "NOT SET"}')
        self.stdout.write(f'[RESET_PASSWORD] Password provided: {"YES" if password else "NO"}')
        
        if not email and not username:
            self.stdout.write(
                self.style.ERROR('[RESET_PASSWORD] ERROR: Please provide either --email or --username, or set RESET_PASSWORD_EMAIL or RESET_PASSWORD_USERNAME environment variable.')
            )
            return
        
        if not password:
            self.stdout.write(
                self.style.ERROR('[RESET_PASSWORD] ERROR: Please provide --password or set RESET_PASSWORD environment variable.')
            )
            return
        
        try:
            self.stdout.write(f'[RESET_PASSWORD] Looking up user...')
            if email:
                user = User.objects.get(email=email)
                self.stdout.write(f'[RESET_PASSWORD] Found user by email: {user.username}')
            else:
                user = User.objects.get(username=username)
                self.stdout.write(f'[RESET_PASSWORD] Found user by username: {user.email}')
            
            self.stdout.write(f'[RESET_PASSWORD] Current user status: is_active={user.is_active}, failed_attempts={user.failed_attempts}')
            
            # Reset password and unsuspend
            self.stdout.write(f'[RESET_PASSWORD] Setting new password...')
            user.set_password(password)
            user.suspend_from = None
            user.suspend_to = None
            user.is_active = True
            user.failed_attempts = 0
            user.save(update_fields=['password', 'suspend_from', 'suspend_to', 'is_active', 'failed_attempts'])
            self.stdout.write(f'[RESET_PASSWORD] User saved to database')
            
            # Verify password was set
            self.stdout.write(f'[RESET_PASSWORD] Verifying password...')
            user.refresh_from_db()
            if user.check_password(password):
                self.stdout.write(
                    self.style.SUCCESS(f'[RESET_PASSWORD] ✅ SUCCESS! Password reset and user unsuspended: {user.username} ({user.email})')
                )
                self.stdout.write(f'[RESET_PASSWORD] User can now login with this password')
            else:
                self.stdout.write(
                    self.style.ERROR(f'[RESET_PASSWORD] ❌ FAILED - Password verification failed after save')
                )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'[RESET_PASSWORD] ❌ User not found with {"email" if email else "username"}: {email or username}')
            )
            self.stdout.write(f'[RESET_PASSWORD] Available users:')
            for u in User.objects.all()[:5]:
                self.stdout.write(f'  - {u.username} ({u.email})')
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'[RESET_PASSWORD] ❌ Error: {str(e)}')
            )
            import traceback
            self.stdout.write(f'[RESET_PASSWORD] Traceback: {traceback.format_exc()}')

