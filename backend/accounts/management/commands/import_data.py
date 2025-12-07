"""
Management command to import data from JSON file into the database.
This loads data exported from your local database into production.
Supports local files, URLs, and base64-encoded data.
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
import os
import tempfile
import urllib.request
import base64
from pathlib import Path


class Command(BaseCommand):
    help = 'Import database data from JSON file (exported from local database). Supports local files, URLs, and base64.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='JSON file to import (can be local file path, URL, or base64 string)',
        )
        parser.add_argument(
            '--input',
            type=str,
            help='Same as --file (alternative name)',
        )

    def handle(self, *args, **options):
        input_source = options.get('file') or options.get('input') or os.environ.get('IMPORT_DATA_FILE') or os.environ.get('IMPORT_DATA_BASE64')
        
        if not input_source:
            self.stdout.write(
                self.style.WARNING(
                    '[IMPORT_DATA] No import source provided. Skipping data import.'
                )
            )
            return
        
        self.stdout.write(f'[IMPORT_DATA] Starting data import...')
        self.stdout.write(f'[IMPORT_DATA] Input source: {input_source[:50]}...' if len(input_source) > 50 else f'[IMPORT_DATA] Input source: {input_source}')
        
        # Determine if it's a URL, base64, or local file
        temp_file = None
        try:
            if input_source.startswith('http://') or input_source.startswith('https://'):
                # It's a URL - download it
                self.stdout.write(f'[IMPORT_DATA] Downloading from URL...')
                temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
                temp_file.close()
                
                with urllib.request.urlopen(input_source) as response:
                    data = response.read().decode('utf-8')
                    with open(temp_file.name, 'w', encoding='utf-8') as f:
                        f.write(data)
                
                import_file = temp_file.name
                self.stdout.write(f'[IMPORT_DATA] Downloaded to temporary file: {import_file}')
                
            elif len(input_source) > 100 and not os.path.exists(input_source):
                # Likely base64 encoded
                try:
                    self.stdout.write(f'[IMPORT_DATA] Decoding base64 data...')
                    decoded_data = base64.b64decode(input_source).decode('utf-8')
                    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
                    temp_file.write(decoded_data)
                    temp_file.close()
                    import_file = temp_file.name
                    self.stdout.write(f'[IMPORT_DATA] Decoded to temporary file: {import_file}')
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'[IMPORT_DATA] ❌ Failed to decode base64: {str(e)}')
                    )
                    return
            else:
                # Local file path
                if not os.path.exists(input_source):
                    self.stdout.write(
                        self.style.ERROR(f'[IMPORT_DATA] ❌ File not found: {input_source}')
                    )
                    return
                import_file = input_source
            
            # Use Django's loaddata command
            self.stdout.write(f'[IMPORT_DATA] Loading data into database...')
            call_command('loaddata', import_file, verbosity=1)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'[IMPORT_DATA] ✅ SUCCESS! Imported data successfully'
                )
            )
        except urllib.error.URLError as e:
            self.stdout.write(
                self.style.ERROR(f'[IMPORT_DATA] ❌ Failed to download from URL: {str(e)}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'[IMPORT_DATA] ❌ Error importing data: {str(e)}')
            )
            import traceback
            self.stdout.write(f'[IMPORT_DATA] Traceback: {traceback.format_exc()}')
        finally:
            # Clean up temporary file
            if temp_file and os.path.exists(temp_file.name):
                try:
                    os.unlink(temp_file.name)
                    self.stdout.write(f'[IMPORT_DATA] Cleaned up temporary file')
                except:
                    pass

