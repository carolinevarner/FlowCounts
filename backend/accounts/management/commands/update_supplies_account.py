from django.core.management.base import BaseCommand
from accounts.models import ChartOfAccounts


class Command(BaseCommand):
    help = 'Update Supplies account subcategory from Current Assets to Other Assets'

    def handle(self, *args, **kwargs):
        try:
            supplies_account = ChartOfAccounts.objects.get(account_name='Supplies')
            current_subcategory = supplies_account.account_subcategory
            
            # Check if it's a current asset variant (could be "Current Assets" or "Current Asset")
            if current_subcategory and 'current' in current_subcategory.lower():
                old_subcategory = current_subcategory
                supplies_account.account_subcategory = 'Other Assets'
                supplies_account.save(update_fields=['account_subcategory', 'updated_at'])
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully updated Supplies account (ID: {supplies_account.id}) '
                        f'subcategory from "{old_subcategory}" to "Other Assets"'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'Supplies account already has subcategory: "{current_subcategory}". '
                        f'No update needed.'
                    )
                )
        except ChartOfAccounts.DoesNotExist:
            self.stdout.write(
                self.style.WARNING('Supplies account not found in database. Nothing to update.')
            )
        except ChartOfAccounts.MultipleObjectsReturned:
            self.stdout.write(
                self.style.ERROR('Multiple Supplies accounts found. Please update manually through the UI.')
            )
