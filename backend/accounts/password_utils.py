"""
Utility functions for password management, expiration, and history.
"""
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


def save_password_to_history(user, password_hash):
    """
    Save the current password hash to password history.
    
    Args:
        user: User instance
        password_hash: The hashed password to save
    """
    from .models import PasswordHistory
    
    try:
        PasswordHistory.objects.create(
            user=user,
            password=password_hash
        )
        logger.info(f"Saved password to history for user {user.username}")
    except Exception as e:
        logger.error(f"Failed to save password history for user {user.username}: {e}")


def set_password_expiration(user, is_temporary=False):
    """
    Set password expiration dates for a user.
    
    Args:
        user: User instance
        is_temporary: If True, password expires in 3 days. If False, expires in 90 days.
    """
    now = timezone.now()
    
    if is_temporary:
        # Temporary password expires in 3 days
        user.is_temporary_password = True
        user.password_must_change_by = now + timedelta(days=3)
        user.password_expires_at = now + timedelta(days=3)
    else:
        # Regular password expires in 90 days (3 months)
        user.is_temporary_password = False
        user.password_must_change_by = None
        user.password_expires_at = now + timedelta(days=90)
    
    user.last_password_change = now
    user.last_expiration_reminder_sent = None


def check_and_send_expiration_reminder(user):
    """
    Check if user needs a password expiration reminder and send it.
    Returns True if email was sent, False otherwise.
    
    For temporary passwords: Send daily reminders
    For regular passwords: Send reminders at 60 days (30 days left) and 30 days (60 days left)
    """
    if not user.password_expires_at or not user.email:
        return False
    
    now = timezone.now()
    days_until_expiry = (user.password_expires_at - now).days
    
    # Skip if password already expired
    if days_until_expiry < 0:
        return False
    
    # Check if we should send a reminder
    should_send = False
    
    if user.is_temporary_password:
        # For temporary passwords, send daily reminder
        if user.last_expiration_reminder_sent:
            hours_since_last = (now - user.last_expiration_reminder_sent).total_seconds() / 3600
            should_send = hours_since_last >= 24  # Daily
        else:
            should_send = True  # Never sent before
    else:
        # For regular passwords, send at 60 days and 30 days remaining
        if days_until_expiry <= 60 and days_until_expiry > 30:
            # Send reminder at 60 days mark (30 days before expiration)
            if not user.last_expiration_reminder_sent:
                should_send = True
            else:
                days_since_last = (now - user.last_expiration_reminder_sent).days
                # Only send once in this period
                should_send = days_since_last >= 30
        elif days_until_expiry <= 30:
            # Send reminder at 30 days mark (60 days before expiration)
            if not user.last_expiration_reminder_sent:
                should_send = True
            else:
                days_since_last = (now - user.last_expiration_reminder_sent).days
                # Only send once in this period
                should_send = days_since_last >= 30
    
    if not should_send:
        return False
    
    # Send the reminder email
    try:
        if user.is_temporary_password:
            subject = "FlowCounts: URGENT - Temporary Password Expires Soon"
            body = (
                f"Dear {user.first_name or user.username},\n\n"
                f"This is a reminder that your temporary password will expire in {days_until_expiry + 1} day(s).\n\n"
                f"You MUST change your password before {user.password_must_change_by.strftime('%Y-%m-%d %H:%M')} "
                f"or you will be locked out of your account.\n\n"
                f"To change your password:\n"
                f"1. Log in to FlowCounts\n"
                f"2. Go to your profile settings\n"
                f"3. Change your password immediately\n\n"
                f"If your password expires, you will need to use the 'Forgot Password' feature to reset it.\n\n"
                f"Best regards,\nFlowCounts Team"
            )
        else:
            subject = "FlowCounts: Password Expiration Reminder"
            months_passed = (90 - days_until_expiry) // 30
            body = (
                f"Dear {user.first_name or user.username},\n\n"
                f"This is your {'monthly' if months_passed > 0 else 'first'} reminder that your password will expire "
                f"in {days_until_expiry} days on {user.password_expires_at.strftime('%Y-%m-%d')}.\n\n"
                f"For security purposes, all passwords must be changed every 90 days (3 months).\n\n"
                f"To change your password:\n"
                f"1. Log in to FlowCounts\n"
                f"2. Go to your profile settings\n"
                f"3. Update your password\n\n"
                f"Remember: You cannot reuse any of your last 5 passwords.\n\n"
                f"Best regards,\nFlowCounts Team"
            )
        
        send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        
        # Update last reminder sent timestamp
        user.last_expiration_reminder_sent = now
        user.save(update_fields=['last_expiration_reminder_sent'])
        
        logger.info(f"Sent password expiration reminder to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password expiration reminder to {user.email}: {e}")
        return False


def check_password_expired(user):
    """
    Check if user's password has expired.
    Returns tuple: (is_expired, reason)
    """
    if not user.password_expires_at:
        return False, None
    
    now = timezone.now()
    
    if user.is_temporary_password and user.password_must_change_by:
        if now > user.password_must_change_by:
            return True, "Temporary password expired. Please use 'Forgot Password' to reset."
    
    if now > user.password_expires_at:
        return True, "Password expired after 90 days. Please use 'Forgot Password' to reset."
    
    return False, None

