"""
Management command to check for expiring and expired passwords.
Run this daily via cron job or task scheduler.

Usage:
    python manage.py check_password_expiration
"""

from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from accounts.models import User, PasswordHistory, EventLog


class Command(BaseCommand):
    help = 'Check for expiring and expired passwords, send emails and log events'

    def handle(self, *args, **options):
        now = timezone.now()
        warning_days = getattr(settings, 'PASSWORD_EXPIRY_WARNING_DAYS', 3)
        
        warning_count = 0
        expired_count = 0
        
        # Get all active users with password expiration dates
        users = User.objects.filter(is_active=True, password_expires_at__isnull=False)
        
        for user in users:
            days_until_expiry = (user.password_expires_at - now).days
            
            # Check if password has expired
            if user.password_expires_at <= now:
                self.handle_expired_password(user)
                expired_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Expired: {user.username} - password expired')
                )
            
            # Check if password is expiring in exactly WARNING_DAYS days
            elif days_until_expiry == warning_days:
                self.handle_expiring_password(user, days_until_expiry)
                warning_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Warning sent: {user.username} - {days_until_expiry} days left')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted: {warning_count} warnings sent, {expired_count} passwords expired'
            )
        )
    
    def handle_expiring_password(self, user, days_left):
        """Send warning email for passwords expiring soon"""
        expiry_date = user.password_expires_at.strftime('%B %d, %Y')
        
        try:
            send_mail(
                subject='Password Expiring Soon - FlowCounts',
                message=(
                    f'Hello {user.first_name or user.username},\n\n'
                    f'This is a reminder that your FlowCounts password will expire in {days_left} day(s) '
                    f'on {expiry_date}.\n\n'
                    'Please change your password before it expires to maintain access to your account.\n\n'
                    'You can change your password by:\n'
                    '1. Logging into FlowCounts\n'
                    '2. Going to your Profile\n'
                    '3. Updating your password\n\n'
                    'If you need assistance, please contact your administrator.\n\n'
                    'Best regards,\n'
                    'FlowCounts Team'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            # Log the warning event
            EventLog.objects.create(
                action='PASSWORD_EXPIRY_WARNING',
                actor=None,
                target_user=user,
                details=f'Password expiry warning sent to {user.email} ({days_left} days remaining)',
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to send warning email to {user.email}: {str(e)}')
            )
    
    def handle_expired_password(self, user):
        """Handle expired password: send email, save to history, deactivate if needed"""
        expiry_date = user.password_expires_at.strftime('%B %d, %Y')
        
        # Save current password to history if not already there
        try:
            # Check if this password is already in history
            current_password_hash = user.password
            already_in_history = PasswordHistory.objects.filter(
                user=user,
                password_hash=current_password_hash
            ).exists()
            
            if not already_in_history:
                PasswordHistory.objects.create(
                    user=user,
                    password_hash=current_password_hash
                )
                self.stdout.write(f'  → Password saved to history for {user.username}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to save password to history for {user.username}: {str(e)}')
            )
        
        # Send expiration email
        try:
            send_mail(
                subject='Password Expired - FlowCounts',
                message=(
                    f'Hello {user.first_name or user.username},\n\n'
                    f'Your FlowCounts password has expired as of {expiry_date}.\n\n'
                    'For security reasons, you must reset your password before you can log in again.\n\n'
                    'To reset your password:\n'
                    '1. Go to the FlowCounts login page\n'
                    '2. Click "Forgot Password"\n'
                    '3. Follow the instructions to verify your identity and create a new password\n\n'
                    'Note: You cannot reuse any of your last 5 passwords.\n\n'
                    'If you need assistance, please contact your administrator.\n\n'
                    'Best regards,\n'
                    'FlowCounts Team'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            # Log the expiration event
            EventLog.objects.create(
                action='PASSWORD_EXPIRED',
                actor=None,
                target_user=user,
                details=f'Password expired on {expiry_date}. Expiration email sent to {user.email}.',
            )
            
            # Optionally deactivate the user until they reset their password
            # Uncomment the lines below if you want to force password reset by deactivating
            # user.is_active = False
            # user.save(update_fields=['is_active'])
            # self.stdout.write(f'  → User {user.username} deactivated due to password expiration')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to send expiration email to {user.email}: {str(e)}')
            )

