"""
Utility functions for error logging and database-stored error messages.
"""
import traceback
import logging
from typing import Optional, Dict, Any
from django.http import HttpRequest
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import ErrorMessage, ErrorLog

User = get_user_model()
logger = logging.getLogger(__name__)


def get_error_message(error_code: str, fallback_message: str = None) -> Dict[str, str]:
    """
    Get error message from database by error code.
    
    Args:
        error_code: The error code to look up
        fallback_message: Message to use if error code not found
        
    Returns:
        Dict with 'message' and 'title' keys
    """
    try:
        error_msg = ErrorMessage.objects.get(code=error_code, is_active=True)
        return {
            'message': error_msg.message,
            'title': error_msg.title,
            'error_type': error_msg.error_type,
            'technical_details': error_msg.technical_details
        }
    except ErrorMessage.DoesNotExist:
        logger.warning(f"Error code '{error_code}' not found in database")
        return {
            'message': fallback_message or f"An error occurred (Code: {error_code})",
            'title': 'System Error',
            'error_type': 'SYSTEM',
            'technical_details': f'Error code {error_code} not found in database'
        }


def log_error(
    error_code: str,
    level: str = 'ERROR',
    user: Optional[User] = None,
    request: Optional[HttpRequest] = None,
    exception: Optional[Exception] = None,
    additional_details: Optional[str] = None,
    **kwargs
) -> ErrorLog:
    """
    Log an error to the database.
    
    Args:
        error_code: Error code from ErrorMessage table
        level: Error level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        user: User who triggered the error (if applicable)
        request: HTTP request object
        exception: Exception object
        additional_details: Additional details to include
        **kwargs: Additional fields for ErrorLog
        
    Returns:
        Created ErrorLog instance
    """
    # Get error message from database
    error_data = get_error_message(error_code)
    
    # Extract request information
    request_path = ""
    request_method = ""
    user_agent = ""
    ip_address = None
    
    if request:
        request_path = request.path
        request_method = request.method
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        ip_address = get_client_ip(request)
    
    # Prepare technical details
    technical_details = error_data['technical_details']
    if additional_details:
        technical_details += f"\n\nAdditional Details: {additional_details}"
    
    if exception:
        technical_details += f"\n\nException: {str(exception)}"
        technical_details += f"\nException Type: {type(exception).__name__}"
    
    # Get stack trace if exception provided
    stack_trace = ""
    if exception:
        stack_trace = traceback.format_exc()
    
    # Create error log entry
    error_log = ErrorLog.objects.create(
        error_code=error_code,
        level=level,
        user=user,
        request_path=request_path,
        request_method=request_method,
        user_agent=user_agent,
        ip_address=ip_address,
        error_message=error_data['message'],
        technical_details=technical_details,
        stack_trace=stack_trace,
        **kwargs
    )
    
    # Also log to Django's logging system
    log_level = getattr(logging, level, logging.ERROR)
    logger.log(log_level, f"Error logged: {error_code} - {error_data['message']}")
    
    return error_log


def get_client_ip(request: HttpRequest) -> Optional[str]:
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def create_default_error_messages():
    """Create default error messages in the database."""
    default_errors = [
        # Authentication errors
        ('AUTH_INVALID_CREDENTIALS', 'AUTH', 'Invalid Login Credentials', 
         'The email address or password you entered is incorrect. Please try again.',
         'User provided incorrect login credentials.'),
        
        ('AUTH_ACCOUNT_SUSPENDED', 'AUTH', 'Account Suspended',
         'Your account has been suspended due to too many failed login attempts. Please contact your administrator.',
         'Account suspended due to failed login attempts.'),
        
        ('AUTH_SESSION_EXPIRED', 'AUTH', 'Session Expired',
         'Your session has expired. Please log in again.',
         'JWT token expired or invalid.'),
        
        ('AUTH_PERMISSION_DENIED', 'PERMISSION', 'Access Denied',
         'You do not have permission to perform this action.',
         'User lacks required permissions for this operation.'),
        
        # Validation errors
        ('VALIDATION_PASSWORD_REQUIREMENTS', 'VALIDATION', 'Password Requirements Not Met',
         'Password must be at least 8 characters, start with a letter, and contain at least one letter, one number, and one special character.',
         'Password validation failed against security requirements.'),
        
        ('VALIDATION_PASSWORD_MIN_LENGTH', 'VALIDATION', 'Password Too Short',
         'Password must be at least 8 characters long.',
         'Password does not meet minimum length requirement.'),
        
        ('VALIDATION_PASSWORD_START_LETTER', 'VALIDATION', 'Password Must Start with Letter',
         'Password must start with a letter (A-Z or a-z).',
         'Password does not start with a letter.'),
        
        ('VALIDATION_PASSWORD_MISSING_LETTER', 'VALIDATION', 'Password Missing Letter',
         'Password must contain at least one letter (A-Z or a-z).',
         'Password does not contain any letters.'),
        
        ('VALIDATION_PASSWORD_MISSING_NUMBER', 'VALIDATION', 'Password Missing Number',
         'Password must contain at least one number (0-9).',
         'Password does not contain any numbers.'),
        
        ('VALIDATION_PASSWORD_MISSING_SPECIAL', 'VALIDATION', 'Password Missing Special Character',
         'Password must contain at least one special character (e.g., !@#$%^&*).',
         'Password does not contain any special characters.'),
        
        ('VALIDATION_EMAIL_EXISTS', 'VALIDATION', 'Email Already Exists',
         'An account with this email address already exists.',
         'Email address is already registered in the system.'),
        
        ('VALIDATION_REQUIRED_FIELD', 'VALIDATION', 'Required Field Missing',
         'Please fill in all required fields.',
         'One or more required form fields are empty.'),
        
        ('VALIDATION_PASSWORD_MISMATCH', 'VALIDATION', 'Passwords Do Not Match',
         'The passwords you entered do not match. Please try again.',
         'Password and confirmation password do not match.'),
        
        ('VALIDATION_PASSWORD_REUSE', 'VALIDATION', 'Password Already Used',
         'You cannot reuse a recent password. Please choose a different password.',
         'New password matches one of the user\'s recent passwords.'),
        
        # System errors
        ('SYSTEM_DATABASE_ERROR', 'SYSTEM', 'Database Error',
         'A database error occurred. Please try again later.',
         'Database connection or query failed.'),
        
        ('SYSTEM_EMAIL_ERROR', 'SYSTEM', 'Email Service Error',
         'Unable to send email. Please try again later.',
         'Email service failed to send message.'),
        
        ('SYSTEM_FILE_UPLOAD_ERROR', 'SYSTEM', 'File Upload Error',
         'Failed to upload file. Please check the file format and size.',
         'File upload process failed.'),
        
        # User action errors
        ('USER_SECURITY_QUESTIONS_WRONG', 'USER_ACTION', 'Security Questions Incorrect',
         'The answers to your security questions are incorrect. Please try again.',
         'User provided incorrect answers to security questions.'),
        
        ('USER_ACCOUNT_NOT_FOUND', 'USER_ACTION', 'Account Not Found',
         'No account found with the provided information.',
         'User account lookup failed.'),
        
        ('USER_ROLE_NOT_ASSIGNED', 'USER_ACTION', 'Role Required',
         'A role must be assigned before approving this request.',
         'Registration request missing assigned role.'),
        
        ('USER_SUSPENSION_FAILED', 'USER_ACTION', 'Suspension Failed',
         'Failed to suspend user. Please try again.',
         'User suspension operation failed.'),
    ]
    
    for code, error_type, title, message, technical_details in default_errors:
        ErrorMessage.objects.get_or_create(
            code=code,
            defaults={
                'error_type': error_type,
                'title': title,
                'message': message,
                'technical_details': technical_details,
                'is_active': True
            }
        )
    
    logger.info(f"Created/updated {len(default_errors)} default error messages")


class DatabaseErrorResponse:
    """Helper class to create standardized error responses using database messages."""
    
    @staticmethod
    def create_response(error_code: str, status_code: int = 400, **kwargs):
        """Create a standardized error response."""
        error_data = get_error_message(error_code)
        
        response_data = {
            'detail': error_data['message'],
            'error_code': error_code,
            'title': error_data['title'],
            'error_type': error_data['error_type']
        }
        
        # Add any additional data
        response_data.update(kwargs)
        
        from rest_framework.response import Response
        return Response(response_data, status=status_code)
