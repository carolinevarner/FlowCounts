"""
Fix duplicate users by merging or removing duplicates.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Count

User = get_user_model()


class Command(BaseCommand):
    help = 'Fix duplicate users (same email) by keeping the first and removing others'

    def handle(self, *args, **options):
        self.stdout.write(f'[FIX_DUPLICATE_USERS] Finding duplicate users...')
        
        # Find users with duplicate emails
        duplicates = User.objects.values('email').annotate(
            count=Count('email')
        ).filter(count__gt=1)
        
        fixed_count = 0
        for dup in duplicates:
            email = dup['email']
            users = User.objects.filter(email=email).order_by('id')
            
            if users.count() > 1:
                # Keep the first user (oldest ID)
                keep_user = users.first()
                delete_users = users[1:]
                
                self.stdout.write(
                    f'[FIX_DUPLICATE_USERS] Found {users.count()} users with email {email}'
                )
                self.stdout.write(
                    f'[FIX_DUPLICATE_USERS] Keeping: {keep_user.username} (ID: {keep_user.id})'
                )
                
                # Delete duplicates
                for user in delete_users:
                    self.stdout.write(
                        f'[FIX_DUPLICATE_USERS] Deleting duplicate: {user.username} (ID: {user.id})'
                    )
                    user.delete()
                    fixed_count += 1
        
        if fixed_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'[FIX_DUPLICATE_USERS] ✅ Fixed {fixed_count} duplicate users'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('[FIX_DUPLICATE_USERS] ✅ No duplicate users found')
            )

