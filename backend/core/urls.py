from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

from accounts.views import (
    RegistrationRequestViewSet,
    UserAdminViewSet,
    FlowTokenView,
    me,
    upload_profile_photo,
    forgot_password,
    forgot_password_questions,
)

router = DefaultRouter()
router.register(r"auth/registration-requests", RegistrationRequestViewSet, basename="registration-requests")
router.register(r"auth/users", UserAdminViewSet, basename="auth-users")

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/auth/token/", FlowTokenView.as_view()),
    path("api/auth/me/", me),
    path("api/auth/me/photo/", upload_profile_photo, name="upload-profile-photo"),
    path("api/auth/forgot-password/", forgot_password),
    path("api/auth/forgot-password/questions/", forgot_password_questions),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
