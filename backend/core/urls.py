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
)

router = DefaultRouter()
router.register(r"auth/registration-requests", RegistrationRequestViewSet, basename="registration-requests")
router.register(r"auth/users", UserAdminViewSet, basename="auth-users")
router.register(r"auth/events", EventLogViewSet, basename="auth-events")

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/auth/token/", FlowTokenView.as_view()),
    path("api/auth/me/", me),
    path("api/auth/me/photo/", upload_profile_photo, name="upload-profile-photo"),
    path("api/auth/get-username/", get_username_by_email, name="get-username"),
    path("api/auth/forgot-password/", forgot_password, name="forgot-password"),
    re_path(r'^(?!api/).*$', never_cache(TemplateView.as_view(template_name='index.html'))),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
