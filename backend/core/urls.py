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
    change_password,
    ChartOfAccountsViewSet,
)
from accounts.error_views import ErrorMessageViewSet, ErrorLogViewSet

router = DefaultRouter()
router.register(r"auth/registration-requests", RegistrationRequestViewSet, basename="registration-requests")
router.register(r"auth/users", UserAdminViewSet, basename="auth-users")
router.register(r"auth/events", EventLogViewSet, basename="auth-events")
router.register(r"auth/error-messages", ErrorMessageViewSet, basename="error-messages")
router.register(r"auth/error-logs", ErrorLogViewSet, basename="error-logs")
router.register(r"chart-of-accounts", ChartOfAccountsViewSet, basename="chart-of-accounts")

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/auth/token/", FlowTokenView.as_view()),
    path("api/auth/me/", me),
    path("api/auth/me/photo/", upload_profile_photo, name="upload-profile-photo"),
    path("api/auth/change-password/", change_password, name="change-password"),
    path("api/auth/get-username/", get_username_by_email, name="get-username"),
    path("api/auth/forgot-password/", forgot_password, name="forgot-password"),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Catch-all for frontend routes - MUST be last!
urlpatterns += [
    re_path(r'^(?!api/|media/).*$', never_cache(TemplateView.as_view(template_name='index.html'))),
]
