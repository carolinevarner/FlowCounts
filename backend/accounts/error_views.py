"""
Views for error message management and error log viewing.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q

from .models import ErrorMessage, ErrorLog
from .serializers import ErrorMessageSerializer, ErrorLogSerializer
from .permissions import IsAdmin

User = get_user_model()


class ErrorMessageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing error messages."""
    queryset = ErrorMessage.objects.all()
    serializer_class = ErrorMessageSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        """Filter error messages based on query parameters."""
        queryset = ErrorMessage.objects.all()
        
        # Filter by error type
        error_type = self.request.query_params.get('error_type')
        if error_type:
            queryset = queryset.filter(error_type=error_type)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search by code or title
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search) | 
                Q(title__icontains=search) |
                Q(message__icontains=search)
            )
        
        return queryset.order_by('error_type', 'code')
    
    @action(detail=False, methods=['get'])
    def types(self, request):
        """Get all available error types."""
        types = [{'value': choice[0], 'label': choice[1]} 
                for choice in ErrorMessage.ERROR_TYPES]
        return Response(types)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle the active status of an error message."""
        error_message = self.get_object()
        error_message.is_active = not error_message.is_active
        error_message.save()
        
        return Response({
            'id': error_message.id,
            'is_active': error_message.is_active,
            'message': f'Error message {"activated" if error_message.is_active else "deactivated"}'
        })


class ErrorLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing error logs."""
    queryset = ErrorLog.objects.all()
    serializer_class = ErrorLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        """Filter error logs based on query parameters."""
        queryset = ErrorLog.objects.all()
        
        # Filter by level
        level = self.request.query_params.get('level')
        if level:
            queryset = queryset.filter(level=level)
        
        # Filter by resolved status
        resolved = self.request.query_params.get('resolved')
        if resolved is not None:
            queryset = queryset.filter(resolved=resolved.lower() == 'true')
        
        # Filter by error code
        error_code = self.request.query_params.get('error_code')
        if error_code:
            queryset = queryset.filter(error_code__icontains=error_code)
        
        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # Search in error message or technical details
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(error_message__icontains=search) |
                Q(technical_details__icontains=search) |
                Q(error_code__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark an error log as resolved."""
        error_log = self.get_object()
        error_log.resolve(resolved_by_user=request.user)
        
        return Response({
            'id': error_log.id,
            'resolved': True,
            'resolved_at': error_log.resolved_at,
            'resolved_by': request.user.username,
            'message': 'Error marked as resolved'
        })
    
    @action(detail=False, methods=['post'])
    def resolve_multiple(self, request):
        """Mark multiple error logs as resolved."""
        error_ids = request.data.get('error_ids', [])
        if not error_ids:
            return Response({'error': 'No error IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        resolved_count = 0
        for error_id in error_ids:
            try:
                error_log = ErrorLog.objects.get(id=error_id)
                error_log.resolve(resolved_by_user=request.user)
                resolved_count += 1
            except ErrorLog.DoesNotExist:
                continue
        
        return Response({
            'resolved_count': resolved_count,
            'total_requested': len(error_ids),
            'message': f'Resolved {resolved_count} out of {len(error_ids)} errors'
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get error log statistics."""
        queryset = self.get_queryset()
        
        # Total errors
        total_errors = queryset.count()
        
        # Errors by level
        errors_by_level = {}
        for level, _ in ErrorLog.ERROR_LEVELS:
            count = queryset.filter(level=level).count()
            if count > 0:
                errors_by_level[level] = count
        
        # Errors by resolution status
        resolved_count = queryset.filter(resolved=True).count()
        unresolved_count = total_errors - resolved_count
        
        # Recent errors (last 24 hours)
        yesterday = timezone.now() - timezone.timedelta(days=1)
        recent_errors = queryset.filter(created_at__gte=yesterday).count()
        
        # Top error codes
        from django.db.models import Count
        top_error_codes = queryset.values('error_code').annotate(
            count=Count('error_code')
        ).order_by('-count')[:10]
        
        return Response({
            'total_errors': total_errors,
            'errors_by_level': errors_by_level,
            'resolved_count': resolved_count,
            'unresolved_count': unresolved_count,
            'recent_errors_24h': recent_errors,
            'top_error_codes': list(top_error_codes)
        })
