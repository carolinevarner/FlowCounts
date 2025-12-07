"""
Management command to create a superuser from environment variables.
Useful for deployment when shell access is not available.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates a superuser from environment variables (SUPERUSER_USERNAME, SUPERUSER_EMAIL, SUPERUSER_PASSWORD)'

    def handle(self, *args, **options):
        username = os.environ.get('SUPERUSER_USERNAME', 'admin')
        email = os.environ.get('SUPERUSER_EMAIL', 'admin@example.com')
        password = os.environ.get('SUPERUSER_PASSWORD')
        
        if not password:
            self.stdout.write(
                self.style.WARNING('SUPERUSER_PASSWORD environment variable not set. Skipping superuser creation.')
            )
            return
        
        # Check if user already exists by username or email
        existing_user = User.objects.filter(username=username).first()
        if not existing_user:
            existing_user = User.objects.filter(email=email).first()
        
        if existing_user:
            # Update existing user to be superuser
            existing_user.is_superuser = True
            existing_user.is_staff = True
            existing_user.set_password(password)
            try:
                existing_user.save(update_fields=['is_superuser', 'is_staff', 'password'])
                self.stdout.write(
                    self.style.SUCCESS(f'Updated existing user {existing_user.username} to superuser!')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Could not update user to superuser: {str(e)}. Continuing...')
                )
        else:
            try:
                # Create new superuser with a unique display_handle
                display_handle = f"admin_{username}"
                # Ensure display_handle is unique
                counter = 1
                while User.objects.filter(display_handle=display_handle).exists():
                    display_handle = f"admin_{username}_{counter}"
                    counter += 1
                
                user = User.objects.create_superuser(
                    username=username, 
                    email=email, 
                    password=password,
                    display_handle=display_handle
                )
                self.stdout.write(
                    self.style.SUCCESS(f'Superuser {username} created successfully!')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Could not create superuser: {str(e)}. This is okay if user already exists. Continuing...')
                )



