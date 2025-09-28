from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from django.core.mail import EmailMessage
from accounts.models import User
import csv
import io

class Command(BaseCommand):
    help = "Generate report (CSV) of users with expired passwords and email to ADMINS"

    def handle(self, *args, **options):
        now = timezone.now()
        expired = User.objects.filter(password_expires_at__lt=now)

        if not expired.exists():
            self.stdout.write("No expired passwords.")
            return

        f = io.StringIO()
        writer = csv.writer(f)
        writer.writerow(["id", "email", "display_handle", "role", "last_password_change", "password_expires_at"])
        for u in expired:
            writer.writerow([
                u.pk,
                u.email,
                getattr(u, "display_handle", ""),
                getattr(u, "role", ""),
                u.last_password_change.isoformat() if u.last_password_change else "",
                u.password_expires_at.isoformat() if u.password_expires_at else "",
            ])

        csv_content = f.getvalue()
        admins = getattr(settings, "ADMINS", [])

        if admins:
            to_emails = [a[1] for a in admins if len(a) >= 2]
            email = EmailMessage(
                "Expired Passwords Report",
                "Attached is the CSV report of expired passwords.",
                getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
                to_emails,
            )
            email.attach("expired_passwords.csv", csv_content, "text/csv")
            try:
                email.send(fail_silently=False)
                self.stdout.write("Sent expired passwords report to ADMINS.")
            except Exception as e:
                self.stderr.write(f"Failed to send email: {e}")
        else:
            self.stdout.write("ADMINS not configured; writing report to console:")
            self.stdout.write(csv_content)
