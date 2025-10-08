from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.conf import settings
import traceback

class Role(models.TextChoices):
    ADMIN = "ADMIN", "Administrator"
    MANAGER = "MANAGER", "Manager"
    ACCOUNTANT = "ACCOUNTANT", "Accountant"

def avatar_path(instance, filename):
    return f"avatars/{instance.id}/{filename}"

class User(AbstractUser):
    display_handle = models.CharField(max_length=50, unique=True, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.ACCOUNTANT)
    picture = models.ImageField(upload_to=avatar_path, blank=True, null=True)

    suspend_from = models.DateField(blank=True, null=True)
    suspend_to = models.DateField(blank=True, null=True)

    failed_attempts = models.PositiveIntegerField(default=0)
    last_password_change = models.DateTimeField(blank=True, null=True)
    password_expires_at = models.DateTimeField(blank=True, null=True)
    
    # Temporary password tracking
    is_temporary_password = models.BooleanField(default=False)
    password_must_change_by = models.DateTimeField(blank=True, null=True)
    last_expiration_reminder_sent = models.DateTimeField(blank=True, null=True)

    profile_image = models.ImageField(upload_to="profiles/", null=True, blank=True)

    address = models.CharField(max_length=255, blank=True)
    dob = models.DateField(blank=True, null=True)

    # Security questions for password reset
    security_question_1 = models.CharField(max_length=255, blank=True)
    security_answer_1 = models.CharField(max_length=255, blank=True)
    security_question_2 = models.CharField(max_length=255, blank=True)
    security_answer_2 = models.CharField(max_length=255, blank=True)
    security_question_3 = models.CharField(max_length=255, blank=True)
    security_answer_3 = models.CharField(max_length=255, blank=True)

    def is_currently_suspended(self) -> bool:
        today = timezone.localdate()
        if self.suspend_from and self.suspend_to:
            return self.suspend_from <= today <= self.suspend_to
        return False

class PasswordHistory(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_history",
    )
    password = models.CharField(max_length=256)  
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

class RegistrationRequest(models.Model):
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('MANAGER', 'Manager'),
        ('ACCOUNTANT', 'Accountant'),
    ]
    
    first_name = models.CharField(max_length=150)
    last_name  = models.CharField(max_length=150)
    address    = models.CharField(max_length=255, blank=True)
    dob        = models.DateField()
    email      = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    approved   = models.BooleanField(null=True, blank=True)
    assigned_role = models.CharField(max_length=20, choices=ROLE_CHOICES, null=True, blank=True)
    reviewed_by = models.ForeignKey("accounts.User", null=True, blank=True,
                                    on_delete=models.SET_NULL, related_name="reviewed_requests")
    review_note = models.TextField(blank=True)
    
    # Security questions for password reset
    security_question_1 = models.CharField(max_length=255, blank=True)
    security_answer_1 = models.CharField(max_length=255, blank=True)
    security_question_2 = models.CharField(max_length=255, blank=True)
    security_answer_2 = models.CharField(max_length=255, blank=True)
    security_question_3 = models.CharField(max_length=255, blank=True)
    security_answer_3 = models.CharField(max_length=255, blank=True)


class EventLog(models.Model):
    ACTION_CHOICES = [
        ("USER_CREATED", "User Created"),
        ("USER_ACTIVATED", "User Activated"),
        ("USER_DEACTIVATED", "User Deactivated"),
        ("USER_SUSPENDED", "User Suspended"),
        ("USER_UNSUSPENDED", "User Unsuspended"),
        ("USER_UPDATED", "User Updated"),
        ("REQUEST_APPROVED", "Access Approved"),
        ("REQUEST_REJECTED", "Access Rejected"),
        ("PASSWORD_CHANGED", "Password Changed"),
        ("PASSWORD_RESET", "Password Reset"),
    ]

    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="events_performed"
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="events_targeting"
    )
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

class SecurityQuestion(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="security_questions")
    question = models.CharField(max_length=255)
    answer_hash = models.CharField(max_length=255)


class ErrorMessage(models.Model):
    """Stores all error messages that can be displayed to users."""
    ERROR_TYPES = [
        ('AUTH', 'Authentication'),
        ('VALIDATION', 'Validation'),
        ('PERMISSION', 'Permission'),
        ('SYSTEM', 'System'),
        ('USER_ACTION', 'User Action'),
    ]
    
    code = models.CharField(max_length=50, unique=True, help_text="Unique error code identifier")
    error_type = models.CharField(max_length=20, choices=ERROR_TYPES, default='SYSTEM')
    title = models.CharField(max_length=200, help_text="Short error title")
    message = models.TextField(help_text="Detailed error message for users")
    technical_details = models.TextField(blank=True, help_text="Technical details for debugging")
    is_active = models.BooleanField(default=True, help_text="Whether this error message is active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['error_type', 'code']
    
    def __str__(self):
        return f"{self.code}: {self.title}"


class ErrorLog(models.Model):
    """Logs all errors that occur in the system."""
    ERROR_LEVELS = [
        ('DEBUG', 'Debug'),
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('CRITICAL', 'Critical'),
    ]
    
    error_code = models.CharField(max_length=50, help_text="Error code from ErrorMessage")
    level = models.CharField(max_length=10, choices=ERROR_LEVELS, default='ERROR')
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="User who triggered the error (if applicable)"
    )
    request_path = models.CharField(max_length=500, blank=True, help_text="HTTP request path")
    request_method = models.CharField(max_length=10, blank=True, help_text="HTTP request method")
    user_agent = models.TextField(blank=True, help_text="User agent string")
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="Client IP address")
    error_message = models.TextField(help_text="Error message shown to user")
    technical_details = models.TextField(help_text="Full technical error details")
    stack_trace = models.TextField(blank=True, help_text="Python stack trace")
    resolved = models.BooleanField(default=False, help_text="Whether this error has been resolved")
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='resolved_errors',
        help_text="Admin who resolved this error"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.level}: {self.error_code} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def resolve(self, resolved_by_user=None):
        """Mark this error as resolved."""
        self.resolved = True
        self.resolved_at = timezone.now()
        if resolved_by_user:
            self.resolved_by = resolved_by_user
        self.save()  
