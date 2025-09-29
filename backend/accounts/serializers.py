from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import RegistrationRequest

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "first_name", "last_name", "role",
            "is_active", "profile_image_url",
        )

    def get_profile_image_url(self, obj):
        if not getattr(obj, "profile_image", None):
            return None
        request = self.context.get("request")
        url = obj.profile_image.url
        if request is not None:
            return request.build_absolute_uri(url)
        # fallback for when request isn't available
        from django.conf import settings
        base = getattr(settings, "PUBLIC_ORIGIN", "http://127.0.0.1:8000")
        return f"{base}{url}"


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
        value = (value or "").strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        if RegistrationRequest.objects.filter(email__iexact=value, approved__isnull=True).exists():
            raise serializers.ValidationError("A pending request already exists for this email.")
        return value


class CreateUserSerializer(serializers.ModelSerializer):
    """Used by the admin Create User form."""
    password = serializers.CharField(write_only=True)
    username = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = [
            "username", "display_handle", "first_name", "last_name",
            "email", "role", "password", "picture", "address", "dob",
            "is_active", "suspend_from", "suspend_to",
        ]

    def create(self, validated_data):
        pwd = validated_data.pop("password")

        # Default to active unless explicitly false
        if "is_active" not in validated_data:
            validated_data["is_active"] = True

        user = User(**validated_data)
        user.set_password(pwd)
        user.save()
        return user
