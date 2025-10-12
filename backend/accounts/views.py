from django.utils import timezone
from django.utils.dateparse import parse_date
from datetime import datetime
from datetime import date
from django.db import transaction
from django.db.models import Q
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from rest_framework import viewsets, mixins, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.parsers import MultiPartParser, FormParser


import time

from django.core.mail import send_mail
import logging, secrets, string

from .models import RegistrationRequest, EventLog, PasswordHistory, ChartOfAccounts
from .error_utils import log_error, DatabaseErrorResponse, get_error_message
from .serializers import (
    UserSerializer,
    UserLiteSerializer,
    RegistrationRequestSerializer,
    CreateUserSerializer,
    EventLogSerializer,
    ChartOfAccountsSerializer,
)
from .permissions import IsAdmin
from .password_utils import (
    save_password_to_history,
    set_password_expiration,
    check_password_expired,
    check_and_send_expiration_reminder,
) 

logger = logging.getLogger(__name__)
User = get_user_model()

def send_suspension_emails(user, max_attempts):
    """Send suspension emails to user and admin"""
    try:
        admin_emails = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
        
        # Check if suspended user is also an admin
        is_admin_user = user.email in admin_emails if user.email else False
        
        if is_admin_user:
            # If suspended user is an admin, send a combined email
            admin_subject = "FlowCounts: Your Admin Account Has Been Suspended"
            admin_body = (
                f"Hello {user.first_name or user.username},\n\n"
                f"Your FlowCounts admin account has been suspended due to {max_attempts} failed login attempts.\n\n"
                f"Account Details:\n"
                f"User: {user.username} ({user.email})\n"
                f"Name: {user.first_name} {user.last_name}\n"
                f"Failed Attempts: {max_attempts}\n"
                f"Time: {timezone.now()}\n\n"
                "As an admin, you can reactivate your account by accessing the system through another admin account or contacting support.\n\n"
                "FlowCounts Team"
            )
            send_mail(
                admin_subject,
                admin_body,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            logger.info(f"Sent combined suspension email to admin user {user.email}")
        else:
            # Normal flow: send separate emails to user and admin
            # Email to suspended user
            if user.email:
                user_subject = "FlowCounts Account Suspended"
                user_body = (
                    f"Hello {user.first_name or user.username},\n\n"
                    f"Your FlowCounts account has been suspended due to {max_attempts} failed login attempts.\n\n"
                    "Please contact your administrator to reactivate your account.\n\n"
                    "FlowCounts Team"
                )
                send_mail(
                    user_subject,
                    user_body,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
                logger.info(f"Sent suspension email to user {user.email}")
            
            # Email to admin
            if admin_emails:
                admin_subject = "FlowCounts: User Account Suspended"
                admin_body = (
                    f"A user account has been suspended due to failed login attempts:\n\n"
                    f"User: {user.username} ({user.email})\n"
                    f"Name: {user.first_name} {user.last_name}\n"
                    f"Failed Attempts: {max_attempts}\n"
                    f"Time: {timezone.now()}\n\n"
                    "Please review and reactivate the account if needed."
                )
                send_mail(
                    admin_subject,
                    admin_body,
                    settings.DEFAULT_FROM_EMAIL,
                    admin_emails,
                    fail_silently=False,
                )
                logger.info(f"Sent admin notification email to {admin_emails}")
            
    except Exception as e:
        logger.error(f"Failed to send suspension emails: {e}", exc_info=True)

def send_scheduled_suspension_emails(user, start_date, end_date):
    """Send emails when an admin schedules a suspension between dates."""
    try:
        start_str = start_date.isoformat() if start_date else ""
        end_str = end_date.isoformat() if end_date else ""

        # Notify user
        if user.email and (start_str or end_str):
            subject = "FlowCounts Account Suspended"
            if start_str and end_str:
                details_line = f"Your account has been suspended from {start_str} to {end_str}."
            elif start_str and not end_str:
                details_line = f"Your account has been suspended starting {start_str}."
            else:
                details_line = f"Your account has been suspended until {end_str}."
            body = (
                f"Hello {user.first_name or user.username},\n\n"
                f"{details_line}\n\n"
                "Please contact your administrator if you have questions.\n\n"
                "FlowCounts Team"
            )
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)

        # Notify admins
        admin_emails = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
        if admin_emails:
            subject = "FlowCounts: User Account Suspended"
            if start_str and end_str:
                details_line = f"Suspended from {start_str} to {end_str}."
            elif start_str and not end_str:
                details_line = f"Suspended starting {start_str}."
            else:
                details_line = f"Suspended until {end_str}."
            body = (
                "An administrator has suspended a user account.\n\n"
                f"User: {user.username} ({user.email})\n"
                f"Name: {user.first_name} {user.last_name}\n"
                f"{details_line}\n\n"
                "This action was performed via the admin Users page."
            )
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, admin_emails, fail_silently=False)
    except Exception as e:
        logger.error(f"Failed to send scheduled suspension emails: {e}", exc_info=True)

def build_username(first_name: str, last_name: str, when=None) -> str:
    when = when or timezone.now()
    mmYY = when.strftime("%m%y")
    base = f"{(first_name or '').strip()[:1]}{(last_name or '').strip()}".lower()
    base = "".join(ch for ch in base if ch.isalnum())
    candidate = f"{base}{mmYY}" if base else f"user{mmYY}"
    if not User.objects.filter(username__iexact=candidate).exists():
        return candidate
    i = 2
    while True:
        test = f"{candidate}{i}"
        if not User.objects.filter(username__iexact=test).exists():
            return test
        i += 1

def is_suspended_now(user, today=None):
    """
    Return True if today's date is within the user's suspend window (inclusive).
    If suspend_to is missing, treat it as the same day as suspend_from.
    """
    if not user.suspend_from:
        return False
    today = today or timezone.now().date()
    end = user.suspend_to or user.suspend_from
    return user.suspend_from <= today <= end

class FlowTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        username = attrs.get("username")
        pwd = attrs.get("password")
        data = super().validate(attrs)

        data.update({
            "user": {
                "id": self.user.id,
                "display_handle": self.user.display_handle or self.user.username,
                "username": self.user.username,
                "role": self.user.role,
                "picture": self.user.picture.url if self.user.picture else None,
                "failed_attempts": 0,
            }
        })
        return data

class FlowTokenView(TokenObtainPairView):
    """Accept username OR email OR display_handle + password; return JWT + user."""
    permission_classes = [AllowAny]

    def post(self, request):
        ident = (request.data.get("username") or "").strip()
        password = (request.data.get("password") or "").strip()

        if not ident or not password:
            return Response({"detail": "Missing username or password"}, status=400)

        user_obj = User.objects.filter(
            Q(username__iexact=ident) |
            Q(email__iexact=ident) |
            Q(display_handle__iexact=ident)
        ).first()

        # First, verify direct password match against the identified user
        user = None
        reason = None
        if user_obj:
            if user_obj.check_password(password):
                user = user_obj
                # Reset failed attempts on successful login
                if user_obj.failed_attempts > 0:
                    user_obj.failed_attempts = 0
                    user_obj.save(update_fields=["failed_attempts"])
            else:
                reason = "password_mismatch"
                # Increment failed attempts
                user_obj.failed_attempts += 1
                user_obj.save(update_fields=["failed_attempts"])
                
                # Check if user should be suspended
                max_attempts = getattr(settings, "MAX_FAILED_LOGINS", 3)
                if user_obj.failed_attempts >= max_attempts:
                    # Suspend user
                    user_obj.is_active = False
                    user_obj.save(update_fields=["is_active"])
                    
                    # Log suspension event
                    EventLog.objects.create(
                        action="USER_SUSPENDED",
                        actor=None,  # System action
                        target_user=user_obj,
                        details=f"User suspended due to {max_attempts} failed login attempts"
                    )
                    
                    # Send emails
                    send_suspension_emails(user_obj, max_attempts)
        else:
            reason = "user_not_found"

        if not user:
            # Fall back to Django's authenticate using resolved username
            real_username = user_obj.username if user_obj else ident
            auth_user = authenticate(request, username=real_username, password=password)
            if auth_user:
                user = auth_user
                reason = None

        if not user:
            mapped = user_obj.username if user_obj else ident
            logger.warning("Login failed for ident=%s (mapped=%s) reason=%s", ident, mapped, reason)
            
            # Calculate attempts left
            attempts_left = None
            if user_obj and reason == "password_mismatch":
                max_attempts = getattr(settings, "MAX_FAILED_LOGINS", 3)
                attempts_left = max_attempts - user_obj.failed_attempts
                
                if attempts_left <= 0:
                    # Log the suspension error
                    log_error(
                        'AUTH_ACCOUNT_SUSPENDED',
                        level='CRITICAL',
                        user=user_obj,
                        request=request,
                        additional_details=f"Failed login attempts: {user_obj.failed_attempts}"
                    )
                    return DatabaseErrorResponse.create_response(
                        'AUTH_ACCOUNT_SUSPENDED',
                        status=403,
                        suspended=True
                    )
                else:
                    # Log the failed login attempt
                    log_error(
                        'AUTH_INVALID_CREDENTIALS',
                        level='WARNING',
                        user=user_obj,
                        request=request,
                        additional_details=f"Failed login attempts: {user_obj.failed_attempts}, Attempts left: {attempts_left}"
                    )
                    error_data = get_error_message('AUTH_INVALID_CREDENTIALS')
                    return Response({
                        "detail": f"{error_data['message']} {attempts_left} attempts left",
                        "attempts_left": attempts_left
                    }, status=400)
            
            # Log the invalid credentials error
            log_error(
                'AUTH_INVALID_CREDENTIALS',
                level='WARNING',
                request=request,
                additional_details=f"Reason: {reason}, Mapped: {mapped}"
            )
            return DatabaseErrorResponse.create_response('AUTH_INVALID_CREDENTIALS', status=400)
        if not user.is_active:
            return Response({"detail": "User is inactive/suspended"}, status=403)
        
        if is_suspended_now(user):
            until = user.suspend_to or user.suspend_from
            return Response({"detail": f"User is suspended until {until}."}, status=403)
        
        # Check if password has expired
        is_expired, expiry_reason = check_password_expired(user)
        if is_expired:
            return Response({
                "detail": expiry_reason,
                "password_expired": True
            }, status=403)

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        data_user = {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "display_handle": getattr(user, "display_handle", "") or "",
        }
        return Response({"access": access, "refresh": str(refresh), "user": data_user}, status=200)

class UserAdminViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = User.objects.all().order_by("date_joined")
    serializer_class = UserLiteSerializer

    def get_serializer_class(self):
        return CreateUserSerializer if self.action == "create" else UserSerializer
    
    # Ensure PATCH is treated as partial update
    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        
        # Get the user being updated
        user = self.get_object()
        old_role = user.role
        
        # Perform the update
        response = super().update(request, *args, **kwargs)
        
        # Get the updated user data
        updated_user = User.objects.get(id=user.id)
        
        # Log the update event
        try:
            changes = []
            if old_role != updated_user.role:
                changes.append(f"role changed from {old_role} to {updated_user.role}")
            
            # Check for other common changes
            if request.data.get('first_name') and user.first_name != updated_user.first_name:
                changes.append(f"first name changed from '{user.first_name}' to '{updated_user.first_name}'")
            if request.data.get('last_name') and user.last_name != updated_user.last_name:
                changes.append(f"last name changed from '{user.last_name}' to '{updated_user.last_name}'")
            if request.data.get('email') and user.email != updated_user.email:
                changes.append(f"email changed from '{user.email}' to '{updated_user.email}'")
            if request.data.get('is_active') is not None and user.is_active != updated_user.is_active:
                status = "activated" if updated_user.is_active else "deactivated"
                changes.append(f"user {status}")
            
            if changes:
                details = f"User updated: {', '.join(changes)}"
                EventLog.objects.create(
                    action="USER_UPDATED",
                    actor=request.user,
                    target_user=updated_user,
                    details=details
                )
        except Exception:
            logger.warning("Failed to log USER_UPDATED event", exc_info=True)
        
        return response

    # Allow POST create while auto-generating username when missing
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if not data.get("username"):
            data["username"] = build_username(
                data.get("first_name", ""),
                data.get("last_name", ""),
            )
        # Ensure a unique display_handle
        if not data.get("display_handle"):
            base = f"{(data.get('first_name','') or '')[:1]}{(data.get('last_name','') or '')}".lower()
            base = "".join(ch for ch in base if ch.isalnum()) or "user"
            candidate = base
            idx = 1
            while User.objects.filter(display_handle__iexact=candidate).exists():
                idx += 1
                candidate = f"{base}{idx}"
            data["display_handle"] = candidate
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Get the created user for email notifications and password setup
        created_user = User.objects.filter(username=serializer.data.get("username")).first()
        
        # Set up temporary password expiration (3 days)
        if created_user:
            set_password_expiration(created_user, is_temporary=True)
            # Save the initial password to history
            save_password_to_history(created_user, created_user.password)
            created_user.save()
        
        # Log event
        try:
            EventLog.objects.create(
                action="USER_CREATED",
                actor=request.user if request.user.is_authenticated else None,
                target_user=created_user,
                details=f"Created user {serializer.data.get('username')} ({serializer.data.get('email','')})",
            )
        except Exception:
            logger.warning("Failed to log USER_CREATED event", exc_info=True)
        
        # Send email notifications
        try:
            if created_user and created_user.email:
                # Email to new user with temporary password warning
                send_mail(
                    "Welcome to FlowCounts - Action Required",
                    f"Hello {created_user.first_name or created_user.username},\n\n"
                    f"Your FlowCounts account has been created by an administrator.\n\n"
                    f"Username: {created_user.username}\n"
                    f"Email: {created_user.email}\n"
                    f"Role: {created_user.role}\n\n"
                    f"⚠️ IMPORTANT: Your password is temporary and must be changed within 3 days.\n"
                    f"Deadline: {created_user.password_must_change_by.strftime('%Y-%m-%d %H:%M')}\n\n"
                    f"You will receive daily reminder emails until you change your password.\n"
                    f"If you don't change it within 3 days, you will need to use the 'Forgot Password' feature.\n\n"
                    "To change your password after logging in:\n"
                    "1. Log in to FlowCounts\n"
                    "2. Go to your profile settings\n"
                    "3. Change your password immediately\n\n"
                    "FlowCounts Team",
                    settings.DEFAULT_FROM_EMAIL,
                    [created_user.email],
                    fail_silently=False,
                )
                
                # Email to admin
                admin_emails = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
                if admin_emails:
                    send_mail(
                        "FlowCounts: New User Created",
                        f"A new user has been created in the system:\n\n"
                        f"User: {created_user.username} ({created_user.email})\n"
                        f"Name: {created_user.first_name} {created_user.last_name}\n"
                        f"Role: {created_user.role}\n"
                        f"Created by: {request.user.username if request.user.is_authenticated else 'System'}\n\n"
                        "The user has been notified and can now access the system.",
                        settings.DEFAULT_FROM_EMAIL,
                        admin_emails,
                        fail_silently=False,
                    )
        except Exception as e:
            logger.error(f"Failed to send user creation emails: {e}", exc_info=True)
            
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.suspend_from = None
        user.suspend_to = None
        user.save(update_fields=["is_active", "suspend_from", "suspend_to"])
        EventLog.objects.create(
            action="USER_ACTIVATED", actor=request.user, target_user=user, details="User activated"
        )
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        EventLog.objects.create(
            action="USER_DEACTIVATED", actor=request.user, target_user=user, details="User deactivated"
        )
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        user = self.get_object()

        start_raw = (request.data.get("suspend_from") or "").strip()
        end_raw   = (request.data.get("suspend_to") or "").strip()

        if not start_raw or not end_raw:
            # Treat as UNSUSPEND action
            user.suspend_from = None
            user.suspend_to = None
            user.is_active = True
            user.failed_attempts = 0
            user.save(update_fields=["suspend_from", "suspend_to", "is_active", "failed_attempts"])

            EventLog.objects.create(
                action="USER_UNSUSPENDED", actor=request.user, target_user=user,
                details="User unsuspended"
            )

            # Notify user of unsuspension
            try:
                if user.email:
                    send_mail(
                        "FlowCounts Account Unsuspended",
                        (
                            f"Hello {user.first_name or user.username},\n\n"
                            "Your FlowCounts account has been reactivated by an administrator.\n\n"
                            "You can log in now.\n\n"
                            "FlowCounts Team"
                        ),
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=False,
                    )
            except Exception as e:
                logger.error(f"Failed to send unsuspension email: {e}")

            return Response(UserSerializer(user).data)
        
        def parse_date_loose(value: str):
            if not value:
                return None
            # Try ISO first
            d = parse_date(value)
            if d:
                return d
            # Try common US formats
            for fmt in ("%m/%d/%Y", "%m-%d-%Y", "%Y/%m/%d", "%Y.%m.%d"):
                try:
                    return datetime.strptime(value, fmt).date()
                except Exception:
                    pass
            return None

        start = parse_date_loose(start_raw)
        end = parse_date_loose(end_raw)

        if (start_raw and not start) or (end_raw and not end):
            return Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD or MM/DD/YYYY."},
                status=400
            )
        if start and end and start > end:
            return Response(
                {"detail": "suspend_from cannot be after suspend_to."},
            )
        user.suspend_from = start
        user.suspend_to = end

        today = timezone.localdate()
        if start and end:
            user.is_active = not (start <= today <= end)
        elif start and not end:
            user.is_active = not (start <= today)
        elif end and not start:
            user.is_active = not (today <= end)

        user.save(update_fields=["suspend_from", "suspend_to", "is_active"])
        # Format suspension details more readably
        today = timezone.localdate()
        if user.suspend_from and user.suspend_to:
            details = f"User suspended from {today} to {user.suspend_to}"
        elif user.suspend_from:
            details = f"User suspended from {today} (indefinite)"
        elif user.suspend_to:
            details = f"User suspended until {user.suspend_to}"
        else:
            details = "User suspension cleared"
        
        EventLog.objects.create(
            action="USER_SUSPENDED", actor=request.user, target_user=user,
            details=details
        )

        # Send user/admin emails for date-based suspension
        send_scheduled_suspension_emails(user, user.suspend_from, user.suspend_to)
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=["get"])
    def report(self, request):
        return Response(UserSerializer(self.get_queryset(), many=True).data)

    @action(detail=False, methods=["get"])
    def expired_passwords(self, request):
        qs = User.objects.filter(password_expires_at__lt=timezone.now())
        return Response(UserSerializer(qs, many=True).data)


class RegistrationRequestViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    serializer_class = RegistrationRequestSerializer
    queryset = RegistrationRequest.objects.all().order_by("-created_at")

    def get_permissions(self):
        if self.action in ["create"]:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def create(self, request, *args, **kwargs):
        """Create a new registration request and send notification emails."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        data = serializer.data

        # Send email to the user who requested access
        try:
            user_subject = "FlowCounts: Access Request Received"
            user_body = (
                f"Hello {data.get('first_name', '')},\n\n"
                f"Thank you for requesting access to FlowCounts.\n\n"
                f"Your request has been received and is currently under review by an administrator.\n"
                f"You will receive an email notification once your request has been reviewed.\n\n"
                f"Request Details:\n"
                f"Name: {data.get('first_name', '')} {data.get('last_name', '')}\n"
                f"Email: {data.get('email', '')}\n\n"
                f"If you did not submit this request, please disregard this email.\n\n"
                f"FlowCounts Team"
            )
            send_mail(
                user_subject,
                user_body,
                settings.DEFAULT_FROM_EMAIL,
                [data.get('email', '')],
                fail_silently=False,
            )
            logger.info(f"Sent registration confirmation to {data.get('email', '')}")
        except Exception as e:
            logger.error(f"Failed to send user registration confirmation: {e}", exc_info=True)

        # Send email to admin(s)
        admin_emails = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
        if admin_emails:
            try:
                admin_subject = "FlowCounts: New Registration Request"
                admin_body = (
                    "A new registration request was submitted.\n\n"
                    f"Name: {data.get('first_name', '')} {data.get('last_name', '')}\n"
                    f"Email: {data.get('email', '')}\n"
                    f"DOB: {data.get('dob', '')}\n"
                    f"Address: {data.get('address', '')}\n\n"
                    "Please review it on the Admin → Users page."
                )
                send_mail(
                    admin_subject,
                    admin_body,
                    settings.DEFAULT_FROM_EMAIL,
                    admin_emails,
                    fail_silently=False,
                )
                logger.info(f"Sent admin registration email to {admin_emails}")
            except Exception as e:
                logger.error(f"Admin notify email failed: {e}", exc_info=True)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        if getattr(request.user, "role", "") != "ADMIN":
            qs = qs.filter(email=request.user.email)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsAdmin])
    def pending(self, request):
        qs = self.get_queryset().filter(approved__isnull=True)
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdmin])
    def assign_role(self, request, pk=None):
        req = self.get_object()
        role = request.data.get("role", "").strip().upper()
        
        # Allow clearing the role (empty string) or setting a valid role
        if role and role not in ["ADMIN", "MANAGER", "ACCOUNTANT"]:
            return Response(
                {"detail": "Invalid role. Must be ADMIN, MANAGER, or ACCOUNTANT."},
                status=400
            )
        
        # Set role to None if empty string, otherwise set to the provided role
        req.assigned_role = role if role else None
        req.save(update_fields=["assigned_role"])
        
        serializer = self.get_serializer(req)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdmin])
    def approve(self, request, pk=None):
        req = self.get_object()
        
        # Check if role is assigned
        if not req.assigned_role:
            return Response(
                {"detail": "Role must be assigned before approving the request."},
                status=400
            )

        alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"
        temp = ''.join(secrets.choice(alphabet) for _ in range(12))

        with transaction.atomic():
            req.approved = True
            req.reviewed_by = request.user
            req.save(update_fields=["approved", "reviewed_by"])

            username = build_username(req.first_name, req.last_name, when=timezone.now())
            # Generate unique display_handle
            base = f"{(req.first_name or '')[:1]}{(req.last_name or '')}".lower()
            base = "".join(ch for ch in base if ch.isalnum()) or "user"
            candidate = base
            idx = 1
            while User.objects.filter(display_handle__iexact=candidate).exists():
                idx += 1
                candidate = f"{base}{idx}"
            
            user = User.objects.create_user(
                username=username,
                display_handle=candidate,
                first_name=req.first_name,
                last_name=req.last_name,
                email=req.email,
                role=req.assigned_role,  
                address=req.address,
                dob=req.dob,
                is_active=True,
                # Copy security questions from registration request
                security_question_1=req.security_question_1,
                security_answer_1=req.security_answer_1,
                security_question_2=req.security_question_2,
                security_answer_2=req.security_answer_2,
                security_question_3=req.security_question_3,
                security_answer_3=req.security_answer_3,
            )
            user.set_password(temp)
            
            # Set up temporary password expiration (3 days)
            set_password_expiration(user, is_temporary=True)
            # Save the initial password to history
            save_password_to_history(user, user.password)
            
            user.save()

            subject = "FlowCounts Access Approved - Action Required"
            body = (
                f"Hello {req.first_name},\n\n"
                f"Your access request to FlowCounts has been approved!\n\n"
                f"Username: {user.username}\n"
                f"Role: {user.role}\n"
                f"Temporary password: {temp}\n"
                "Login: http://localhost:5173/login\n\n"
                f"⚠️ IMPORTANT: Your password is temporary and must be changed within 3 days.\n"
                f"Deadline: {user.password_must_change_by.strftime('%Y-%m-%d %H:%M')}\n\n"
                f"You will receive daily reminder emails until you change your password.\n"
                f"If you don't change it within 3 days, you will need to use the 'Forgot Password' feature.\n\n"
                "To change your password after logging in:\n"
                "1. Log in using the credentials above\n"
                "2. Go to your profile settings\n"
                "3. Change your password immediately\n\n"
                "FlowCounts Team"
            )
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [req.email], fail_silently=False)
            
            # Notify admin
            admin_emails = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
            if admin_emails:
                send_mail(
                    "FlowCounts: Registration Request Approved",
                    f"A registration request has been approved:\n\n"
                    f"User: {user.username} ({user.email})\n"
                    f"Name: {user.first_name} {user.last_name}\n"
                    f"Role: {user.role}\n"
                    f"Approved by: {request.user.username}\n\n"
                    "The user has been notified and can now access the system.",
                    settings.DEFAULT_FROM_EMAIL,
                    admin_emails,
                    fail_silently=False,
                )

        try:
            EventLog.objects.create(
                action="REQUEST_APPROVED", actor=request.user, target_user=user,
                details=f"Approved registration for {req.email}; created username={user.username}"
            )
        except Exception:
            logger.warning("Failed to log REQUEST_APPROVED event", exc_info=True)

        return Response({"detail": "Approved and user created", "user_id": user.id, "email_sent": True})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdmin])
    def reject(self, request, pk=None):
        req = self.get_object()
        note = request.data.get("note", "")
        with transaction.atomic():
            req.approved = False
            req.reviewed_by = request.user
            req.review_note = note
            req.save(update_fields=["approved", "reviewed_by", "review_note"])

            subject = "FlowCounts access decision"
            body = (
                f"Hello {req.first_name},\n\n"
                "Your request for access to FlowCounts was not approved."
                + (f"\nReason: {note}" if note else "")
            )
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [req.email], fail_silently=False)

        return Response({"detail": "Request rejected", "email_sent": True})


class EventLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = EventLog.objects.all().order_by("-created_at")
    serializer_class = EventLogSerializer



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_profile_photo(request):
    """
    Accepts multipart/form-data with field 'photo' (JPEG).
    Saves to MEDIA_ROOT/profiles/, updates request.user.profile_image,
    returns {'profile_image_url': '...'}.
    """
    file = request.FILES.get("photo")
    if not file:
        return Response({"detail": "No file provided (field 'photo')."}, status=400)

    ctype = (file.content_type or "").lower()
    if ctype not in ("image/jpeg", "image/jpg"):
        return Response({"detail": "Only JPEG images are allowed."}, status=400)

    if file.size > 5 * 1024 * 1024:
        return Response({"detail": "Max file size is 5MB."}, status=400)

    fname = f"profiles/user_{request.user.id}_{int(time.time())}.jpg"
    saved_path = default_storage.save(fname, ContentFile(file.read()))

    request.user.profile_image.name = saved_path
    request.user.save(update_fields=["profile_image"])

    ser = UserSerializer(request.user, context={"request": request})
    return Response({"profile_image_url": ser.data.get("profile_image_url")}, status=200)


@api_view(["POST"])
@permission_classes([AllowAny])
def get_username_by_email(request):
    """Get username and security questions for a given email address."""
    email = request.data.get("email", "").strip().lower()
    provided_username = request.data.get("username", "").strip()
    
    if not email:
        return Response(
            {"detail": "Email is required."},
            status=400
        )
    
    if not provided_username:
        return Response(
            {"detail": "Username is required."},
            status=400
        )
    
    try:
        # Find user by email (emails are now unique)
        user = User.objects.get(email__iexact=email)
        
        # Verify the provided username matches (can be username, display_handle, or email)
        username_matches = (
            user.username.lower() == provided_username.lower() or
            user.display_handle.lower() == provided_username.lower() or
            user.email.lower() == provided_username.lower()
        )
        
        if not username_matches:
            return Response(
                {"detail": "Username does not match the email address. Please check both fields."},
                status=400
            )
        
        # Check if user has security questions set
        if not all([user.security_question_1, user.security_question_2, user.security_question_3]):
            return Response(
                {"detail": "Security questions not set for this user."},
                status=400
            )
        
        return Response({
            "username": user.username,
            "security_questions": [
                user.security_question_1,
                user.security_question_2,
                user.security_question_3
            ]
        })
    except User.DoesNotExist:
        return Response(
            {"detail": "No user found with this email address."},
            status=404
        )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_expired_passwords_report(request):
    """Admin report of users with expired or soon-to-expire passwords."""
    from django.utils import timezone
    from datetime import timedelta
    from django.conf import settings
    
    # Check if user is admin
    if not hasattr(request.user, 'role') or request.user.role != 'ADMIN':
        return Response({"detail": "Admin access required"}, status=403)
    
    now = timezone.now()
    warning_days = getattr(settings, "PASSWORD_EXPIRY_WARNING_DAYS", 3)
    warning_date = now + timedelta(days=warning_days)
    
    # Get users with expired passwords
    expired_users = User.objects.filter(
        password_expires_at__lt=now,
        is_active=True
    ).values('id', 'username', 'email', 'first_name', 'last_name', 'password_expires_at')
    
    # Get users with passwords expiring soon (within warning period)
    expiring_soon_users = User.objects.filter(
        password_expires_at__lte=warning_date,
        password_expires_at__gt=now,
        is_active=True
    ).values('id', 'username', 'email', 'first_name', 'last_name', 'password_expires_at')
    
    # Convert to lists and add computed fields
    expired_list = []
    for user in expired_users:
        expired_list.append({
            **user,
            'password_expires_at': user['password_expires_at'].strftime('%Y-%m-%d %H:%M'),
            'status': 'expired',
            'days_overdue': (now.date() - user['password_expires_at'].date()).days
        })
    
    expiring_list = []
    for user in expiring_soon_users:
        days_until = (user['password_expires_at'].date() - now.date()).days
        expiring_list.append({
            **user,
            'password_expires_at': user['password_expires_at'].strftime('%Y-%m-%d %H:%M'),
            'status': 'expiring_soon',
            'days_until_expiry': days_until
        })
    
    return Response({
        'expired_passwords': expired_list,
        'expiring_soon_passwords': expiring_list,
        'total_expired': len(expired_list),
        'total_expiring_soon': len(expiring_list),
        'warning_period_days': warning_days
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_password_expiration(request):
    """Check if user's password is about to expire and send warning if needed."""
    user = request.user
    from django.utils import timezone
    from datetime import timedelta
    from django.conf import settings
    from django.core.mail import send_mail
    
    if not user.password_expires_at:
        return Response({"expires": False, "message": "Password expiration not set"})
    
    now = timezone.now()
    warning_days = getattr(settings, "PASSWORD_EXPIRY_WARNING_DAYS", 3)
    warning_date = user.password_expires_at - timedelta(days=warning_days)
    
    # Check if we're within the warning period and haven't sent a warning recently
    if now >= warning_date and now < user.password_expires_at:
        days_until_expiry = (user.password_expires_at - now).days + 1
        
        # Send email warning
        try:
            subject = "FlowCounts - Password Expiration Warning"
            body = (
                f"Dear {user.first_name},\n\n"
                f"Your password will expire in {days_until_expiry} day(s) on {user.password_expires_at.strftime('%Y-%m-%d')}.\n\n"
                f"Please change your password soon to avoid account lockout.\n\n"
                f"You can change your password by:\n"
                f"1. Going to your profile settings\n"
                f"2. Using the 'Forgot Password' feature on the login page\n\n"
                f"Best regards,\nFlowCounts Team"
            )
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        except Exception as e:
            logger.error(f"Failed to send password expiration warning to {user.email}: {e}")
        
        return Response({
            "expires": True,
            "days_until_expiry": days_until_expiry,
            "expiry_date": user.password_expires_at.strftime('%Y-%m-%d'),
            "warning_sent": True
        })
    
    # Check if password is already expired
    if now >= user.password_expires_at:
        return Response({
            "expires": True,
            "expired": True,
            "expiry_date": user.password_expires_at.strftime('%Y-%m-%d'),
            "message": "Password has expired"
        })
    
    return Response({"expires": False, "message": "Password is not expiring soon"})

@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    """Handle forgot password requests with security questions."""
    email = request.data.get("email", "").strip().lower()
    username = request.data.get("username", "").strip()
    answers = request.data.get("answers", [])
    new_password = request.data.get("new_password", "")
    
    if not all([email, username, answers, new_password]):
        return Response(
            {"detail": "Email, username, answers, and new password are required."},
            status=400
        )
    
    # Find user by email and username
    try:
        user = User.objects.get(email__iexact=email, username__iexact=username)
    except User.DoesNotExist:
        return Response(
            {"detail": "User not found with provided email and username."},
            status=404
        )
    
    # Check if user has security questions set
    if not all([user.security_question_1, user.security_question_2, user.security_question_3]):
        return Response(
            {"detail": "Security questions not set for this user."},
            status=400
        )
    
    # Verify answers (case-insensitive)
    expected_answers = [
        user.security_answer_1.lower().strip(),
        user.security_answer_2.lower().strip(),
        user.security_answer_3.lower().strip(),
    ]
    provided_answers = [answer.lower().strip() for answer in answers]
    
    if expected_answers != provided_answers:
        return Response(
            {"detail": "Security answers do not match."},
            status=400
        )
    
    # Validate new password using Django validators
    from django.core.exceptions import ValidationError
    from django.contrib.auth.password_validation import validate_password
    
    try:
        validate_password(new_password, user)
    except ValidationError as e:
        return Response(
            {"detail": "Password validation failed.", "errors": e.messages},
            status=400
        )
    
    # Save old password to history before changing
    save_password_to_history(user, user.password)
    
    # Update password
    user.set_password(new_password)
    user.failed_attempts = 0  # Reset failed attempts
    
    # Set regular password expiration (90 days, not temporary)
    set_password_expiration(user, is_temporary=False)
    
    user.save()
    
    # Save new password to history
    save_password_to_history(user, user.password)
    
    # Log the password reset event
    try:
        EventLog.objects.create(
            action="PASSWORD_RESET",
            actor=user,  # User resetting their own password
            target_user=user,
            details=f"Password reset via security questions"
        )
    except Exception:
        logger.warning("Failed to log PASSWORD_RESET event", exc_info=True)
    
    return Response({"detail": "Password reset successfully."})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Allow authenticated users to change their password."""
    user = request.user
    old_password = request.data.get("old_password", "")
    new_password = request.data.get("new_password", "")
    
    if not old_password or not new_password:
        return Response(
            {"detail": "Both old and new passwords are required."},
            status=400
        )
    
    # Verify old password
    if not user.check_password(old_password):
        return Response(
            {"detail": "Current password is incorrect."},
            status=400
        )
    
    # Validate new password using Django validators
    from django.core.exceptions import ValidationError
    from django.contrib.auth.password_validation import validate_password
    
    try:
        validate_password(new_password, user)
    except ValidationError as e:
        return Response(
            {"detail": "Password validation failed.", "errors": e.messages},
            status=400
        )
    
    # Save old password to history before changing
    save_password_to_history(user, user.password)
    
    # Update password
    user.set_password(new_password)
    
    # Set regular password expiration (90 days, not temporary)
    set_password_expiration(user, is_temporary=False)
    
    user.save()
    
    # Save new password to history
    save_password_to_history(user, user.password)
    
    # Log the password change event
    try:
        EventLog.objects.create(
            action="PASSWORD_CHANGED",
            actor=user,
            target_user=user,
            details="User changed their password"
        )
    except Exception:
        logger.warning("Failed to log PASSWORD_CHANGED event", exc_info=True)
    
    # Send confirmation email
    try:
        if user.email:
            send_mail(
                "FlowCounts: Password Changed Successfully",
                f"Hello {user.first_name or user.username},\n\n"
                f"Your password has been changed successfully.\n\n"
                f"Your password will expire in 90 days on {user.password_expires_at.strftime('%Y-%m-%d')}.\n"
                f"You will receive reminder emails 30 days and 60 days before expiration.\n\n"
                "If you did not make this change, please contact your administrator immediately.\n\n"
                "FlowCounts Team",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
    except Exception as e:
        logger.error(f"Failed to send password change confirmation email: {e}")
    
    return Response({"detail": "Password changed successfully."})


@api_view(["GET"])
def me(request):
    return Response(UserSerializer(request.user).data)


class ChartOfAccountsViewSet(viewsets.ModelViewSet):
    """ViewSet for Chart of Accounts CRUD operations."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = ChartOfAccounts.objects.all().order_by('order', 'account_number')
    serializer_class = ChartOfAccountsSerializer
    
    def get_permissions(self):
        """
        Managers and Admins can create/update/delete accounts.
        Accountants can only view (list/retrieve).
        """
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        # create, update, partial_update, destroy, activate, deactivate require Manager or Admin
        return [IsAuthenticated(), IsAdmin()]
    
    def _account_to_dict(self, account):
        """Convert account instance to dictionary for logging."""
        return {
            'account_number': account.account_number,
            'account_name': account.account_name,
            'account_description': account.account_description,
            'normal_side': account.normal_side,
            'account_category': account.account_category,
            'account_subcategory': account.account_subcategory,
            'initial_balance': str(account.initial_balance),
            'debit': str(account.debit),
            'credit': str(account.credit),
            'balance': str(account.balance),
            'order': account.order,
            'statement': account.statement,
            'comment': account.comment,
            'is_active': account.is_active,
            'deactivate_from': str(account.deactivate_from) if account.deactivate_from else None,
            'deactivate_to': str(account.deactivate_to) if account.deactivate_to else None,
        }
    
    def perform_create(self, serializer):
        """Set the created_by field when creating an account."""
        account = serializer.save(created_by=self.request.user)
        
        # Log account creation with after image
        try:
            EventLog.objects.create(
                action="ACCOUNT_CREATED",
                actor=self.request.user,
                record_type="ChartOfAccounts",
                record_id=account.id,
                before_image=None,
                after_image=self._account_to_dict(account),
                details=f"Created account: {account.account_number} - {account.account_name}"
            )
        except Exception as e:
            logger.warning(f"Failed to log ACCOUNT_CREATED event: {e}", exc_info=True)
    
    def perform_update(self, serializer):
        """Set the updated_by field when updating an account."""
        # Get before image
        account = self.get_object()
        before_image = self._account_to_dict(account)
        
        # Perform update
        account = serializer.save(updated_by=self.request.user)
        after_image = self._account_to_dict(account)
        
        # Log account update with before and after images
        try:
            EventLog.objects.create(
                action="ACCOUNT_UPDATED",
                actor=self.request.user,
                record_type="ChartOfAccounts",
                record_id=account.id,
                before_image=before_image,
                after_image=after_image,
                details=f"Updated account: {account.account_number} - {account.account_name}"
            )
        except Exception as e:
            logger.warning(f"Failed to log ACCOUNT_UPDATED event: {e}", exc_info=True)
    
    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """Activate an account and clear deactivation dates."""
        account = self.get_object()
        before_image = self._account_to_dict(account)
        
        account.is_active = True
        account.deactivate_from = None
        account.deactivate_to = None
        account.updated_by = request.user
        account.save(update_fields=["is_active", "deactivate_from", "deactivate_to", "updated_by"])
        
        after_image = self._account_to_dict(account)
        
        # Log the activation event with before/after images
        try:
            EventLog.objects.create(
                action="ACCOUNT_ACTIVATED",
                actor=request.user,
                record_type="ChartOfAccounts",
                record_id=account.id,
                before_image=before_image,
                after_image=after_image,
                details=f"Account {account.account_number} - {account.account_name} activated"
            )
        except Exception:
            logger.warning("Failed to log account activation event", exc_info=True)
        
        serializer = self.get_serializer(account)
        return Response(serializer.data)
    
    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """Deactivate an account with optional date range."""
        account = self.get_object()
        before_image = self._account_to_dict(account)
        
        # Check if account can be deactivated (zero balance)
        if account.balance != 0:
            return Response(
                {"error": "Cannot deactivate an account with a non-zero balance."},
                status=400
            )
        
        # Get deactivation dates from request
        deactivate_from = request.data.get("deactivate_from")
        deactivate_to = request.data.get("deactivate_to")
        
        if deactivate_from:
            account.deactivate_from = parse_date(deactivate_from)
        if deactivate_to:
            account.deactivate_to = parse_date(deactivate_to)
        
        # If indefinite (no dates provided), just set is_active to False
        if not deactivate_from and not deactivate_to:
            account.is_active = False
        else:
            # Set is_active based on current date
            today = timezone.localdate()
            if account.deactivate_from and account.deactivate_to:
                account.is_active = not (account.deactivate_from <= today <= account.deactivate_to)
            elif account.deactivate_from:
                account.is_active = not (account.deactivate_from <= today)
            elif account.deactivate_to:
                account.is_active = not (today <= account.deactivate_to)
        
        account.updated_by = request.user
        account.save(update_fields=["is_active", "deactivate_from", "deactivate_to", "updated_by"])
        
        after_image = self._account_to_dict(account)
        
        # Log the deactivation event with before/after images
        try:
            EventLog.objects.create(
                action="ACCOUNT_DEACTIVATED",
                actor=request.user,
                record_type="ChartOfAccounts",
                record_id=account.id,
                before_image=before_image,
                after_image=after_image,
                details=f"Account {account.account_number} - {account.account_name} deactivated"
            )
        except Exception:
            logger.warning("Failed to log account deactivation event", exc_info=True)
        
        serializer = self.get_serializer(account)
        return Response(serializer.data)
