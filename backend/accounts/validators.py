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

class PreventPasswordReuseValidator:
    def validate(self, password, user=None):
        if not user or not getattr(user, "id", None):
            return
        history = user.password_history.all()[:5]  
        for ph in history:
            if check_password(password, ph.password):
                raise ValidationError(_("You cannot reuse a recent password."))
    def get_help_text(self):
        return _("You cannot reuse your recent passwords.")
