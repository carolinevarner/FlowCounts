from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers
from .models import RegistrationRequest, User, EventLog, ErrorMessage, ErrorLog, ChartOfAccounts
import re

User = get_user_model()


class UserLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "is_active",
            "date_joined",
        ]



class UserSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()
    suspended_now = serializers.SerializerMethodField()

    class Meta:
        model = User  
        fields = (
            "id", "username", "email", "first_name", "last_name", "role",
            "is_active", "profile_image_url", "suspended_now",
        )

    def get_profile_image_url(self, obj):
        if not obj.profile_image:
            return None
        # Return relative URL so Vite proxy can handle it on any computer
        return obj.profile_image.url

    def get_suspended_now(self, obj):
        # Check if user is inactive due to failed login attempts
        if not obj.is_active and not obj.suspend_from and not obj.suspend_to:
            return True
            
        # Check date-based suspension
        today = timezone.localdate()
        start = obj.suspend_from
        end = obj.suspend_to
        if start and end:
            return start <= today <= end
        if start and not end:
            return start <= today
        if end and not start:
            return today <= end
        return False



class RegistrationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationRequest
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "address",
            "dob",
            "approved",
            "assigned_role",
            "created_at",
            "security_question_1",
            "security_answer_1",
            "security_question_2",
            "security_answer_2",
            "security_question_3",
            "security_answer_3",
        ]
    read_only_fields = ["approved", "created_at"]

    def validate_email(self, value):
        value = (value or "").strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        if RegistrationRequest.objects.filter(
            email__iexact=value, approved__isnull=True
        ).exists():
            raise serializers.ValidationError("A pending request already exists for this email.")
        return value


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    username = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = [
            "username",
            "display_handle",
            "first_name",
            "last_name",
            "email",
            "role",
            "password",
            "picture",
            "address",
            "dob",
            "is_active",
            "suspend_from",
            "suspend_to",
        ]
    
    def validate_email(self, value):
        """Ensure email is unique across all users"""
        value = (value or "").strip().lower()
        # Check if updating existing user
        if self.instance:
            # Allow same email if it's the current user's email
            if User.objects.filter(email__iexact=value).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("A user with this email already exists.")
        else:
            # Creating new user - check for any existing user with this email
            if User.objects.filter(email__iexact=value).exists():
                raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        pwd = validated_data.pop("password")
        if "is_active" not in validated_data:
            validated_data["is_active"] = True
        
        # Validate password using Django validators
        from django.core.exceptions import ValidationError
        from django.contrib.auth.password_validation import validate_password
        
        user = User(**validated_data)
        try:
            validate_password(pwd, user)
        except ValidationError as e:
            raise serializers.ValidationError({"password": e.messages})
        
        user.set_password(pwd)
        user.save()
        return user


class EventLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.SerializerMethodField()
    target_username = serializers.SerializerMethodField()

    class Meta:
        model = EventLog
        fields = [
            "id",
            "action",
            "actor",
            "actor_username",
            "target_user",
            "target_username",
            "details",
            "before_image",
            "after_image",
            "record_type",
            "record_id",
            "created_at",
        ]

    def get_actor_username(self, obj):
        return getattr(obj.actor, "username", None)

    def get_target_username(self, obj):
        return getattr(obj.target_user, "username", None)


class ErrorMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ErrorMessage
        fields = [
            'id',
            'code',
            'error_type',
            'title',
            'message',
            'technical_details',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class ErrorLogSerializer(serializers.ModelSerializer):
    user_username = serializers.SerializerMethodField()
    resolved_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = ErrorLog
        fields = [
            'id',
            'error_code',
            'level',
            'user',
            'user_username',
            'request_path',
            'request_method',
            'user_agent',
            'ip_address',
            'error_message',
            'technical_details',
            'stack_trace',
            'resolved',
            'resolved_at',
            'resolved_by',
            'resolved_by_username',
            'created_at',
        ]
        read_only_fields = ['created_at', 'resolved_at']
    
    def get_user_username(self, obj):
        return getattr(obj.user, "username", None) if obj.user else None
    
    def get_resolved_by_username(self, obj):
        return getattr(obj.resolved_by, "username", None) if obj.resolved_by else None


class ChartOfAccountsSerializer(serializers.ModelSerializer):
    created_by_username = serializers.SerializerMethodField()
    updated_by_username = serializers.SerializerMethodField()
    can_deactivate = serializers.SerializerMethodField()
    
    class Meta:
        model = ChartOfAccounts
        fields = [
            'id',
            'account_name',
            'account_number',
            'account_description',
            'normal_side',
            'account_category',
            'account_subcategory',
            'initial_balance',
            'debit',
            'credit',
            'balance',
            'order',
            'statement',
            'comment',
            'created_at',
            'created_by',
            'created_by_username',
            'updated_at',
            'updated_by',
            'updated_by_username',
            'is_active',
            'deactivate_from',
            'deactivate_to',
            'can_deactivate',
        ]
        read_only_fields = ['created_at', 'created_by', 'updated_at', 'updated_by', 'can_deactivate']
    
    def _get_display_username(self, user):
        if not user:
            return None
        
        role_base = {
            'ADMIN': 'adminUser',
            'MANAGER': 'managerUser',
            'ACCOUNTANT': 'accountantUser',
        }
        
        base = role_base.get(user.role, 'user')
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        count = User.objects.filter(role=user.role, id__lte=user.id).count()
        
        return f"{base}{count}"
    
    def get_created_by_username(self, obj):
        return self._get_display_username(obj.created_by)
    
    def get_updated_by_username(self, obj):
        return self._get_display_username(obj.updated_by)
    
    def get_can_deactivate(self, obj):
        return obj.can_deactivate()
    
    def validate_account_number(self, value):
        if not value:
            raise serializers.ValidationError("Account number is required.")
        
        if not re.match(r'^\d+$', value):
            raise serializers.ValidationError(
                "Account number must be numeric only (no decimals or alphanumeric characters)."
            )
        
        return value
    
    def validate_account_name(self, value):
        if self.instance:
            if ChartOfAccounts.objects.filter(account_name__iexact=value).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("An account with this name already exists.")
        else:
            if ChartOfAccounts.objects.filter(account_name__iexact=value).exists():
                raise serializers.ValidationError("An account with this name already exists.")
        return value
    
    def validate(self, data):
        account_number = data.get('account_number')
        if account_number:
            query = ChartOfAccounts.objects.filter(account_number=account_number)
            if self.instance:
                query = query.exclude(id=self.instance.id)
            if query.exists():
                raise serializers.ValidationError({
                    'account_number': 'An account with this number already exists.'
                })
        
        if self.instance and 'is_active' in data:
            if not data['is_active'] and self.instance.balance != 0:
                raise serializers.ValidationError({
                    'is_active': 'Cannot deactivate an account with a non-zero balance.'
                })
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['updated_by'] = request.user
        return super().update(instance, validated_data)
