from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class MultiFieldModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        user = (User.objects.filter(username=username).first()
                or User.objects.filter(display_handle=username).first()
                or User.objects.filter(email=username).first())
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
