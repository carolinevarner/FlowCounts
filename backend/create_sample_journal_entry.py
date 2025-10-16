#!/usr/bin/env python
"""
Create a sample journal entry for testing
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from datetime import date
from django.contrib.auth import get_user_model
from accounts.models import JournalEntry, JournalEntryLine, ChartOfAccounts

User = get_user_model()

print("Creating sample journal entry...")
print("-" * 50)

# Get a user to create the entry
user = User.objects.filter(is_active=True).first()
if not user:
    print("❌ No active users found!")
    exit(1)

print(f"✓ Using user: {user.username}")

# Get some accounts
cash_account = ChartOfAccounts.objects.filter(account_name__icontains='cash').first()
revenue_account = ChartOfAccounts.objects.filter(account_category='REVENUE').first()

if not cash_account or not revenue_account:
    print("❌ Required accounts not found!")
    print("Available accounts:")
    for acc in ChartOfAccounts.objects.all()[:5]:
        print(f"  - {acc.account_number}: {acc.account_name} ({acc.account_category})")
    exit(1)

print(f"✓ Debit account: {cash_account.account_number} - {cash_account.account_name}")
print(f"✓ Credit account: {revenue_account.account_number} - {revenue_account.account_name}")

# Create journal entry
entry = JournalEntry.objects.create(
    entry_date=date.today(),
    description="Sample cash sale transaction",
    status='APPROVED',  # Auto-approve for testing
    created_by=user,
    reviewed_by=user
)

# Create lines
JournalEntryLine.objects.create(
    journal_entry=entry,
    account=cash_account,
    description="Cash received from sale",
    debit=500.00,
    credit=0.00,
    order=0
)

JournalEntryLine.objects.create(
    journal_entry=entry,
    account=revenue_account,
    description="Revenue from sale",
    debit=0.00,
    credit=500.00,
    order=1
)

# Update account balances
if cash_account.normal_side == 'DEBIT':
    cash_account.debit += 500.00
    cash_account.balance += 500.00
else:
    cash_account.credit += 500.00
    cash_account.balance -= 500.00

if revenue_account.normal_side == 'CREDIT':
    revenue_account.credit += 500.00
    revenue_account.balance += 500.00
else:
    revenue_account.debit += 500.00
    revenue_account.balance -= 500.00

cash_account.save()
revenue_account.save()

print("-" * 50)
print("✅ Sample journal entry created successfully!")
print(f"   Entry ID: JE-{entry.id}")
print(f"   Date: {entry.entry_date}")
print(f"   Status: {entry.status}")
print(f"   Total: $500.00")
print("-" * 50)
print("\nYou can now:")
print("1. Go to Journal page to see the entry")
print("2. Go to Ledger for Cash or Revenue accounts to see transactions")
print("3. Create more entries from the UI")






