"""
Management command to recalculate all account balances from approved journal entries.
This is necessary after importing data to ensure balances are correct.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from accounts.models import ChartOfAccounts, JournalEntry, JournalEntryLine
from decimal import Decimal


class Command(BaseCommand):
    help = 'Recalculate all account balances from approved journal entries (useful after data import)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be recalculated without actually updating',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        
        self.stdout.write(f'[RECALCULATE_BALANCES] Starting balance recalculation...')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('[RECALCULATE_BALANCES] DRY RUN MODE - No changes will be made'))
        
        # Reset all account balances to initial_balance
        accounts_updated = 0
        total_debits = Decimal('0.00')
        total_credits = Decimal('0.00')
        
        with transaction.atomic():
            for account in ChartOfAccounts.objects.all():
                # Start with initial balance
                account.balance = account.initial_balance
                account.debit = Decimal('0.00')
                account.credit = Decimal('0.00')
                
                # Get all approved journal entry lines for this account
                approved_lines = JournalEntryLine.objects.filter(
                    account=account,
                    journal_entry__status='APPROVED'
                ).select_related('journal_entry')
                
                # Recalculate balance from approved entries
                for line in approved_lines:
                    if line.debit > 0:
                        account.debit += line.debit
                        if account.normal_side == 'DEBIT':
                            account.balance += line.debit
                        else:
                            account.balance -= line.debit
                    
                    if line.credit > 0:
                        account.credit += line.credit
                        if account.normal_side == 'CREDIT':
                            account.balance += line.credit
                        else:
                            account.balance -= line.credit
                
                if not dry_run:
                    account.save(update_fields=['balance', 'debit', 'credit'])
                
                accounts_updated += 1
                total_debits += account.debit
                total_credits += account.credit
                
                self.stdout.write(
                    f'[RECALCULATE_BALANCES] Account {account.account_number} ({account.account_name}): '
                    f'Balance=${account.balance}, Debit=${account.debit}, Credit=${account.credit}'
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n[RECALCULATE_BALANCES] ✅ SUCCESS! Recalculated balances for {accounts_updated} accounts'
            )
        )
        self.stdout.write(
            f'[RECALCULATE_BALANCES] Total Debits: ${total_debits}, Total Credits: ${total_credits}'
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('[RECALCULATE_BALANCES] This was a dry run - no changes were saved')
            )

