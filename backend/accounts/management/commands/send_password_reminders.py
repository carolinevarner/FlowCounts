"""
Management command to send password expiration reminders to users.
Run this daily via cron or scheduler.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.password_utils import check_and_send_expiration_reminder

User = get_user_model()


class Command(BaseCommand):
    help = 'Send password expiration reminders to users who need them'

    def handle(self, *args, **options):
        self.stdout.write('Checking users for password expiration reminders...')
        
        # Get all active users
        users = User.objects.filter(is_active=True).exclude(password_expires_at__isnull=True)
        
        sent_count = 0
        for user in users:
            try:
                if check_and_send_expiration_reminder(user):
                    sent_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Sent reminder to {user.username} ({user.email})')
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ Failed to process {user.username}: {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'\nCompleted: Sent {sent_count} password expiration reminders')
        )

