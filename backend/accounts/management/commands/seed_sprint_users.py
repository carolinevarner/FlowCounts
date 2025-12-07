from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from accounts.models import SecurityQuestion, Role
from django.contrib.auth.hashers import make_password
import random

User = get_user_model()

SEC_QS = [
    "What is your favorite color?",
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your high school mascot?",
    "What is your mother’s maiden name?",
    "What was the make of your first car?",
]

def add_questions(u: User):
    qs = random.sample(SEC_QS, 3)
    for q in qs:
        SecurityQuestion.objects.create(user=u, question=q, answer_hash=make_password("answer"))

class Command(BaseCommand):
    help = "Seed sprint users"

    def handle(self, *args, **opts):
        users = [
            dict(display_handle="adminUser", email="varner4262@gmail.com", pwd="Skyrush2013.",
                 first="Caroline", last="Varner", role=Role.ADMIN, address="1107 Oaks Court", dob="2002-04-26"),
            dict(display_handle="managerUser", email="brendenhorne03@gmail.com", pwd="Brenden2025!",
                 first="Brenden", last="Horne", role=Role.MANAGER, address="5 Night Heron Way", dob="2003-02-25"),
            dict(display_handle="accountantUser", email="alidabdoub0@gmail.com", pwd="AliDabdoub2025!",
                 first="Ali", last="Dabdoub", role=Role.ACCOUNTANT, address="3061 Barrett Creek Rd", dob="2003-01-31"),
            # Suspension test users (bad attempts)
            dict(display_handle="testLock1", email="testlock1@example.com", pwd="Aa!test123",
                 first="Test", last="Lockone", role=Role.ACCOUNTANT, address="1 Test Way", dob="2000-01-01"),
            dict(display_handle="testLock2", email="testlock2@example.com", pwd="Aa!test123",
                 first="Test", last="Locktwo", role=Role.MANAGER, address="2 Test Way", dob="2000-02-02"),
        ]

        created = 0
        updated = 0
        skipped = 0
        for u in users:
            # Try to find user by email first, then by display_handle
            user = User.objects.filter(email=u["email"]).first()
            if not user:
                user = User.objects.filter(display_handle=u["display_handle"]).first()
            
            if user:
                # Check if display_handle is already taken by a different user
                existing_with_handle = User.objects.filter(display_handle=u["display_handle"]).exclude(id=user.id).first()
                if existing_with_handle:
                    # Display handle is taken by another user - skip updating it
                    self.stdout.write(
                        self.style.WARNING(
                            f"Skipping display_handle update for {user.email}: '{u['display_handle']}' already taken by {existing_with_handle.email}"
                        )
                    )
                    # Update other fields but not display_handle
                    update_fields = ['first_name', 'last_name', 'role', 'address', 'dob', 'is_active']
                else:
                    # Display handle is available or belongs to this user - safe to update
                    user.display_handle = u["display_handle"]
                    update_fields = ['display_handle', 'first_name', 'last_name', 'role', 'address', 'dob', 'is_active']
                
                # Update user fields
                user.first_name = u["first"]
                user.last_name = u["last"]
                user.role = u["role"]
                user.address = u["address"]
                user.dob = u["dob"]
                user.is_active = True
                user.set_password(u["pwd"])
                user.save(update_fields=update_fields)
                
                # Add security questions if they don't exist
                if not SecurityQuestion.objects.filter(user=user).exists():
                    add_questions(user)
                updated += 1
                self.stdout.write(self.style.SUCCESS(f"Updated {user.email} (display_handle: {user.display_handle}, username: {user.username})"))
            else:
                # Check if display_handle is already taken before creating
                if User.objects.filter(display_handle=u["display_handle"]).exists():
                    self.stdout.write(
                        self.style.WARNING(
                            f"Skipping creation of {u['email']}: display_handle '{u['display_handle']}' already exists"
                        )
                    )
                    skipped += 1
                    continue
                
                # Create new user
                user = User.objects.create(
                    display_handle=u["display_handle"],
                    first_name=u["first"], last_name=u["last"], email=u["email"],
                    role=u["role"], address=u["address"], dob=u["dob"], is_active=True,
                    username="",  # let signal generate f+lastname+mmyy
                )
                user.set_password(u["pwd"])
                user.save()
                add_questions(user)
                created += 1
                self.stdout.write(self.style.SUCCESS(f"Created {u['display_handle']} (db username -> {user.username})"))

        self.stdout.write(self.style.SUCCESS(f"Done. New users: {created}, Updated users: {updated}, Skipped: {skipped}"))

        self.stdout.write(self.style.SUCCESS(f"Done. New users: {created}, Updated users: {updated}"))
