from datetime import timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import PasswordHistory

User = get_user_model()

def _gen_username(first_name: str, last_name: str, created: timezone.datetime):
    mm = f"{created.month:02d}"
    yy = f"{created.year % 100:02d}"
    base = f"{(first_name or '')[:1]}{(last_name or '')}".lower()
    return f"{base}{mm}{yy}"

@receiver(pre_save, sender=User)
def set_username_if_blank(sender, instance, **kwargs):
    if not instance.username:
        ts = timezone.localtime()
        instance.username = _gen_username(instance.first_name, instance.last_name, ts)

@receiver(post_save, sender=User)
def on_user_saved(sender, instance: User, created, **kwargs):
    if created:
        PasswordHistory.objects.create(user=instance, password=instance.password)
        max_age = getattr(settings, "PASSWORD_MAX_AGE_DAYS", 90)
        instance.password_expires_at = timezone.now() + timedelta(days=max_age)
        instance.last_password_change = timezone.now()
        instance.save(update_fields=["password_expires_at", "last_password_change"])
    else:
        latest = PasswordHistory.objects.filter(user=instance).first()
        if latest and latest.password != instance.password:
            PasswordHistory.objects.create(user=instance, password=instance.password)
            max_age = getattr(settings, "PASSWORD_MAX_AGE_DAYS", 90)
            User.objects.filter(pk=instance.pk).update(
                password_expires_at=timezone.now() + timedelta(days=max_age),
                last_password_change=timezone.now(),
                failed_attempts=0
            )

@receiver(user_logged_in)
def on_login_success(sender, user: User, request, **kwargs):
    if user.failed_attempts:
        user.failed_attempts = 0
        user.save(update_fields=["failed_attempts"])
