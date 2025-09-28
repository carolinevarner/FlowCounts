import csv
import io
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from django.core.mail import EmailMessage
from accounts.models import User


class Command(BaseCommand):
    help = "Generate and send a report of all expired passwords to administrators"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print the report to the console instead of emailing it",
        )

    def handle(self, *args, **options):
        now = timezone.now()
        expired_users = User.objects.filter(password_expires_at__lt=now)

        if not expired_users.exists():
            self.stdout.write("No expired passwords found.")
            return

        # Build CSV report in memory
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            ["id", "username", "email", "role", "last_password_change", "password_expires_at"]
        )
        for u in expired_users:
            writer.writerow([
                u.id,
                u.username,
                u.email,
                u.role,
                u.last_password_change.isoformat() if u.last_password_change else "",
                u.password_expires_at.isoformat() if u.password_expires_at else "",
            ])
        csv_content = buffer.getvalue()
        buffer.close()

        if options["dry_run"]:
            self.stdout.write("---- EXPIRED PASSWORD REPORT ----")
            self.stdout.write(csv_content)
            return

        # Use ADMIN_NOTIFICATION_EMAILS from settings.py
        admin_emails = getattr(settings, "ADMIN_NOTIFICATION_EMAILS", [])
        if not admin_emails:
            self.stdout.write("No ADMIN_NOTIFICATION_EMAILS configured. Use --dry-run to test.")
            return

        subject = f"Expired Password Report ({expired_users.count()} users)"
        body = "Attached is the CSV report of users with expired passwords.\n\nThis was generated automatically."

        email = EmailMessage(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            admin_emails
        )
        email.attach("expired_passwords.csv", csv_content, "text/csv")

        try:
            email.send(fail_silently=False)
            self.stdout.write(self.style.SUCCESS(f"Expired password report sent to {', '.join(admin_emails)}"))
        except Exception as e:
            self.stderr.write(f"Failed to send email: {e}")
