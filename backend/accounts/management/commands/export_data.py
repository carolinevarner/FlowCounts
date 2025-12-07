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
            default=['contenttypes', 'auth.Permission', 'sessions'],
            help='Apps/models to exclude from export',
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
            # Use Django's dumpdata command
            with open(output_path, 'w', encoding='utf-8') as f:
                call_command(
                    'dumpdata',
                    '--natural-foreign',
                    '--natural-primary',
                    '--exclude', *exclude,
                    stdout=f,
                    verbosity=0
                )
            
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



