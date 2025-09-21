from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import RegistrationRequest

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id","username","display_handle","first_name","last_name","email","role",
            "is_active","suspend_from","suspend_to","picture",
            "address","dob","failed_attempts",
            "password_expires_at","last_password_change",
        ]
        read_only_fields = ["username","failed_attempts","password_expires_at","last_password_change"]

class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ["display_handle","first_name","last_name","email","role","password","picture","address","dob","is_active","suspend_from","suspend_to"]
    def create(self, data):
        pwd = data.pop("password")
        user = User(**data)
        user.set_password(pwd)
        user.save()
        return user

class RegistrationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationRequest
        fields = "__all__"
        read_only_fields = ["approved","reviewed_by","review_note","created_at"]
