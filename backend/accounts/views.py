from django.utils import timezone
from django.utils.dateparse import parse_date
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

from .models import RegistrationRequest, EventLog
from .serializers import (
    UserSerializer,
    UserLiteSerializer,
    RegistrationRequestSerializer,
    CreateUserSerializer,
    EventLogSerializer,
)
from .permissions import IsAdmin 

logger = logging.getLogger(__name__)
User = get_user_model()

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
            else:
                reason = "password_mismatch"
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
            return Response({"detail": "Invalid credentials", "_reason": reason, "_mapped": mapped}, status=400)
        if not user.is_active:
            return Response({"detail": "User is inactive/suspended"}, status=403)
        
        if is_suspended_now(user):
            until = user.suspend_to or user.suspend_from
            return Response({"detail": f"User is suspended until {until}."}, status=403)

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
        return super().update(request, *args, **kwargs)

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
        # Log event
        try:
            EventLog.objects.create(
                action="USER_CREATED",
                actor=request.user if request.user.is_authenticated else None,
                target_user=User.objects.filter(username=serializer.data.get("username")).first(),
                details=f"Created user {serializer.data.get('username')} ({serializer.data.get('email','')})",
            )
        except Exception:
            logger.warning("Failed to log USER_CREATED event", exc_info=True)
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
            user.suspend_from = None
            user.suspend_to = None
            user.is_active = True
            user.save(update_fields=["suspend_from", "suspend_to", "is_active"])
            return Response(UserSerializer(user).data)
        
        start = parse_date(start_raw) if start_raw else None
        end = parse_date(end_raw) if end_raw else None

        if (start_raw and not start) or (end_raw and not end):
            return Response(
                {"detail": "Provide suspend_from and suspend_to as YYYY-MM-DD."},
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
        EventLog.objects.create(
            action="USER_SUSPENDED", actor=request.user, target_user=user,
            details=f"suspend_from={user.suspend_from}, suspend_to={user.suspend_to}, is_active={user.is_active}"
        )
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


class EventLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = EventLog.objects.all().order_by("-created_at")
    serializer_class = EventLogSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        data = serializer.data

        admins = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
        if admins:
            try:
                sent = send_mail(
                    "FlowCounts: New Registration Request",
                    (
                        "A new registration request was submitted.\n\n"
                        f"Name: {data.get('first_name','')} {data.get('last_name','')}\n"
                        f"Email: {data.get('email','')}\n"
                        f"DOB: {data.get('dob','')}\n"
                        f"Address: {data.get('address','')}\n\n"
                        "Please review it on the Admin → Users page."
                    ),
                    settings.DEFAULT_FROM_EMAIL,
                    admins,
                    fail_silently=False,
                )
                logger.info("Sent admin registration email to %s (sent=%s)", admins, sent)
            except Exception as e:
                logger.error("Admin notify email failed: %s", e, exc_info=True)

        return Response(serializer.data, status=status.HTTP_201_CREATED,
                        headers=self.get_success_headers(serializer.data))

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdmin])
    def approve(self, request, pk=None):
        req = self.get_object()

        alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"
        temp = ''.join(secrets.choice(alphabet) for _ in range(12))

        with transaction.atomic():
            req.approved = True
            req.reviewed_by = request.user
            req.save(update_fields=["approved", "reviewed_by"])

            username = build_username(req.first_name, req.last_name, when=timezone.now())
            user = User.objects.create_user(
                username=username,
                first_name=req.first_name,
                last_name=req.last_name,
                email=req.email,
                role="ACCOUNTANT",  
                address=req.address,
                dob=req.dob,
                is_active=True,
            )
            user.set_password(temp)
            user.save()

            subject = "FlowCounts Access Approved"
            body = (
                f"Hello {req.first_name},\n\n"
                "Your access request to FlowCounts has been approved.\n\n"
                f"Username: {user.username}\n"
                f"Temporary password: {temp}\n"
                "Login: http://localhost:5173/login\n\n"
                "Please change your password after logging in."
            )
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [req.email], fail_silently=False)

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


@api_view(["GET"])
def me(request):
    return Response(UserSerializer(request.user).data)
