from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
import logging
from django.core.mail import send_mail
from django.conf import settings
from .serializers import UserSerializer, CreateUserSerializer, RegistrationRequestSerializer
from .permissions import IsAdmin
from .models import RegistrationRequest

logger = logging.getLogger(__name__)
User = get_user_model()

# --- JWT with attempts remaining + lockout messaging ---
class FlowTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        # login id may be display_handle / username / email
        username = attrs.get("username")
        pwd = attrs.get("password")
        # Let backend handle authentication via AUTHENTICATION_BACKENDS
        data = super().validate(attrs)

        # At this point login succeeded; include who + picture + attempts info
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
    serializer_class = FlowTokenSerializer

    def post(self, request, *args, **kwargs):
        username = request.data.get("username", "")
        password = request.data.get("password", "")

        # Find the user record for pre-checks (suspension / expiry / counter)
        user = (User.objects.filter(username=username).first()
                or User.objects.filter(display_handle=username).first()
                or User.objects.filter(email=username).first())

        # If we found a user, apply suspension/expiry pre-checks first
        if user:
            if not user.is_active or user.is_currently_suspended():
                return Response({"detail": "Account suspended. Please contact admin."},
                                status=status.HTTP_403_FORBIDDEN)
            if user.password_expires_at and user.password_expires_at < timezone.now():
                return Response({"detail": "Password expired. Please reset your password."},
                                status=status.HTTP_403_FORBIDDEN)

        # Authenticate using our MultiField backend (email/display_handle/db username)
        authed = authenticate(request, username=username, password=password)

        if not authed:
            # Increment exactly ONCE here
            if user:
                max_tries = getattr(settings, "MAX_FAILED_LOGINS", 3)
                user.failed_attempts = (user.failed_attempts or 0) + 1
                # Lock if exceeded
                if user.failed_attempts >= max_tries:
                    user.is_active = False
                user.save(update_fields=["failed_attempts", "is_active"])

                attempts_left = max(0, max_tries - (user.failed_attempts or 0))
                locked = not user.is_active
            else:
                attempts_left = None
                locked = False

            return Response(
                {"detail": "Invalid credentials.", "attempts_left": attempts_left, "locked": locked},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Success: reset attempts
        if authed.failed_attempts:
            authed.failed_attempts = 0
            authed.save(update_fields=["failed_attempts"])

        # Issue JWT via parent (this sets tokens and user payload through serializer)
        request._full_data = request.data  # ensure serializer sees credentials
        return super().post(request, *args, **kwargs)


# --- Admin user management ---
class UserAdminViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        return CreateUserSerializer if self.action == "create" else UserSerializer

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.suspend_from = None
        user.suspend_to = None
        user.save(update_fields=["is_active","suspend_from","suspend_to"])
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        user = self.get_object()
        user.suspend_from = request.data.get("suspend_from")
        user.suspend_to = request.data.get("suspend_to")
        user.save(update_fields=["suspend_from","suspend_to"])
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=["get"])
    def report(self, request):
        return Response(UserSerializer(self.get_queryset(), many=True).data)

    @action(detail=False, methods=["get"])
    def expired_passwords(self, request):
        qs = User.objects.filter(password_expires_at__lt=timezone.now())
        return Response(UserSerializer(qs, many=True).data)

# --- Registration requests (create by anyone, review by admin) ---
class RegistrationRequestViewSet(viewsets.ModelViewSet):
    queryset = RegistrationRequest.objects.all().order_by("-created_at")
    permission_classes = [IsAuthenticated]
    serializer_class = RegistrationRequestSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        # Explicit create so we can guarantee email with fail_silently=False
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        data = serializer.data

        admins = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
        if admins:
            subject = "FlowCounts: New Registration Request"
            msg = (
                "A new registration request was submitted.\n\n"
                f"Name: {data.get('first_name','')} {data.get('last_name','')}\n"
                f"Email: {data.get('email','')}\n"
                f"DOB: {data.get('dob','')}\n"
                f"Address: {data.get('address','')}\n\n"
                "Approve or reject this request in your admin panel/API."
            )
            sent = send_mail(subject, msg, settings.DEFAULT_FROM_EMAIL, admins, fail_silently=False)
            logger.info("Sent admin registration email to %s (sent=%s)", admins, sent)
        else:
            logger.warning("No ADMIN_NOTIFICATION_EMAILS configured; admin email not sent.")

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdmin])
    def approve(self, request, pk=None):
        req = self.get_object()
        req.approved = True
        req.reviewed_by = request.user
        req.save(update_fields=["approved","reviewed_by"])

        temp = User.objects.make_random_password()
        user = User.objects.create_user(
            first_name=req.first_name, last_name=req.last_name,
            email=req.email, display_handle="", username="", role="ACCOUNTANT",
            address=req.address, dob=req.dob, is_active=True
        )
        user.set_password(temp); user.save()

        subject = "Your FlowCounts access was approved"
        body = (
            f"Username: {user.username}\n"
            f"Temporary password: {temp}\n"
            f"Login: http://localhost:5173/login\n"
        )
        sent = send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [req.email], fail_silently=False)
        logger.info("Sent approval email to %s (sent=%s)", req.email, sent)

        return Response({"detail": "Approved and user created", "user_id": user.id})


    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdmin])
    def reject(self, request, pk=None):
        req = self.get_object()
        req.approved = False
        req.reviewed_by = request.user
        req.review_note = request.data.get("note","")
        req.save(update_fields=["approved","reviewed_by","review_note"])
        return Response({"detail":"Request rejected"})

# --- Simple 'me' endpoint for header (picture + handle) ---
@api_view(["GET"])
def me(request):
    return Response(UserSerializer(request.user).data)
