"""
Management command to reset all user passwords to known values based on their email.
This is useful after importing data when passwords might not work.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()

# Map of emails to their known passwords
KNOWN_PASSWORDS = {
    'varner4262@gmail.com': 'Skyrush2013.',
    'brendenhorne03@gmail.com': 'Brenden2025!',
    'alidabdoub0@gmail.com': 'AliDabdoub2025!',
}


class Command(BaseCommand):
    help = 'Reset passwords for all users to known values (useful after data import)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force reset even if password is already set',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        
        self.stdout.write(f'[RESET_ALL_PASSWORDS] Starting password reset for known users...')
        
        reset_count = 0
        skipped_count = 0
        not_found_count = 0
        
        for email, password in KNOWN_PASSWORDS.items():
            try:
                user = User.objects.get(email=email)
                
                # Reset password and unsuspend
                user.set_password(password)
                user.suspend_from = None
                user.suspend_to = None
                user.is_active = True
                user.failed_attempts = 0
                user.save(update_fields=['password', 'suspend_from', 'suspend_to', 'is_active', 'failed_attempts'])
                
                # Verify password was set
                user.refresh_from_db()
                if user.check_password(password):
                    reset_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'[RESET_ALL_PASSWORDS] ✅ Reset password for {user.email} ({user.username})'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f'[RESET_ALL_PASSWORDS] ❌ Password verification failed for {user.email}'
                        )
                    )
            except User.DoesNotExist:
                not_found_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'[RESET_ALL_PASSWORDS] ⚠️  User not found: {email}'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'[RESET_ALL_PASSWORDS] ❌ Error resetting password for {email}: {str(e)}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n[RESET_ALL_PASSWORDS] Done! Reset: {reset_count}, Not found: {not_found_count}'
            )
        )

