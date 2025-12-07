"""
Management command to verify what data was imported and what's missing.
This helps diagnose import issues.
"""
from django.core.management.base import BaseCommand
from accounts.models import ChartOfAccounts, JournalEntry, JournalEntryLine, User


class Command(BaseCommand):
    help = 'Verify what data exists in the database after import'

    def handle(self, *args, **options):
        self.stdout.write(f'[VERIFY_IMPORT] Checking database contents...\n')
        
        # Count users
        user_count = User.objects.count()
        self.stdout.write(f'[VERIFY_IMPORT] Users: {user_count}')
        if user_count > 0:
            for user in User.objects.all()[:5]:
                self.stdout.write(f'  - {user.email} ({user.username}) - Role: {user.role}')
        
        # Count accounts
        account_count = ChartOfAccounts.objects.count()
        active_accounts = ChartOfAccounts.objects.filter(is_active=True).count()
        self.stdout.write(f'\n[VERIFY_IMPORT] Accounts: {account_count} total, {active_accounts} active')
        if account_count > 0:
            for account in ChartOfAccounts.objects.all()[:10]:
                self.stdout.write(
                    f'  - {account.account_number} {account.account_name}: '
                    f'Balance=${account.balance}, Debit=${account.debit}, Credit=${account.credit}'
                )
        
        # Count journal entries
        journal_count = JournalEntry.objects.count()
        approved_count = JournalEntry.objects.filter(status='APPROVED').count()
        pending_count = JournalEntry.objects.filter(status='PENDING').count()
        self.stdout.write(
            f'\n[VERIFY_IMPORT] Journal Entries: {journal_count} total '
            f'({approved_count} approved, {pending_count} pending)'
        )
        if journal_count > 0:
            for entry in JournalEntry.objects.all()[:5]:
                self.stdout.write(
                    f'  - Entry #{entry.id} ({entry.entry_date}): '
                    f'{entry.status} - {entry.description[:50]}'
                )
        
        # Count journal entry lines
        line_count = JournalEntryLine.objects.count()
        self.stdout.write(f'\n[VERIFY_IMPORT] Journal Entry Lines: {line_count}')
        if line_count > 0:
            # Count lines per journal entry
            from django.db.models import Count
            entries_with_lines = JournalEntry.objects.annotate(
                line_count=Count('lines')
            ).filter(line_count__gt=0)
            self.stdout.write(f'  - Journal entries with lines: {entries_with_lines.count()}')
            for entry in entries_with_lines[:5]:
                self.stdout.write(
                    f'    Entry #{entry.id}: {entry.lines.count()} lines'
                )
        
        # Check for orphaned data
        entries_without_lines = JournalEntry.objects.filter(lines__isnull=True).count()
        if entries_without_lines > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'\n[VERIFY_IMPORT] ⚠️  WARNING: {entries_without_lines} journal entries have no lines!'
                )
            )
        
        lines_without_accounts = JournalEntryLine.objects.filter(account__isnull=True).count()
        if lines_without_accounts > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'[VERIFY_IMPORT] ⚠️  WARNING: {lines_without_accounts} journal entry lines have no account!'
                )
            )
        
        # Summary
        self.stdout.write(f'\n[VERIFY_IMPORT] Summary:')
        self.stdout.write(f'  Users: {user_count}')
        self.stdout.write(f'  Accounts: {account_count}')
        self.stdout.write(f'  Journal Entries: {journal_count}')
        self.stdout.write(f'  Journal Entry Lines: {line_count}')
        
        if account_count == 0:
            self.stdout.write(
                self.style.ERROR('\n[VERIFY_IMPORT] ❌ NO ACCOUNTS FOUND - Import may have failed!')
            )
        if journal_count == 0:
            self.stdout.write(
                self.style.ERROR('\n[VERIFY_IMPORT] ❌ NO JOURNAL ENTRIES FOUND - Import may have failed!')
            )
        if line_count == 0:
            self.stdout.write(
                self.style.ERROR('\n[VERIFY_IMPORT] ❌ NO JOURNAL ENTRY LINES FOUND - Import may have failed!')
            )

