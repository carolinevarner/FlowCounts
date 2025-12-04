from django.urls import path, re_path, include
from django.contrib import admin
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.cache import never_cache
from django.views.generic import TemplateView

# Import your views
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
    JournalEntryViewSet,
    send_email_to_user,
    get_managers_and_admins,
    close_account,
    trial_balance,
    income_statement,
    balance_sheet,
    retained_earnings,
)
from accounts.error_views import ErrorMessageViewSet, ErrorLogViewSet
from core.views import index 

router = DefaultRouter()
router.register(r"auth/registration-requests", RegistrationRequestViewSet, basename="registration-requests")
router.register(r"auth/users", UserAdminViewSet, basename="auth-users")
router.register(r"auth/events", EventLogViewSet, basename="auth-events")
router.register(r"auth/error-messages", ErrorMessageViewSet, basename="error-messages")
router.register(r"auth/error-logs", ErrorLogViewSet, basename="error-logs")
router.register(r"chart-of-accounts", ChartOfAccountsViewSet, basename="chart-of-accounts")
router.register(r"journal-entries", JournalEntryViewSet, basename="journal-entries")

urlpatterns = [
    path("admin/", admin.site.urls),  # Django admin
    path("api/", include(router.urls)),
    path("api/auth/token/", FlowTokenView.as_view()),
    path("api/auth/me/", me),
    path("api/auth/me/photo/", upload_profile_photo, name="upload-profile-photo"),
    path("api/auth/change-password/", change_password, name="change-password"),
    path("api/auth/get-username/", get_username_by_email, name="get-username"),
    path("api/auth/forgot-password/", forgot_password, name="forgot-password"),
    path("api/auth/send-email/", send_email_to_user, name="send-email"),
    path("api/auth/managers-admins/", get_managers_and_admins, name="get-managers-admins"),
    path("api/accounts/close/", close_account, name="close-account"),
    path("api/financial/trial-balance/", trial_balance, name="trial-balance"),
    path("api/financial/income-statement/", income_statement, name="income-statement"),
    path("api/financial/balance-sheet/", balance_sheet, name="balance-sheet"),
    path("api/financial/retained-earnings/", retained_earnings, name="retained-earnings"),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Catch-all for frontend routes - MUST be last!
# Exclude api/, media/, admin/, static/ from catch-all
# Only serve frontend in development (when template exists)
if settings.DEBUG:
    urlpatterns += [
        re_path(r'^(?!api/|media/|admin/|static/).*$', never_cache(TemplateView.as_view(template_name='index.html'))),
    ]
else:
    # In production, return simple response for root path
    from django.http import JsonResponse
    def root_view(request):
        return JsonResponse({"message": "FlowCounts API", "docs": "/api/"})
    urlpatterns += [
        path("", root_view),
    ]
