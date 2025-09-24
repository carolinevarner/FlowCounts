from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import RegistrationRequest, User

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email",
            "first_name", "last_name",
            "role", "address", "dob",
            "is_active", "date_joined",
        ]

class UserLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name",
            "email", "role", "is_active", "date_joined",
        ]

class RegistrationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationRequest
        fields = ["id", "first_name", "last_name", "email", "address", "dob", "approved", "created_at"]
        read_only_fields = ["approved", "created_at"]

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        if RegistrationRequest.objects.filter(email__iexact=value, approved__isnull=True).exists():
            raise serializers.ValidationError("A pending request already exists for this email.")
        return value

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
