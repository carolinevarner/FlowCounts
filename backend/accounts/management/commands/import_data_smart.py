"""
Smart import command that handles duplicates gracefully by updating existing records
instead of failing on unique constraint violations.
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
import os
import tempfile
import urllib.request
import base64
import json
from accounts.models import ChartOfAccounts, JournalEntry, JournalEntryLine, User


class Command(BaseCommand):
    help = 'Import data with smart duplicate handling - updates existing records instead of failing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='JSON file to import',
        )

    def handle(self, *args, **options):
        input_source = options.get('file') or os.environ.get('IMPORT_DATA_FILE')
        
        if not input_source:
            self.stdout.write(
                self.style.WARNING('[IMPORT_DATA_SMART] No import source provided. Skipping.')
            )
            return
        
        self.stdout.write(f'[IMPORT_DATA_SMART] Starting smart import...')
        
        # Download/load the JSON file
        temp_file = None
        try:
            if input_source.startswith('http'):
                temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
                temp_file.close()
                with urllib.request.urlopen(input_source) as response:
                    data = response.read().decode('utf-8')
                    with open(temp_file.name, 'w', encoding='utf-8') as f:
                        f.write(data)
                import_file = temp_file.name
            else:
                import_file = input_source
            
            # Load JSON
            with open(import_file, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
            
            self.stdout.write(f'[IMPORT_DATA_SMART] Loaded {len(json_data)} objects from JSON')
            
            # Separate objects by model type
            users = [x for x in json_data if x.get('model') == 'accounts.user']
            accounts = [x for x in json_data if x.get('model') == 'accounts.chartofaccounts']
            entries = [x for x in json_data if x.get('model') == 'accounts.journalentry']
            lines = [x for x in json_data if x.get('model') == 'accounts.journalentryline']
            other = [x for x in json_data if x.get('model') not in 
                  ['accounts.user', 'accounts.chartofaccounts', 'accounts.journalentry', 'accounts.journalentryline']]
            
            self.stdout.write(f'[IMPORT_DATA_SMART] Found: {len(users)} users, {len(accounts)} accounts, '
                            f'{len(entries)} entries, {len(lines)} lines, {len(other)} other objects')
            
            # Import in order: users first, then accounts, then entries, then lines
            imported_counts = {'users': 0, 'accounts': 0, 'entries': 0, 'lines': 0, 'other': 0}
            updated_counts = {'users': 0, 'accounts': 0}
            
            # Import users (update if exists, create if not)
            self.stdout.write(f'[IMPORT_DATA_SMART] Importing {len(users)} users...')
            for user_data in users:
                try:
                    fields = user_data.get('fields', {})
                    email = fields.get('email')
                    username = fields.get('username')
                    
                    # Try to find existing user
                    user = None
                    if email:
                        user = User.objects.filter(email=email).first()
                    if not user and username:
                        user = User.objects.filter(username=username).first()
                    
                    if user:
                        # Update existing user (skip display_handle if it would conflict)
                        display_handle = fields.get('display_handle', '')
                        if display_handle:
                            existing_with_handle = User.objects.filter(
                                display_handle=display_handle
                            ).exclude(id=user.id).first()
                            if existing_with_handle:
                                # Skip display_handle update to avoid conflict
                                fields.pop('display_handle', None)
                        
                        # Update user fields
                        for key, value in fields.items():
                            if hasattr(user, key) and key != 'password':
                                setattr(user, key, value)
                        
                        # Update password if provided
                        if 'password' in fields and fields['password']:
                            user.set_password(fields['password'])
                        
                        user.save()
                        updated_counts['users'] += 1
                    else:
                        # Create new user
                        user = User.objects.create_user(
                            username=fields.get('username', ''),
                            email=fields.get('email', ''),
                            password=fields.get('password', ''),
                        )
                        for key, value in fields.items():
                            if hasattr(user, key) and key not in ['password', 'username', 'email']:
                                setattr(user, key, value)
                        user.save()
                        imported_counts['users'] += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'[IMPORT_DATA_SMART] Skipped user {email or username}: {str(e)}')
                    )
            
            # Import accounts (update if exists, create if not)
            self.stdout.write(f'[IMPORT_DATA_SMART] Importing {len(accounts)} accounts...')
            for account_data in accounts:
                try:
                    fields = account_data.get('fields', {}).copy()
                    account_number = fields.get('account_number')
                    
                    # Handle foreign keys
                    created_by_ref = fields.pop('created_by', None)
                    if created_by_ref:
                        if isinstance(created_by_ref, list) and len(created_by_ref) > 0:
                            created_by = User.objects.filter(username=created_by_ref[0]).first()
                        else:
                            created_by = User.objects.filter(username=created_by_ref).first()
                        if created_by:
                            fields['created_by'] = created_by
                    
                    updated_by_ref = fields.pop('updated_by', None)
                    if updated_by_ref:
                        if isinstance(updated_by_ref, list) and len(updated_by_ref) > 0:
                            updated_by = User.objects.filter(username=updated_by_ref[0]).first()
                        else:
                            updated_by = User.objects.filter(username=updated_by_ref).first()
                        if updated_by:
                            fields['updated_by'] = updated_by
                    
                    closed_by_ref = fields.pop('closed_by', None)
                    if closed_by_ref:
                        if isinstance(closed_by_ref, list) and len(closed_by_ref) > 0:
                            closed_by = User.objects.filter(username=closed_by_ref[0]).first()
                        else:
                            closed_by = User.objects.filter(username=closed_by_ref).first()
                        if closed_by:
                            fields['closed_by'] = closed_by
                    
                    account = ChartOfAccounts.objects.filter(account_number=account_number).first()
                    if account:
                        # Update existing
                        for key, value in fields.items():
                            if hasattr(account, key):
                                setattr(account, key, value)
                        account.save()
                        updated_counts['accounts'] += 1
                    else:
                        # Create new
                        account = ChartOfAccounts.objects.create(**fields)
                        imported_counts['accounts'] += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'[IMPORT_DATA_SMART] Skipped account {account_number}: {str(e)}')
                    )
            
            # Import journal entries (create new, skip if exists)
            self.stdout.write(f'[IMPORT_DATA_SMART] Importing {len(entries)} journal entries...')
            entry_id_map = {}  # Map old IDs to new IDs
            for entry_data in entries:
                try:
                    old_pk = entry_data.get('pk')
                    if old_pk and JournalEntry.objects.filter(id=old_pk).exists():
                        entry_id_map[old_pk] = old_pk  # Keep existing ID
                        continue  # Skip if already exists
                    
                    fields = entry_data.get('fields', {}).copy()
                    # Handle foreign keys - they come as [username] from natural-foreign
                    created_by_ref = fields.pop('created_by', None)
                    if created_by_ref:
                        if isinstance(created_by_ref, list) and len(created_by_ref) > 0:
                            created_by = User.objects.filter(username=created_by_ref[0]).first()
                        else:
                            created_by = User.objects.filter(username=created_by_ref).first()
                        if created_by:
                            fields['created_by'] = created_by
                    
                    reviewed_by_ref = fields.pop('reviewed_by', None)
                    if reviewed_by_ref:
                        if isinstance(reviewed_by_ref, list) and len(reviewed_by_ref) > 0:
                            reviewed_by = User.objects.filter(username=reviewed_by_ref[0]).first()
                        else:
                            reviewed_by = User.objects.filter(username=reviewed_by_ref).first()
                        if reviewed_by:
                            fields['reviewed_by'] = reviewed_by
                    
                    entry = JournalEntry.objects.create(**fields)
                    if old_pk:
                        entry_id_map[old_pk] = entry.id  # Map old ID to new ID
                    imported_counts['entries'] += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'[IMPORT_DATA_SMART] Skipped entry: {str(e)}')
                    )
            
            # Import journal entry lines
            self.stdout.write(f'[IMPORT_DATA_SMART] Importing {len(lines)} journal entry lines...')
            for line_data in lines:
                try:
                    fields = line_data.get('fields', {}).copy()
                    
                    # Handle foreign keys - journal_entry comes as ID (not natural key)
                    journal_entry_id = fields.pop('journal_entry', None)
                    if journal_entry_id:
                        # Map old ID to new ID if needed
                        actual_entry_id = entry_id_map.get(journal_entry_id, journal_entry_id)
                        journal_entry = JournalEntry.objects.filter(id=actual_entry_id).first()
                        if journal_entry:
                            fields['journal_entry'] = journal_entry
                        else:
                            continue  # Skip if journal entry doesn't exist
                    
                    # Account comes as ID
                    account_id = fields.pop('account', None)
                    if account_id:
                        account = ChartOfAccounts.objects.filter(id=account_id).first()
                        if account:
                            fields['account'] = account
                        else:
                            continue  # Skip if account doesn't exist
                    
                    JournalEntryLine.objects.create(**fields)
                    imported_counts['lines'] += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'[IMPORT_DATA_SMART] Skipped line: {str(e)}')
                    )
            
            # Import other objects using standard loaddata
            if other:
                self.stdout.write(f'[IMPORT_DATA_SMART] Importing {len(other)} other objects...')
                with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_other:
                    json.dump(other, temp_other)
                    temp_other_path = temp_other.name
                
                try:
                    call_command('loaddata', temp_other_path, verbosity=0)
                    imported_counts['other'] = len(other)
                except:
                    pass
                finally:
                    os.unlink(temp_other_path)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n[IMPORT_DATA_SMART] ✅ SUCCESS! '
                    f'Imported: {imported_counts}, Updated: {updated_counts}'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'[IMPORT_DATA_SMART] ❌ Error: {str(e)}')
            )
            import traceback
            self.stdout.write(f'[IMPORT_DATA_SMART] Traceback: {traceback.format_exc()}')
        finally:
            if temp_file and os.path.exists(temp_file.name):
                os.unlink(temp_file.name)

