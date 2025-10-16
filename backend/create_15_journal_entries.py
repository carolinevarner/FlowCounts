#!/usr/bin/env python
"""Create 15 sample journal entries with various transactions"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from datetime import date, timedelta
from django.contrib.auth import get_user_model
from accounts.models import JournalEntry, JournalEntryLine, ChartOfAccounts
from decimal import Decimal

User = get_user_model()

print("Creating 15 sample journal entries...")
print("=" * 70)

# Get users
manager = User.objects.filter(role='MANAGER', is_active=True).first()
accountant = User.objects.filter(role='ACCOUNTANT', is_active=True).first()

if not manager:
    manager = User.objects.filter(is_active=True).first()
if not accountant:
    accountant = manager

print(f"✓ Manager: {manager.username}")
print(f"✓ Accountant: {accountant.username}\n")

# Get accounts
accounts = {
    'cash': ChartOfAccounts.objects.filter(account_name__icontains='cash').first(),
    'ar': ChartOfAccounts.objects.filter(account_name__icontains='receivable').first(),
    'inventory': ChartOfAccounts.objects.filter(account_name__icontains='inventory').first(),
    'equipment': ChartOfAccounts.objects.filter(account_name__icontains='equipment').first(),
    'ap': ChartOfAccounts.objects.filter(account_name__icontains='payable').first(),
    'revenue': ChartOfAccounts.objects.filter(account_category='REVENUE').first(),
    'expense': ChartOfAccounts.objects.filter(account_category='EXPENSE').first(),
    'capital': ChartOfAccounts.objects.filter(account_name__icontains='capital').first(),
}

print("Accounts being used:")
for key, acc in accounts.items():
    if acc:
        print(f"  {key:12} - {acc.account_number}: {acc.account_name}")
print()

# Journal entries data
entries_data = [
    {
        'date': date.today() - timedelta(days=30),
        'description': 'Cash sale of goods',
        'lines': [
            ('cash', 'Cash received from sale', 1000.00, 0.00),
            ('revenue', 'Revenue from cash sale', 0.00, 1000.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=28),
        'description': 'Purchase inventory on credit',
        'lines': [
            ('inventory', 'Inventory purchased', 1500.00, 0.00),
            ('ap', 'Accounts payable for inventory', 0.00, 1500.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=26),
        'description': 'Sale on account',
        'lines': [
            ('ar', 'Accounts receivable', 2000.00, 0.00),
            ('revenue', 'Revenue from credit sale', 0.00, 2000.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=24),
        'description': 'Payment of expenses',
        'lines': [
            ('expense', 'Operating expenses paid', 500.00, 0.00),
            ('cash', 'Cash paid for expenses', 0.00, 500.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=22),
        'description': 'Collection from customer',
        'lines': [
            ('cash', 'Cash collected', 1200.00, 0.00),
            ('ar', 'Accounts receivable payment', 0.00, 1200.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=20),
        'description': 'Payment to supplier',
        'lines': [
            ('ap', 'Accounts payable payment', 1000.00, 0.00),
            ('cash', 'Cash paid to supplier', 0.00, 1000.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=18),
        'description': 'Purchase equipment',
        'lines': [
            ('equipment', 'Equipment purchased', 5000.00, 0.00),
            ('cash', 'Cash paid for equipment', 0.00, 5000.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=16),
        'description': 'Cash sale',
        'lines': [
            ('cash', 'Cash received', 750.00, 0.00),
            ('revenue', 'Revenue from sale', 0.00, 750.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=14),
        'description': 'Additional capital investment',
        'lines': [
            ('cash', 'Cash received from owner', 10000.00, 0.00),
            ('capital', 'Owner capital contribution', 0.00, 10000.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=12),
        'description': 'Operating expenses',
        'lines': [
            ('expense', 'Utilities and rent', 1200.00, 0.00),
            ('cash', 'Cash paid', 0.00, 1200.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=10),
        'description': 'Credit sale',
        'lines': [
            ('ar', 'Accounts receivable', 1500.00, 0.00),
            ('revenue', 'Revenue from sale', 0.00, 1500.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=8),
        'description': 'Inventory purchase',
        'lines': [
            ('inventory', 'Merchandise purchased', 2000.00, 0.00),
            ('ap', 'Accounts payable', 0.00, 2000.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=6),
        'description': 'Collection from customers',
        'lines': [
            ('cash', 'Cash received', 1800.00, 0.00),
            ('ar', 'Accounts receivable collected', 0.00, 1800.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=4),
        'description': 'Payment to vendor',
        'lines': [
            ('ap', 'Accounts payable payment', 1500.00, 0.00),
            ('cash', 'Cash paid', 0.00, 1500.00),
        ]
    },
    {
        'date': date.today() - timedelta(days=2),
        'description': 'Cash sale of goods',
        'lines': [
            ('cash', 'Cash received', 900.00, 0.00),
            ('revenue', 'Revenue from sale', 0.00, 900.00),
        ]
    },
]

created_count = 0
for i, entry_data in enumerate(entries_data, 1):
    try:
        # Create journal entry
        entry = JournalEntry.objects.create(
            entry_date=entry_data['date'],
            description=entry_data['description'],
            status='APPROVED',
            created_by=accountant,
            reviewed_by=manager
        )
        
        # Create lines
        for line_data in entry_data['lines']:
            account_key, desc, debit, credit = line_data
            account = accounts.get(account_key)
            
            if not account:
                print(f"⚠ Warning: Account '{account_key}' not found for entry {i}")
                continue
            
            JournalEntryLine.objects.create(
                journal_entry=entry,
                account=account,
                description=desc,
                debit=Decimal(str(debit)),
                credit=Decimal(str(credit)),
                order=len(entry.lines.all())
            )
            
            # Update account balances
            if debit > 0:
                account.debit += Decimal(str(debit))
                if account.normal_side == 'DEBIT':
                    account.balance += Decimal(str(debit))
                else:
                    account.balance -= Decimal(str(debit))
            
            if credit > 0:
                account.credit += Decimal(str(credit))
                if account.normal_side == 'CREDIT':
                    account.balance += Decimal(str(credit))
                else:
                    account.balance -= Decimal(str(credit))
            
            account.save()
        
        print(f"✅ Entry {i:2d}: JE-{entry.id:3d} | {entry.entry_date} | ${entry.total_debits():8.2f} | {entry_data['description'][:40]}")
        created_count += 1
        
    except Exception as e:
        print(f"❌ Entry {i:2d}: Failed - {str(e)}")

print("\n" + "=" * 70)
print(f"✅ Created {created_count} journal entries successfully!")
print("\nAccount balances updated:")
for key, acc in accounts.items():
    if acc:
        acc.refresh_from_db()
        print(f"  {acc.account_name:30} | Balance: ${acc.balance:10.2f}")
print("\nYou can now view these in the Journal and Ledger pages!")






