from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class Role(models.TextChoices):
    ADMIN = "ADMIN", "Administrator"
    MANAGER = "MANAGER", "Manager"
    ACCOUNTANT = "ACCOUNTANT", "Accountant"

def avatar_path(instance, filename):
    return f"avatars/{instance.id}/{filename}"

class User(AbstractUser):
    # Display handle shown in the UI (e.g., adminUser). Real username (for DB) is auto-generated (f+lastname+mmyy)
    display_handle = models.CharField(max_length=50, unique=True, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.ACCOUNTANT)
    picture = models.ImageField(upload_to=avatar_path, blank=True, null=True)

    # suspension & activation window
    suspend_from = models.DateField(blank=True, null=True)
    suspend_to = models.DateField(blank=True, null=True)

    # login control
    failed_attempts = models.PositiveIntegerField(default=0)
    last_password_change = models.DateTimeField(blank=True, null=True)
    password_expires_at = models.DateTimeField(blank=True, null=True)

    address = models.CharField(max_length=255, blank=True)
    dob = models.DateField(blank=True, null=True)

    def is_currently_suspended(self) -> bool:
        today = timezone.localdate()
        if self.suspend_from and self.suspend_to:
            return self.suspend_from <= today <= self.suspend_to
        return False

class PasswordHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_history")
    password = models.CharField(max_length=256)  # hashed
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]

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

class SecurityQuestion(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="security_questions")
    question = models.CharField(max_length=255)
    answer_hash = models.CharField(max_length=255)  # hashed answer
