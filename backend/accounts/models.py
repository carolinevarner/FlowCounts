from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.conf import settings

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

    profile_image = models.ImageField(upload_to="profiles/", null=True, blank=True)

    address = models.CharField(max_length=255, blank=True)
    dob = models.DateField(blank=True, null=True)

    role = models.CharField(max_length=20, choices=[
        ('ADMIN', 'Admin'),
        ('MANAGER', 'Manager'),
        ('ACCOUNTANT', 'Accountant'),
    ])
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True)

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
    first_name = models.CharField(max_length=150)
    last_name  = models.CharField(max_length=150)
    address    = models.CharField(max_length=255, blank=True)
    dob        = models.DateField()
    email      = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    approved   = models.BooleanField(null=True, blank=True)
    reviewed_by = models.ForeignKey("accounts.User", null=True, blank=True,
                                    on_delete=models.SET_NULL, related_name="reviewed_requests")
    review_note = models.TextField(blank=True)


class EventLog(models.Model):
    ACTION_CHOICES = [
        ("USER_CREATED", "User Created"),
        ("USER_ACTIVATED", "User Activated"),
        ("USER_DEACTIVATED", "User Deactivated"),
        ("USER_SUSPENDED", "User Suspended"),
        ("REQUEST_APPROVED", "Access Approved"),
        ("REQUEST_REJECTED", "Access Rejected"),
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
