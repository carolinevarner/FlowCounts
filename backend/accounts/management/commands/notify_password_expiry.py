from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from accounts.models import User
from django.core.mail import send_mail
from datetime import timedelta


class Command(BaseCommand):
    help = "Notify users whose passwords are about to expire"

    def handle(self, *args, **options):
        now = timezone.now()
        warning_days = getattr(settings, "PASSWORD_EXPIRY_WARNING_DAYS", 3)

        expiring_users = User.objects.filter(
            password_expires_at__lte=now + timedelta(days=warning_days),
            password_expires_at__gte=now
        )

        for user in expiring_users:
            days_remaining = (user.password_expires_at - now).days
            self.stdout.write(f"Notifying {user.email} ({days_remaining} days left)")

            send_mail(
                "Password Expiry Warning",
                f"Hello {user.username}, your password will expire in {days_remaining} days. "
                "Please change it soon.",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )

        self.stdout.write(self.style.SUCCESS("Password expiry notifications sent."))
