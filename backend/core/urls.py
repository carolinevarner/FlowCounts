from django.urls import path, re_path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.decorators.cache import never_cache

from accounts.views import (
    RegistrationRequestViewSet,
    UserAdminViewSet,
    EventLogViewSet,
    FlowTokenView,
    me,
    upload_profile_photo,
    forgot_password,
    get_username_by_email,
    check_password_expiration,
    get_expired_passwords_report,
)
from accounts.error_views import ErrorMessageViewSet, ErrorLogViewSet

router = DefaultRouter()
router.register(r"auth/registration-requests", RegistrationRequestViewSet, basename="registration-requests")
router.register(r"auth/users", UserAdminViewSet, basename="auth-users")
router.register(r"auth/events", EventLogViewSet, basename="auth-events")
router.register(r"auth/error-messages", ErrorMessageViewSet, basename="error-messages")
router.register(r"auth/error-logs", ErrorLogViewSet, basename="error-logs")

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/auth/token/", FlowTokenView.as_view()),
    path("api/auth/me/", me),
    path("api/auth/me/photo/", upload_profile_photo, name="upload-profile-photo"),
    path("api/auth/get-username/", get_username_by_email, name="get-username"),
    path("api/auth/forgot-password/", forgot_password, name="forgot-password"),
    path("api/auth/check-password-expiration/", check_password_expiration, name="check-password-expiration"),
    path("api/auth/expired-passwords-report/", get_expired_passwords_report, name="expired-passwords-report"),
    re_path(r'^(?!api/).*$', never_cache(TemplateView.as_view(template_name='index.html'))),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
