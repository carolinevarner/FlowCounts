from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers
from .models import RegistrationRequest, User, EventLog, ErrorMessage, ErrorLog, ChartOfAccounts, JournalEntry, JournalEntryLine, JournalEntryAttachment
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
    display_handle = serializers.SerializerMethodField()

    class Meta:
        model = User  
        fields = (
            "id", "username", "email", "first_name", "last_name", "role",
            "is_active", "profile_image_url", "suspended_now", "display_handle",
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

    def get_display_handle(self, obj):
        # Generate numbered username based on role
        role_base = {
            'ADMIN': 'adminUser',
            'MANAGER': 'managerUser',
            'ACCOUNTANT': 'accountantUser',
        }
        
        base = role_base.get(obj.role, 'user')
        
        # Get all users with same role ordered by ID, and find this user's position
        users_with_same_role = User.objects.filter(role=obj.role).order_by('id')
        position = list(users_with_same_role.values_list('id', flat=True)).index(obj.id) + 1
        
        return f"{base}{position}"



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


class JournalEntryLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.account_name', read_only=True)
    account_number = serializers.CharField(source='account.account_number', read_only=True)
    
    class Meta:
        model = JournalEntryLine
        fields = [
            'id',
            'account',
            'account_name',
            'account_number',
            'description',
            'debit',
            'credit',
            'order',
        ]
    
    def validate(self, data):
        from .error_utils import get_error_message
        
        debit = data.get('debit', 0)
        credit = data.get('credit', 0)
        account = data.get('account')
        
        if not account:
            error_msg = get_error_message('JOURNAL_LINE_NO_ACCOUNT')
            raise serializers.ValidationError(error_msg['message'])
        
        if debit < 0 or credit < 0:
            error_msg = get_error_message('JOURNAL_LINE_NEGATIVE')
            raise serializers.ValidationError(error_msg['message'])
        
        if debit > 0 and credit > 0:
            error_msg = get_error_message('JOURNAL_LINE_BOTH_AMOUNTS')
            raise serializers.ValidationError(error_msg['message'])
        
        if debit == 0 and credit == 0:
            error_msg = get_error_message('JOURNAL_LINE_NO_AMOUNT')
            raise serializers.ValidationError(error_msg['message'])
        
        return data


class JournalEntryAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = JournalEntryAttachment
        fields = [
            'id',
            'file',
            'file_url',
            'file_name',
            'file_size',
            'uploaded_at',
            'uploaded_by',
            'uploaded_by_username',
        ]
        read_only_fields = ['uploaded_at', 'uploaded_by']
    
    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(many=True)
    attachments = JournalEntryAttachmentSerializer(many=True, read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)
    total_debits = serializers.SerializerMethodField()
    total_credits = serializers.SerializerMethodField()
    is_balanced = serializers.SerializerMethodField()
    
    class Meta:
        model = JournalEntry
        fields = [
            'id',
            'entry_date',
            'description',
            'status',
            'created_by',
            'created_by_username',
            'created_at',
            'reviewed_by',
            'reviewed_by_username',
            'reviewed_at',
            'rejection_reason',
            'lines',
            'attachments',
            'total_debits',
            'total_credits',
            'is_balanced',
        ]
        read_only_fields = ['created_by', 'created_at', 'reviewed_by', 'reviewed_at', 'status']
    
    def get_total_debits(self, obj):
        return float(obj.total_debits())
    
    def get_total_credits(self, obj):
        return float(obj.total_credits())
    
    def get_is_balanced(self, obj):
        return obj.is_balanced()
    
    def validate_lines(self, lines):
        from .error_utils import get_error_message
        
        if not lines or len(lines) == 0:
            error_msg = get_error_message('JOURNAL_NO_LINES')
            raise serializers.ValidationError(error_msg['message'])
        
        if len(lines) < 2:
            error_msg = get_error_message('JOURNAL_MIN_LINES')
            raise serializers.ValidationError(error_msg['message'])
        
        accounts_used = [line.get('account') for line in lines if line.get('account')]
        if not accounts_used:
            error_msg = get_error_message('JOURNAL_NO_ACCOUNT')
            raise serializers.ValidationError(error_msg['message'])
        
        has_debit = any(line.get('debit', 0) > 0 for line in lines)
        has_credit = any(line.get('credit', 0) > 0 for line in lines)
        
        if not has_debit:
            error_msg = get_error_message('JOURNAL_NO_DEBIT')
            raise serializers.ValidationError(error_msg['message'])
        if not has_credit:
            error_msg = get_error_message('JOURNAL_NO_CREDIT')
            raise serializers.ValidationError(error_msg['message'])
        
        total_debits = sum(line.get('debit', 0) for line in lines)
        total_credits = sum(line.get('credit', 0) for line in lines)
        
        if abs(total_debits - total_credits) > 0.01:
            error_msg = get_error_message('JOURNAL_OUT_OF_BALANCE')
            raise serializers.ValidationError({
                'lines': f"{error_msg['message']} Total debits: ${total_debits:.2f}, Total credits: ${total_credits:.2f}, Difference: ${abs(total_debits - total_credits):.2f}"
            })
        
        return lines
    
    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        request = self.context.get('request')
        
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
            
            if request.user.role in ['ADMIN', 'MANAGER']:
                validated_data['status'] = 'APPROVED'
                validated_data['reviewed_by'] = request.user
                validated_data['reviewed_at'] = timezone.now()
            else:
                validated_data['status'] = 'PENDING'
        
        journal_entry = JournalEntry.objects.create(**validated_data)
        
        for line_data in lines_data:
            JournalEntryLine.objects.create(journal_entry=journal_entry, **line_data)
        
        return journal_entry
    
    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                JournalEntryLine.objects.create(journal_entry=instance, **line_data)
        
        return instance
