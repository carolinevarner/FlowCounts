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
        ("ACCOUNT_CREATED", "Account Created"),
        ("ACCOUNT_UPDATED", "Account Updated"),
        ("ACCOUNT_ACTIVATED", "Account Activated"),
        ("ACCOUNT_DEACTIVATED", "Account Deactivated"),
        ("JOURNAL_ENTRY_CREATED", "Journal Entry Created"),
        ("JOURNAL_ENTRY_UPDATED", "Journal Entry Updated"),
        ("JOURNAL_ENTRY_APPROVED", "Journal Entry Approved"),
        ("JOURNAL_ENTRY_REJECTED", "Journal Entry Rejected"),
    ]

    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="events_performed"
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="events_targeting"
    )
    details = models.TextField(blank=True)
    before_image = models.JSONField(null=True, blank=True, help_text="State of the record before the change")
    after_image = models.JSONField(null=True, blank=True, help_text="State of the record after the change")
    record_type = models.CharField(max_length=50, blank=True, help_text="Type of record (User, Account, etc.)")
    record_id = models.IntegerField(null=True, blank=True, help_text="ID of the affected record")
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


class ChartOfAccounts(models.Model):
    ACCOUNT_CATEGORY_CHOICES = [
        ('ASSET', 'Asset'),
        ('LIABILITY', 'Liability'),
        ('EQUITY', 'Equity'),
        ('REVENUE', 'Revenue'),
        ('EXPENSE', 'Expense'),
    ]
    
    NORMAL_SIDE_CHOICES = [
        ('DEBIT', 'Debit'),
        ('CREDIT', 'Credit'),
    ]
    
    STATEMENT_CHOICES = [
        ('IS', 'Income Statement'),
        ('BS', 'Balance Sheet'),
        ('RE', 'Retained Earnings'),
    ]
    
    account_name = models.CharField(max_length=255, unique=True)
    account_number = models.CharField(max_length=50, unique=True)
    account_description = models.TextField()
    normal_side = models.CharField(max_length=10, choices=NORMAL_SIDE_CHOICES)
    account_category = models.CharField(max_length=20, choices=ACCOUNT_CATEGORY_CHOICES)
    account_subcategory = models.CharField(max_length=100)
    initial_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    order = models.PositiveIntegerField(help_text="Display order (e.g., 01 for Cash)")
    statement = models.CharField(max_length=5, choices=STATEMENT_CHOICES)
    comment = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='accounts_created'
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accounts_updated'
    )
    is_active = models.BooleanField(default=True)
    deactivate_from = models.DateField(blank=True, null=True)
    deactivate_to = models.DateField(blank=True, null=True)
    
    class Meta:
        ordering = ['order', 'account_number']
        verbose_name = 'Chart of Account'
        verbose_name_plural = 'Chart of Accounts'
    
    def __str__(self):
        return f"{self.account_number} - {self.account_name}"
    
    def can_deactivate(self):
        return self.balance == 0
    
    def is_currently_deactivated(self):
        if not self.is_active:
            return True
        
        today = timezone.localdate()
        if self.deactivate_from and self.deactivate_to:
            return self.deactivate_from <= today <= self.deactivate_to
        elif self.deactivate_from and not self.deactivate_to:
            return self.deactivate_from <= today
        
        return False


class JournalEntry(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    entry_date = models.DateField()
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='journal_entries_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='journal_entries_reviewed'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    rejection_reason = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-entry_date', '-created_at']
        verbose_name = 'Journal Entry'
        verbose_name_plural = 'Journal Entries'
    
    def __str__(self):
        return f"JE-{self.id} ({self.entry_date})"
    
    def total_debits(self):
        return sum(line.debit for line in self.lines.all())
    
    def total_credits(self):
        return sum(line.credit for line in self.lines.all())
    
    def is_balanced(self):
        return self.total_debits() == self.total_credits()
    
    def has_valid_lines(self):
        lines = list(self.lines.all())
        if len(lines) < 2:
            return False
        has_debit = any(line.debit > 0 for line in lines)
        has_credit = any(line.credit > 0 for line in lines)
        return has_debit and has_credit


class JournalEntryLine(models.Model):
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name='lines'
    )
    account = models.ForeignKey(
        ChartOfAccounts,
        on_delete=models.PROTECT,
        related_name='journal_lines'
    )
    description = models.CharField(max_length=255, blank=True)
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['order', 'id']
    
    def __str__(self):
        return f"{self.account.account_name}: Dr {self.debit} Cr {self.credit}"


class JournalEntryAttachment(models.Model):
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(upload_to='journal_attachments/%Y/%m/')
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    
    class Meta:
        ordering = ['uploaded_at']
    
    def __str__(self):
        return f"{self.file_name} ({self.journal_entry})"  
