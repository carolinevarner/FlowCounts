"""
Management command to verify the Gist URL is accessible and contains data.
This helps diagnose import issues.
"""
from django.core.management.base import BaseCommand
import os
import urllib.request
import json


class Command(BaseCommand):
    help = 'Check if the Gist URL is accessible and contains valid data'

    def handle(self, *args, **options):
        gist_url = os.environ.get('IMPORT_DATA_FILE')
        
        if not gist_url:
            self.stdout.write(
                self.style.ERROR('[CHECK_GIST] ❌ IMPORT_DATA_FILE environment variable is not set!')
            )
            return
        
        self.stdout.write(f'[CHECK_GIST] Checking Gist URL: {gist_url[:50]}...')
        
        try:
            # Try to download the file
            with urllib.request.urlopen(gist_url) as response:
                data = response.read().decode('utf-8')
                
            # Try to parse as JSON
            try:
                json_data = json.loads(data)
                
                # Count different model types
                accounts = [x for x in json_data if x.get('model') == 'accounts.chartofaccounts']
                entries = [x for x in json_data if x.get('model') == 'accounts.journalentry']
                lines = [x for x in json_data if x.get('model') == 'accounts.journalentryline']
                users = [x for x in json_data if x.get('model') == 'accounts.user']
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'[CHECK_GIST] ✅ Gist is accessible and contains valid JSON!'
                    )
                )
                self.stdout.write(f'[CHECK_GIST] Total objects: {len(json_data)}')
                self.stdout.write(f'[CHECK_GIST] Accounts: {len(accounts)}')
                self.stdout.write(f'[CHECK_GIST] Journal Entries: {len(entries)}')
                self.stdout.write(f'[CHECK_GIST] Journal Entry Lines: {len(lines)}')
                self.stdout.write(f'[CHECK_GIST] Users: {len(users)}')
                
                if len(accounts) == 0:
                    self.stdout.write(
                        self.style.ERROR('[CHECK_GIST] ⚠️  WARNING: No accounts found in Gist!')
                    )
                if len(entries) == 0:
                    self.stdout.write(
                        self.style.ERROR('[CHECK_GIST] ⚠️  WARNING: No journal entries found in Gist!')
                    )
                if len(lines) == 0:
                    self.stdout.write(
                        self.style.ERROR('[CHECK_GIST] ⚠️  WARNING: No journal entry lines found in Gist!')
                    )
                    
            except json.JSONDecodeError as e:
                self.stdout.write(
                    self.style.ERROR(f'[CHECK_GIST] ❌ Gist contains invalid JSON: {str(e)}')
                )
                self.stdout.write(f'[CHECK_GIST] First 500 chars: {data[:500]}')
                
        except urllib.error.URLError as e:
            self.stdout.write(
                self.style.ERROR(f'[CHECK_GIST] ❌ Failed to access Gist URL: {str(e)}')
            )
            self.stdout.write(f'[CHECK_GIST] Make sure the URL is correct and the Gist is public/accessible')
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'[CHECK_GIST] ❌ Error: {str(e)}')
            )

