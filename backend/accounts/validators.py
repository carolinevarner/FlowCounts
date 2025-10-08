import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
from django.contrib.auth.hashers import check_password


def get_password_error_message(error_code):
    """Get password validation error message from database."""
    try:
        from .error_utils import get_error_message
        error_data = get_error_message(error_code)
        return error_data['message']
    except Exception:
        # Fallback messages if database lookup fails
        fallback_messages = {
            'VALIDATION_PASSWORD_MIN_LENGTH': 'Password must be at least 8 characters long.',
            'VALIDATION_PASSWORD_START_LETTER': 'Password must start with a letter (A-Z or a-z).',
            'VALIDATION_PASSWORD_MISSING_LETTER': 'Password must contain at least one letter (A-Z or a-z).',
            'VALIDATION_PASSWORD_MISSING_NUMBER': 'Password must contain at least one number (0-9).',
            'VALIDATION_PASSWORD_MISSING_SPECIAL': 'Password must contain at least one special character (e.g., !@#$%^&*).',
            'VALIDATION_PASSWORD_REUSE': 'You cannot reuse a recent password. Please choose a different password.',
        }
        return fallback_messages.get(error_code, 'Password validation failed.')


class StartsWithLetterValidator:
    """Validator to ensure password starts with a letter."""
    
    def validate(self, password, user=None):
        if not password or not password[0].isalpha():
            message = get_password_error_message('VALIDATION_PASSWORD_START_LETTER')
            raise ValidationError(message, code='password_start_letter')
    
    def get_help_text(self):
        return get_password_error_message('VALIDATION_PASSWORD_START_LETTER')


class ContainsLetterNumberSpecialValidator:
    """Validator to ensure password contains letter, number, and special character."""
    
    def validate(self, password, user=None):
        errors = []
        
        # Check for at least one letter
        if not re.search(r"[A-Za-z]", password):
            message = get_password_error_message('VALIDATION_PASSWORD_MISSING_LETTER')
            errors.append(ValidationError(message, code='password_missing_letter'))
        
        # Check for at least one number
        if not re.search(r"\d", password):
            message = get_password_error_message('VALIDATION_PASSWORD_MISSING_NUMBER')
            errors.append(ValidationError(message, code='password_missing_number'))
        
        # Check for at least one special character
        if not re.search(r"[^\w\s]", password):
            message = get_password_error_message('VALIDATION_PASSWORD_MISSING_SPECIAL')
            errors.append(ValidationError(message, code='password_missing_special'))
        
        if errors:
            raise ValidationError(errors)
    
    def get_help_text(self):
        return "Password must contain at least one letter, one number, and one special character."

class PasswordNotInHistoryValidator:
    """Validator to prevent password reuse using PasswordHistory model."""
    
    def __init__(self, last_n=5):
        self.last_n = last_n

    def validate(self, password, user=None):
        if not user or not user.pk:
            return
        recent = user.password_history.order_by("-created_at")[:self.last_n]
        for h in recent:
            if check_password(password, h.password):
                message = get_password_error_message('VALIDATION_PASSWORD_REUSE')
                raise ValidationError(message, code="password_in_history")

    def get_help_text(self):
        return get_password_error_message('VALIDATION_PASSWORD_REUSE')
    
    
class PreventPasswordReuseValidator:
    """Validator to prevent password reuse using PasswordHistory model."""
    
    def __init__(self, last_n=5):
        self.last_n = last_n

    def validate(self, password, user=None):
        if not user or not user.pk:
            return
        recent = user.password_history.order_by("-created_at")[:self.last_n]
        for h in recent:
            if check_password(password, h.password):
                message = get_password_error_message('VALIDATION_PASSWORD_REUSE')
                raise ValidationError(message, code="password_in_history")

    def get_help_text(self):
        return get_password_error_message('VALIDATION_PASSWORD_REUSE')

