"""
Management command to export all data from the database to JSON.
This exports all models so you can import them into production.
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
import os
from pathlib import Path


class Command(BaseCommand):
    help = 'Export all database data to JSON file for migration to production'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='data_export.json',
            help='Output file name (default: data_export.json)',
        )
        parser.add_argument(
            '--exclude',
            type=str,
            nargs='+',
            default=['contenttypes', 'auth.Permission', 'sessions', 'admin'],
            help='Apps/models to exclude from export',
        )
        parser.add_argument(
            '--indent',
            type=int,
            default=2,
            help='JSON indentation (0 for compact, 2+ for readable)',
        )
        parser.add_argument(
            '--include-all',
            action='store_true',
            help='Include all apps (not just accounts)',
        )

    def handle(self, *args, **options):
        output_file = options['output']
        exclude = options['exclude']
        
        # Get the backend directory
        backend_dir = Path(__file__).parent.parent.parent.parent
        output_path = backend_dir / output_file
        
        self.stdout.write(f'[EXPORT_DATA] Starting data export...')
        self.stdout.write(f'[EXPORT_DATA] Output file: {output_path}')
        self.stdout.write(f'[EXPORT_DATA] Excluding: {", ".join(exclude)}')
        
        try:
            import json
            import tempfile
            
            # Use a temporary file to capture output
            with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.json', encoding='utf-8') as temp_file:
                temp_path = temp_file.name
                
                # Use Django's dumpdata command
                if options.get('include_all', False):
                    # Export everything except excluded models
                    exclude_list = list(exclude) if exclude else []
                    cmd_args = [
                        'dumpdata',
                        '--natural-foreign',
                        '--natural-primary',
                    ]
                    if exclude_list:
                        cmd_args.extend(['--exclude'] + exclude_list)
                    call_command(*cmd_args, stdout=temp_file, verbosity=0)
                else:
                    # Export only accounts app (faster, more focused)
                    # Don't use --exclude when specifying an app, it causes issues
                    call_command(
                        'dumpdata',
                        'accounts',  # Explicitly include accounts app
                        '--natural-foreign',
                        '--natural-primary',
                        stdout=temp_file,
                        verbosity=0
                    )
            
            # Read the temp file, parse JSON, and write with indentation
            indent = options.get('indent', 2)
            with open(temp_path, 'r', encoding='utf-8') as temp_file:
                data = json.load(temp_file)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=indent, ensure_ascii=False)
            
            # Clean up temp file
            import os
            os.unlink(temp_path)
            
            file_size = output_path.stat().st_size
            self.stdout.write(
                self.style.SUCCESS(
                    f'[EXPORT_DATA] ✅ SUCCESS! Exported data to {output_file} ({file_size:,} bytes)'
                )
            )
            self.stdout.write(f'[EXPORT_DATA] File location: {output_path}')
            self.stdout.write(
                self.style.WARNING(
                    f'[EXPORT_DATA] ⚠️  IMPORTANT: This file contains sensitive data. Do NOT commit it to GitHub!'
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'[EXPORT_DATA] ❌ Error exporting data: {str(e)}')
            )
            import traceback
            self.stdout.write(f'[EXPORT_DATA] Traceback: {traceback.format_exc()}')



