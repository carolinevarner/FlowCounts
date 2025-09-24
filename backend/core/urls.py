# backend/core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from accounts.views import (
    RegistrationRequestViewSet,
    UserAdminViewSet,
    FlowTokenView,  
    me,             
)

router = DefaultRouter()
router.register(r"auth/registration-requests", RegistrationRequestViewSet, basename="registration-requests")
router.register(r"auth/users", UserAdminViewSet, basename="auth-users")

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/auth/token/", FlowTokenView.as_view()),
    path("api/auth/me/", me),
]
