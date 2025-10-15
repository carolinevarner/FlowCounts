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

from rest_framework import viewsets, mixins, status, serializers
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

from .models import RegistrationRequest, EventLog, PasswordHistory, ChartOfAccounts, JournalEntry, JournalEntryLine, JournalEntryAttachment
from .error_utils import log_error, DatabaseErrorResponse, get_error_message
from .serializers import (
    UserSerializer,
    UserLiteSerializer,
    RegistrationRequestSerializer,
    CreateUserSerializer,
    EventLogSerializer,
    ChartOfAccountsSerializer,
    JournalEntrySerializer,
    JournalEntryAttachmentSerializer,
)
from .permissions import IsAdmin, IsManagerOrAdmin
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
                    before_state = {
                        'id': user_obj.id,
                        'username': user_obj.username,
                        'email': user_obj.email,
                        'first_name': user_obj.first_name,
                        'last_name': user_obj.last_name,
                        'is_active': user_obj.is_active,
                        'failed_attempts': user_obj.failed_attempts,
                    }
                    
                    user_obj.is_active = False
                    user_obj.save(update_fields=["is_active"])
                    
                    after_state = {
                        'id': user_obj.id,
                        'username': user_obj.username,
                        'email': user_obj.email,
                        'first_name': user_obj.first_name,
                        'last_name': user_obj.last_name,
                        'is_active': user_obj.is_active,
                        'failed_attempts': user_obj.failed_attempts,
                    }
                    
                    EventLog.objects.create(
                        action="USER_SUSPENDED",
                        actor=None,
                        target_user=user_obj,
                        details=f"User suspended due to {max_attempts} failed login attempts",
                        before_image=before_state,
                        after_image=after_state,
                        record_type='User',
                        record_id=user_obj.id
                    )
                    
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
            return DatabaseErrorResponse.create_response('USER_INACTIVE_SUSPENDED', status_code=403)
        
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
    
    def _user_to_dict(self, user):
        return {
            'id': user.id,
            'username': user.username,
            'display_handle': user.display_handle,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'is_active': user.is_active,
            'address': user.address,
            'dob': user.dob.isoformat() if user.dob else None,
            'suspend_from': user.suspend_from.isoformat() if user.suspend_from else None,
            'suspend_to': user.suspend_to.isoformat() if user.suspend_to else None,
            'date_joined': user.date_joined.isoformat() if user.date_joined else None,
        }
    
    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        
        user = self.get_object()
        before_image = self._user_to_dict(user)
        
        response = super().update(request, *args, **kwargs)
        
        updated_user = User.objects.get(id=user.id)
        after_image = self._user_to_dict(updated_user)
        try:
            changes = []
            if before_image['role'] != after_image['role']:
                changes.append(f"role changed from {before_image['role']} to {after_image['role']}")
            if before_image['first_name'] != after_image['first_name']:
                changes.append(f"first name changed from '{before_image['first_name']}' to '{after_image['first_name']}'")
            if before_image['last_name'] != after_image['last_name']:
                changes.append(f"last name changed from '{before_image['last_name']}' to '{after_image['last_name']}'")
            if before_image['email'] != after_image['email']:
                changes.append(f"email changed from '{before_image['email']}' to '{after_image['email']}'")
            if before_image['is_active'] != after_image['is_active']:
                status = "activated" if after_image['is_active'] else "deactivated"
                changes.append(f"user {status}")
            
            if changes:
                details = f"User updated: {', '.join(changes)}"
                EventLog.objects.create(
                    action="USER_UPDATED",
                    actor=request.user,
                    target_user=updated_user,
                    details=details,
                    before_image=before_image,
                    after_image=after_image,
                    record_type='User',
                    record_id=updated_user.id
                )
                
                if before_image['role'] != after_image['role']:
                    try:
                        if updated_user.email:
                            send_mail(
                                "FlowCounts Role Updated",
                                f"Hello {updated_user.first_name or updated_user.username},\n\n"
                                f"Your role in FlowCounts has been updated by an administrator.\n\n"
                                f"Previous Role: {before_image['role']}\n"
                                f"New Role: {after_image['role']}\n\n"
                                f"Your permissions have been updated accordingly.\n\n"
                                "FlowCounts Team",
                                settings.DEFAULT_FROM_EMAIL,
                                [updated_user.email],
                                fail_silently=False,
                            )
                    except Exception as e:
                        logger.error(f"Failed to send role change email: {e}")
                    
                    try:
                        admin_emails = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
                        if admin_emails and request.user.email not in admin_emails:
                            send_mail(
                                "FlowCounts: User Role Changed",
                                f"A user's role has been changed.\n\n"
                                f"User: {updated_user.username} ({updated_user.email})\n"
                                f"Name: {updated_user.first_name} {updated_user.last_name}\n"
                                f"Previous Role: {before_image['role']}\n"
                                f"New Role: {after_image['role']}\n"
                                f"Changed by: {request.user.username}\n\n",
                                settings.DEFAULT_FROM_EMAIL,
                                admin_emails,
                                fail_silently=False,
                            )
                    except Exception as e:
                        logger.error(f"Failed to send admin notification: {e}")
        except Exception:
            logger.warning("Failed to log USER_UPDATED event", exc_info=True)
        
        return response

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if not data.get("username"):
            data["username"] = build_username(
                data.get("first_name", ""),
                data.get("last_name", ""),
            )
        
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
        
        created_user = User.objects.filter(username=serializer.data.get("username")).first()
        
        if created_user:
            set_password_expiration(created_user, is_temporary=True)
            save_password_to_history(created_user, created_user.password)
            created_user.save()
        try:
            EventLog.objects.create(
                action="USER_CREATED",
                actor=request.user if request.user.is_authenticated else None,
                target_user=created_user,
                details=f"Created user {serializer.data.get('username')} ({serializer.data.get('email','')})",
                after_image=self._user_to_dict(created_user) if created_user else None,
                record_type='User',
                record_id=created_user.id if created_user else None
            )
        except Exception:
            logger.warning("Failed to log USER_CREATED event", exc_info=True)
        try:
            if created_user and created_user.email:
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
        before_image = self._user_to_dict(user)
        user.is_active = True
        user.suspend_from = None
        user.suspend_to = None
        user.failed_attempts = 0
        user.save(update_fields=["is_active", "suspend_from", "suspend_to", "failed_attempts"])
        after_image = self._user_to_dict(user)
        EventLog.objects.create(
            action="USER_ACTIVATED", 
            actor=request.user, 
            target_user=user, 
            details="User activated",
            before_image=before_image,
            after_image=after_image,
            record_type='User',
            record_id=user.id
        )
        
        try:
            if user.email:
                send_mail(
                    "FlowCounts Account Activated",
                    f"Hello {user.first_name or user.username},\n\n"
                    f"Your FlowCounts account has been activated by an administrator.\n\n"
                    f"You can now log in to the system.\n\n"
                    "FlowCounts Team",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
        except Exception as e:
            logger.error(f"Failed to send activation email: {e}")
        
        try:
            admin_emails = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
            if admin_emails:
                send_mail(
                    "FlowCounts: User Activated",
                    f"A user account has been activated.\n\n"
                    f"User: {user.username} ({user.email})\n"
                    f"Name: {user.first_name} {user.last_name}\n"
                    f"Role: {user.role}\n"
                    f"Activated by: {request.user.username}\n\n"
                    "The user can now access the system.",
                    settings.DEFAULT_FROM_EMAIL,
                    admin_emails,
                    fail_silently=False,
                )
        except Exception as e:
            logger.error(f"Failed to send admin notification: {e}")
        
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        before_image = self._user_to_dict(user)
        user.is_active = False
        user.save(update_fields=["is_active"])
        after_image = self._user_to_dict(user)
        EventLog.objects.create(
            action="USER_DEACTIVATED", 
            actor=request.user, 
            target_user=user, 
            details="User deactivated",
            before_image=before_image,
            after_image=after_image,
            record_type='User',
            record_id=user.id
        )
        
        try:
            if user.email:
                send_mail(
                    "FlowCounts Account Deactivated",
                    f"Hello {user.first_name or user.username},\n\n"
                    f"Your FlowCounts account has been deactivated by an administrator.\n\n"
                    f"You will not be able to access the system until your account is reactivated.\n\n"
                    f"If you have questions, please contact your administrator.\n\n"
                    "FlowCounts Team",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
        except Exception as e:
            logger.error(f"Failed to send deactivation email: {e}")
        
        try:
            admin_emails = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
            if admin_emails:
                send_mail(
                    "FlowCounts: User Deactivated",
                    f"A user account has been deactivated.\n\n"
                    f"User: {user.username} ({user.email})\n"
                    f"Name: {user.first_name} {user.last_name}\n"
                    f"Role: {user.role}\n"
                    f"Deactivated by: {request.user.username}\n\n"
                    "The user can no longer access the system.",
                    settings.DEFAULT_FROM_EMAIL,
                    admin_emails,
                    fail_silently=False,
                )
        except Exception as e:
            logger.error(f"Failed to send admin notification: {e}")
        
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        user = self.get_object()
        before_image = self._user_to_dict(user)

        start_raw = (request.data.get("suspend_from") or "").strip()
        end_raw   = (request.data.get("suspend_to") or "").strip()

        if not start_raw or not end_raw:
            user.suspend_from = None
            user.suspend_to = None
            user.is_active = True
            user.failed_attempts = 0
            user.save(update_fields=["suspend_from", "suspend_to", "is_active", "failed_attempts"])
            after_image = self._user_to_dict(user)

            EventLog.objects.create(
                action="USER_UNSUSPENDED", 
                actor=request.user, 
                target_user=user,
                details="User unsuspended",
                before_image=before_image,
                after_image=after_image,
                record_type='User',
                record_id=user.id
            )
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
        after_image = self._user_to_dict(user)
        
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
            action="USER_SUSPENDED", 
            actor=request.user, 
            target_user=user,
            details=details,
            before_image=before_image,
            after_image=after_image,
            record_type='User',
            record_id=user.id
        )
        
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
    
    def _user_to_dict(self, user):
        return {
            'id': user.id,
            'username': user.username,
            'display_handle': user.display_handle,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'is_active': user.is_active,
            'address': user.address,
            'dob': user.dob.isoformat() if user.dob else None,
            'suspend_from': user.suspend_from.isoformat() if user.suspend_from else None,
            'suspend_to': user.suspend_to.isoformat() if user.suspend_to else None,
            'date_joined': user.date_joined.isoformat() if user.date_joined else None,
        }

    def create(self, request, *args, **kwargs):
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
                action="REQUEST_APPROVED", 
                actor=request.user, 
                target_user=user,
                details=f"Approved registration for {req.email}; created username={user.username}",
                after_image=self._user_to_dict(user),
                record_type='User',
                record_id=user.id
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

        try:
            EventLog.objects.create(
                action="REQUEST_REJECTED",
                actor=request.user,
                target_user=None,
                details=f"Rejected registration for {req.email}" + (f": {note}" if note else ""),
                record_type='RegistrationRequest',
                record_id=req.id
            )
        except Exception:
            logger.warning("Failed to log REQUEST_REJECTED event", exc_info=True)

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
    
    try:
        if user.email:
            send_mail(
                "FlowCounts Password Reset Successful",
                f"Hello {user.first_name or user.username},\n\n"
                f"Your FlowCounts password has been successfully reset.\n\n"
                f"If you did not make this change, please contact your administrator immediately.\n\n"
                "FlowCounts Team",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
    except Exception as e:
        logger.error(f"Failed to send password reset confirmation email: {e}")
    
    try:
        admin_emails = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
        if admin_emails:
            send_mail(
                "FlowCounts: Password Reset Alert",
                f"A user has reset their password via security questions.\n\n"
                f"User: {user.username} ({user.email})\n"
                f"Name: {user.first_name} {user.last_name}\n"
                f"Reset Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                "If this was not authorized, please take appropriate action.",
                settings.DEFAULT_FROM_EMAIL,
                admin_emails,
                fail_silently=False,
            )
    except Exception as e:
        logger.error(f"Failed to send admin notification: {e}")
    
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
    """
    ViewSet for Chart of Accounts management.
    Provides CRUD operations with event logging for all changes.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = ChartOfAccounts.objects.all().order_by('order', 'account_number')
    serializer_class = ChartOfAccountsSerializer
    
    def get_permissions(self):
        """
        Admin and Manager can create, update, delete accounts.
        Accountants can only view accounts.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'activate', 'deactivate']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]
    
    def _account_to_dict(self, account):
        """Convert account instance to dictionary for event logging."""
        return {
            'id': account.id,
            'account_name': account.account_name,
            'account_number': account.account_number,
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
            'deactivate_from': account.deactivate_from.isoformat() if account.deactivate_from else None,
            'deactivate_to': account.deactivate_to.isoformat() if account.deactivate_to else None,
            'created_at': account.created_at.isoformat() if account.created_at else None,
            'created_by': account.created_by.username if account.created_by else None,
        }
    
    def perform_create(self, serializer):
        """Create account and log the event with after_image."""
        account = serializer.save()
        
        try:
            EventLog.objects.create(
                action='ACCOUNT_CREATED',
                actor=self.request.user,
                details=f"Created account {account.account_number} - {account.account_name}",
                after_image=self._account_to_dict(account),
                record_type='Account',
                record_id=account.id
            )
        except Exception:
            logger.warning("Failed to log ACCOUNT_CREATED event", exc_info=True)
    
    def perform_update(self, serializer):
        """Update account and log the event with before/after images."""
        account = self.get_object()
        before_image = self._account_to_dict(account)
        
        updated_account = serializer.save()
        after_image = self._account_to_dict(updated_account)
        
        try:
            EventLog.objects.create(
                action='ACCOUNT_UPDATED',
                actor=self.request.user,
                details=f"Updated account {updated_account.account_number} - {updated_account.account_name}",
                before_image=before_image,
                after_image=after_image,
                record_type='Account',
                record_id=updated_account.id
            )
        except Exception:
            logger.warning("Failed to log ACCOUNT_UPDATED event", exc_info=True)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate an account and log the event."""
        account = self.get_object()
        before_image = self._account_to_dict(account)
        
        account.is_active = True
        account.deactivate_from = None
        account.deactivate_to = None
        account.save(update_fields=['is_active', 'deactivate_from', 'deactivate_to'])
        
        after_image = self._account_to_dict(account)
        
        try:
            EventLog.objects.create(
                action='ACCOUNT_ACTIVATED',
                actor=request.user,
                details=f"Activated account {account.account_number} - {account.account_name}",
                before_image=before_image,
                after_image=after_image,
                record_type='Account',
                record_id=account.id
            )
        except Exception:
            logger.warning("Failed to log ACCOUNT_ACTIVATED event", exc_info=True)
        
        return Response(ChartOfAccountsSerializer(account, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """
        Deactivate an account. Only allows deactivation if balance is zero.
        Logs the event with before/after images.
        """
        account = self.get_object()
        
        # Check if account can be deactivated
        if account.balance != 0:
            return Response(
                {"detail": "Accounts with balance greater than zero cannot be deactivated"},
                status=400
            )
        
        before_image = self._account_to_dict(account)
        
        # Get optional date range from request
        deactivate_from = request.data.get('deactivate_from')
        deactivate_to = request.data.get('deactivate_to')
        
        if deactivate_from:
            account.deactivate_from = parse_date(deactivate_from) if isinstance(deactivate_from, str) else deactivate_from
        if deactivate_to:
            account.deactivate_to = parse_date(deactivate_to) if isinstance(deactivate_to, str) else deactivate_to
        
        account.is_active = False
        account.save(update_fields=['is_active', 'deactivate_from', 'deactivate_to'])
        
        after_image = self._account_to_dict(account)
        
        try:
            EventLog.objects.create(
                action='ACCOUNT_DEACTIVATED',
                actor=request.user,
                details=f"Deactivated account {account.account_number} - {account.account_name}",
                before_image=before_image,
                after_image=after_image,
                record_type='Account',
                record_id=account.id
            )
        except Exception:
            logger.warning("Failed to log ACCOUNT_DEACTIVATED event", exc_info=True)
        
        return Response(ChartOfAccountsSerializer(account, context={'request': request}).data)
    
    @action(detail=True, methods=['get'])
    def ledger_entries(self, request, pk=None):
        """
        Get journal entry lines for this account to display in ledger.
        """
        account = self.get_object()
        
        # Get all journal entry lines for this account from approved entries
        lines = JournalEntryLine.objects.filter(
            account=account,
            journal_entry__status='APPROVED'
        ).select_related('journal_entry', 'journal_entry__created_by').order_by('journal_entry__entry_date', 'journal_entry__created_at')
        
        # Format the data for ledger display
        ledger_data = []
        for line in lines:
            ledger_data.append({
                'id': line.id,
                'date': line.journal_entry.entry_date.isoformat(),
                'reference': str(line.journal_entry.id),
                'journal_entry_id': line.journal_entry.id,
                'description': line.description or line.journal_entry.description,
                'debit': float(line.debit),
                'credit': float(line.credit),
                'created_by': line.journal_entry.created_by.username if line.journal_entry.created_by else None
            })
        
        return Response(ledger_data)


class JournalEntryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Journal Entry management with approval workflow.
    Managers and Accountants can create entries.
    Only Managers can approve/reject entries.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = JournalEntry.objects.all().select_related('created_by', 'reviewed_by').prefetch_related('lines__account', 'attachments')
    serializer_class = JournalEntrySerializer
    
    def get_permissions(self):
        """Managers and Accountants can create/update. Only Managers and Admins can approve/reject."""
        if self.action in ['approve', 'reject']:
            return [IsAuthenticated(), IsManagerOrAdmin()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Filter based on user role and query parameters."""
        qs = super().get_queryset()
        user = self.request.user
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(entry_date__gte=start_date)
        if end_date:
            qs = qs.filter(entry_date__lte=end_date)
        
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(lines__account__account_name__icontains=search) |
                Q(lines__debit=search) |
                Q(lines__credit=search) |
                Q(description__icontains=search)
            ).distinct()
        
        return qs
    
    def _journal_entry_to_dict(self, entry):
        """Convert journal entry to dictionary for event logging."""
        return {
            'id': entry.id,
            'entry_date': entry.entry_date.isoformat(),
            'description': entry.description,
            'status': entry.status,
            'created_by': entry.created_by.username if entry.created_by else None,
            'lines': [
                f"{line.account.account_number} - {line.account.account_name}: ${line.debit} Dr / ${line.credit} Cr"
                for line in entry.lines.all()
            ],
            'total_debits': f"${entry.total_debits()}",
            'total_credits': f"${entry.total_credits()}",
        }
    
    def perform_create(self, serializer):
        """Create journal entry and log the event."""
        entry = serializer.save()
        
        try:
            EventLog.objects.create(
                action='JOURNAL_ENTRY_CREATED',
                actor=self.request.user,
                details=f"Created journal entry {entry.id} for {entry.entry_date}",
                after_image=self._journal_entry_to_dict(entry),
                record_type='JournalEntry',
                record_id=entry.id
            )
        except Exception:
            logger.warning("Failed to log JOURNAL_ENTRY_CREATED event", exc_info=True)
        
        if entry.status == 'PENDING':
            try:
                manager_emails = list(User.objects.filter(role='MANAGER', is_active=True).values_list('email', flat=True))
                
                if manager_emails:
                    send_mail(
                        "FlowCounts: New Journal Entry Submitted for Approval",
                        f"A new journal entry has been submitted and requires your approval.\n\n"
                        f"Entry ID: JE-{entry.id}\n"
                        f"Date: {entry.entry_date}\n"
                        f"Description: {entry.description or 'N/A'}\n"
                        f"Created by: {entry.created_by.username if entry.created_by else 'Unknown'}\n"
                        f"Total Debits: ${entry.total_debits():.2f}\n"
                        f"Total Credits: ${entry.total_credits():.2f}\n"
                        f"Status: PENDING APPROVAL\n\n"
                        "Please log in to review and approve or reject this entry.\n\n"
                        "FlowCounts Team",
                        settings.DEFAULT_FROM_EMAIL,
                        manager_emails,
                        fail_silently=False,
                    )
            except Exception as e:
                logger.error(f"Failed to send journal entry notification: {e}")
    
    def perform_update(self, serializer):
        from .error_utils import get_error_message
        entry = self.get_object()
        
        if entry.status != 'PENDING':
            error_msg = get_error_message('JOURNAL_EDIT_NOT_PENDING')
            raise serializers.ValidationError(error_msg['message'])
        
        before_image = self._journal_entry_to_dict(entry)
        updated_entry = serializer.save()
        after_image = self._journal_entry_to_dict(updated_entry)
        
        try:
            EventLog.objects.create(
                action='JOURNAL_ENTRY_UPDATED',
                actor=self.request.user,
                details=f"Updated journal entry {updated_entry.id}",
                before_image=before_image,
                after_image=after_image,
                record_type='JournalEntry',
                record_id=updated_entry.id
            )
        except Exception:
            logger.warning("Failed to log JOURNAL_ENTRY_UPDATED event", exc_info=True)
    
    def perform_destroy(self, instance):
        from .error_utils import get_error_message
        if instance.status != 'PENDING':
            error_msg = get_error_message('JOURNAL_EDIT_NOT_PENDING')
            raise serializers.ValidationError(error_msg['message'])
        super().perform_destroy(instance)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve a journal entry. Only managers can approve.
        Updates account balances when approved.
        """
        entry = self.get_object()
        
        if entry.status != 'PENDING':
            return Response(
                {"detail": "Only pending entries can be approved."},
                status=400
            )
        
        before_image = self._journal_entry_to_dict(entry)
        
        entry.status = 'APPROVED'
        entry.reviewed_by = request.user
        entry.reviewed_at = timezone.now()
        entry.save()
        
        with transaction.atomic():
            for line in entry.lines.all():
                account = line.account
                
                if line.debit > 0:
                    account.debit += line.debit
                    if account.normal_side == 'DEBIT':
                        account.balance += line.debit
                    else:
                        account.balance -= line.debit
                
                if line.credit > 0:
                    account.credit += line.credit
                    if account.normal_side == 'CREDIT':
                        account.balance += line.credit
                    else:
                        account.balance -= line.credit
                
                account.save()
        
        after_image = self._journal_entry_to_dict(entry)
        
        try:
            EventLog.objects.create(
                action='JOURNAL_ENTRY_APPROVED',
                actor=request.user,
                details=f"Approved journal entry {entry.id}",
                before_image=before_image,
                after_image=after_image,
                record_type='JournalEntry',
                record_id=entry.id
            )
        except Exception:
            logger.warning("Failed to log JOURNAL_ENTRY_APPROVED event", exc_info=True)
        
        try:
            if entry.created_by and entry.created_by.email:
                send_mail(
                    "FlowCounts: Journal Entry Approved",
                    f"Your journal entry (JE-{entry.id}) for {entry.entry_date} has been approved by {request.user.username}.\n\n"
                    f"Total Debits: ${entry.total_debits():.2f}\n"
                    f"Total Credits: ${entry.total_credits():.2f}\n\n"
                    "FlowCounts Team",
                    settings.DEFAULT_FROM_EMAIL,
                    [entry.created_by.email],
                    fail_silently=True,
                )
        except Exception as e:
            logger.error(f"Failed to send approval email: {e}")
        
        return Response(JournalEntrySerializer(entry, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject a journal entry. Only managers can reject.
        Requires a rejection reason.
        """
        entry = self.get_object()
        
        if entry.status != 'PENDING':
            return Response(
                {"detail": "Only pending entries can be rejected."},
                status=400
            )
        
        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response(
                {"detail": "Rejection reason is required."},
                status=400
            )
        
        before_image = self._journal_entry_to_dict(entry)
        
        entry.status = 'REJECTED'
        entry.reviewed_by = request.user
        entry.reviewed_at = timezone.now()
        entry.rejection_reason = rejection_reason
        entry.save()
        
        after_image = self._journal_entry_to_dict(entry)
        
        try:
            EventLog.objects.create(
                action='JOURNAL_ENTRY_REJECTED',
                actor=request.user,
                details=f"Rejected journal entry {entry.id}: {rejection_reason}",
                before_image=before_image,
                after_image=after_image,
                record_type='JournalEntry',
                record_id=entry.id
            )
        except Exception:
            logger.warning("Failed to log JOURNAL_ENTRY_REJECTED event", exc_info=True)
        
        try:
            if entry.created_by and entry.created_by.email:
                send_mail(
                    "FlowCounts: Journal Entry Rejected",
                    f"Your journal entry (JE-{entry.id}) for {entry.entry_date} has been rejected by {request.user.username}.\n\n"
                    f"Reason: {rejection_reason}\n\n"
                    f"Please review and resubmit if necessary.\n\n"
                    "FlowCounts Team",
                    settings.DEFAULT_FROM_EMAIL,
                    [entry.created_by.email],
                    fail_silently=True,
                )
        except Exception as e:
            logger.error(f"Failed to send rejection email: {e}")
        
        return Response(JournalEntrySerializer(entry, context={'request': request}).data)
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_attachment(self, request, pk=None):
        """Upload an attachment to a journal entry."""
        entry = self.get_object()
        
        if entry.status != 'PENDING':
            return Response(
                {"detail": "Cannot add attachments to approved or rejected entries."},
                status=400
            )
        
        file = request.FILES.get('file')
        if not file:
            return Response({"detail": "No file provided."}, status=400)
        
        allowed_extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png']
        file_ext = file.name[file.name.rfind('.'):].lower() if '.' in file.name else ''
        
        if file_ext not in allowed_extensions:
            return Response(
                {"detail": f"File type {file_ext} not allowed. Allowed types: {', '.join(allowed_extensions)}"},
                status=400
            )
        
        attachment = JournalEntryAttachment.objects.create(
            journal_entry=entry,
            file=file,
            file_name=file.name,
            file_size=file.size,
            uploaded_by=request.user
        )
        
        return Response(JournalEntryAttachmentSerializer(attachment).data, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_email_to_user(request):
    """Send an email from one user to another (manager, admin, or accountant)."""
    recipient = request.data.get('recipient', '').strip()
    subject = request.data.get('subject', '').strip()
    message_body = request.data.get('message', '').strip()
    recipient_type = request.data.get('recipient_type', 'manager').lower()
    
    logger.info(f"Email request from {request.user.username}: recipient={recipient}, subject={subject}")
    
    if not recipient or not subject or not message_body:
        logger.warning(f"Missing required fields: recipient={recipient}, subject={subject}, message={bool(message_body)}")
        return Response(
            {"detail": "Recipient, subject, and message are required."},
            status=400
        )
    
    sender = request.user
    
    try:
        full_subject = f"FlowCounts: {subject}"
        full_message = (
            f"From: {sender.first_name} {sender.last_name} ({sender.username})\n"
            f"Email: {sender.email}\n"
            f"Role: {sender.role}\n\n"
            f"Message:\n{message_body}\n\n"
            f"---\n"
            f"This email was sent through the FlowCounts application."
        )
        
        logger.info(f"Attempting to send email from {sender.email} to {recipient}")
        
        result = send_mail(
            full_subject,
            full_message,
            settings.DEFAULT_FROM_EMAIL,
            [recipient],
            fail_silently=False,
        )
        
        logger.info(f"Email sent successfully from {sender.email} to {recipient}, result: {result}")
        return Response({"detail": "Email sent successfully"})
        
    except Exception as e:
        logger.error(f"Failed to send email from {sender.email} to {recipient}: {e}", exc_info=True)
        return Response(
            {"detail": f"Failed to send email: {str(e)}"},
            status=500
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_managers_and_admins(request):
    """Get list of managers, administrators, and accountants for email functionality."""
    try:
        # Get all managers, admins, and accountants
        managers = User.objects.filter(
            role__in=['MANAGER', 'ADMIN', 'ACCOUNTANT'], 
            is_active=True
        ).values('id', 'first_name', 'last_name', 'email', 'role', 'username')
        
        # Get admin emails from settings
        admin_emails = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
        
        # Format the response
        result = {
            'managers': list(managers),
            'admin_emails': admin_emails
        }
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Failed to get managers and admins: {e}", exc_info=True)
        return Response(
            {"detail": "Failed to retrieve managers, administrators, and accountants."},
            status=500
        )
