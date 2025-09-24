import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
from django.contrib.auth.hashers import check_password

class StartsWithLetterValidator:
    def validate(self, password, user=None):
        if not password or not password[0].isalpha():
            raise ValidationError(_("Password must start with a letter."))
    def get_help_text(self):
        return _("Your password must start with a letter.")

class ContainsLetterNumberSpecialValidator:
    def validate(self, password, user=None):
        if not re.search(r"[A-Za-z]", password):
            raise ValidationError(_("Password must contain at least one letter."))
        if not re.search(r"\d", password):
            raise ValidationError(_("Password must contain at least one number."))
        if not re.search(r"[^\w\s]", password):
            raise ValidationError(_("Password must contain at least one special character."))
    def get_help_text(self):
        return _("Include at least one letter, one number, and one special character.")

class PasswordNotInHistoryValidator:
    def __init__(self, last_n=5):
        self.last_n = last_n

    def validate(self, password, user=None):
        if not user or not user.pk:
            return
        recent = user.password_history.order_by("-created_at")[:self.last_n]
        for h in recent:
            if check_password(password, h.password):
                raise ValidationError("You cannot reuse a recent password.", code="password_in_history")

    def get_help_text(self):
        return "Your new password cannot match your recent passwords."
