"""
Automatic password expiration system using Django signals.
This handles password expiration warnings and notifications automatically.
Checks happen on user login and when passwords are updated.
"""

from django.db.models.signals import post_save
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import User, PasswordHistory, EventLog


def send_expiration_warning_email(user):
    """Send warning email 3 days before password expires"""
    if not user.email:
        return
    
    expiry_date = user.password_expires_at.strftime('%B %d, %Y')
    
    try:
        send_mail(
            subject='Password Expiring Soon - FlowCounts',
            message=(
                f'Hello {user.first_name or user.username},\n\n'
                f'This is a reminder that your FlowCounts password will expire in 3 days '
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
            fail_silently=True,
        )
        
        # Log the warning event
        EventLog.objects.create(
            action='PASSWORD_EXPIRY_WARNING',
            actor=None,
            target_user=user,
            details=f'Password expiry warning sent to {user.email} (3 days remaining)',
        )
        
    except Exception as e:
        print(f'Failed to send warning email to {user.email}: {str(e)}')


def send_password_expired_email(user):
    """Send email when password has expired"""
    if not user.email:
        return
    
    expiry_date = user.password_expires_at.strftime('%B %d, %Y')
    
    try:
        # Save current password to history if not already there
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
        
        # Send expiration email
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
            fail_silently=True,
        )
        
        # Log the expiration event
        EventLog.objects.create(
            action='PASSWORD_EXPIRED',
            actor=None,
            target_user=user,
            details=f'Password expired on {expiry_date}. Expiration email sent to {user.email}.',
        )
        
    except Exception as e:
        print(f'Failed to send expiration email to {user.email}: {str(e)}')


def check_and_send_expiration_emails(user):
    """
    Check if user needs warning or expiration emails.
    This is called on login and when passwords are updated.
    """
    if not user.password_expires_at or not user.is_active:
        return
    
    now = timezone.now()
    
    # Check if password has expired
    if user.password_expires_at <= now:
        # Check if we've already sent expiration email
        recent_expiration_log = EventLog.objects.filter(
            action='PASSWORD_EXPIRED',
            target_user=user,
            created_at__gte=user.password_expires_at
        ).exists()
        
        if not recent_expiration_log:
            send_password_expired_email(user)
        return
    
    # Check if warning should be sent (3 days before)
    warning_days = getattr(settings, 'PASSWORD_EXPIRY_WARNING_DAYS', 3)
    days_until_expiry = (user.password_expires_at - now).days
    
    if days_until_expiry == warning_days:
        # Check if we've already sent warning for this password
        recent_warning_log = EventLog.objects.filter(
            action='PASSWORD_EXPIRY_WARNING',
            target_user=user,
            created_at__gte=now - timedelta(days=1)  # Don't send more than once per day
        ).exists()
        
        if not recent_warning_log:
            send_expiration_warning_email(user)


@receiver(user_logged_in)
def check_password_expiration_on_login(sender, request, user, **kwargs):
    """
    Automatically check for password expiration when user logs in.
    This ensures warnings and expiration notices are sent.
    """
    check_and_send_expiration_emails(user)


@receiver(post_save, sender=User)
def check_password_expiration_on_save(sender, instance, created, **kwargs):
    """
    Check password expiration when user is created or updated.
    This handles new users and password changes.
    """
    if instance.password_expires_at and instance.is_active:
        check_and_send_expiration_emails(instance)

