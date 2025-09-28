import csv
from django.http import HttpResponse

def export_selected_users_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="users.csv"'
    writer = csv.writer(response)
    writer.writerow(["id", "email", "display_handle", "role", "last_password_change", "password_expires_at"])
    for u in queryset:
        writer.writerow([
            u.pk,
            u.email,
            getattr(u, "display_handle", ""),
            getattr(u, "role", ""),
            u.last_password_change,
            u.password_expires_at,
        ])
    return response

export_selected_users_csv.short_description = "Export selected users to CSV"

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    actions = [export_selected_users_csv]
