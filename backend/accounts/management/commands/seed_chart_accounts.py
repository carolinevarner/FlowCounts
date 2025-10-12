from django.core.management.base import BaseCommand
from accounts.models import ChartOfAccounts, User


class Command(BaseCommand):
    help = 'Seed the Chart of Accounts with typical business accounts'

    def handle(self, *args, **kwargs):
        # Clear existing accounts
        ChartOfAccounts.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('Cleared existing accounts'))

        # Get the first admin user to assign as creator
        admin_user = User.objects.filter(role='ADMIN').first()
        if not admin_user:
            admin_user = User.objects.filter(is_superuser=True).first()

        # Define typical business accounts
        accounts = [
            {
                'account_name': 'Cash',
                'account_number': '1000',
                'account_description': 'Primary operating cash account for daily transactions',
                'normal_side': 'DEBIT',
                'account_category': 'ASSET',
                'account_subcategory': 'Current Assets',
                'initial_balance': 50000.00,
                'debit': 75000.00,
                'credit': 25000.00,
                'balance': 50000.00,
                'order': 1,
                'statement': 'BS',
                'comment': 'Main checking account at First National Bank',
            },
            {
                'account_name': 'Accounts Receivable',
                'account_number': '1200',
                'account_description': 'Money owed to the company by customers for services rendered',
                'normal_side': 'DEBIT',
                'account_category': 'ASSET',
                'account_subcategory': 'Current Assets',
                'initial_balance': 25000.00,
                'debit': 45000.00,
                'credit': 20000.00,
                'balance': 25000.00,
                'order': 2,
                'statement': 'BS',
                'comment': 'Outstanding customer invoices - net 30 terms',
            },
            {
                'account_name': 'Inventory',
                'account_number': '1300',
                'account_description': 'Products and materials held for sale',
                'normal_side': 'DEBIT',
                'account_category': 'ASSET',
                'account_subcategory': 'Current Assets',
                'initial_balance': 18000.00,
                'debit': 30000.00,
                'credit': 12000.00,
                'balance': 18000.00,
                'order': 3,
                'statement': 'BS',
                'comment': 'Stock on hand valued at cost',
            },
            {
                'account_name': 'Prepaid Insurance',
                'account_number': '1400',
                'account_description': 'Insurance premiums paid in advance',
                'normal_side': 'DEBIT',
                'account_category': 'ASSET',
                'account_subcategory': 'Current Assets',
                'initial_balance': 3600.00,
                'debit': 3600.00,
                'credit': 0.00,
                'balance': 3600.00,
                'order': 4,
                'statement': 'BS',
                'comment': 'Annual policy expires December 31',
            },
            {
                'account_name': 'Office Equipment',
                'account_number': '1500',
                'account_description': 'Computers, furniture, and office equipment',
                'normal_side': 'DEBIT',
                'account_category': 'ASSET',
                'account_subcategory': 'Fixed Assets',
                'initial_balance': 35000.00,
                'debit': 35000.00,
                'credit': 0.00,
                'balance': 35000.00,
                'order': 5,
                'statement': 'BS',
                'comment': 'Depreciated over 5 years',
            },
            {
                'account_name': 'Accounts Payable',
                'account_number': '2000',
                'account_description': 'Money owed to suppliers and vendors',
                'normal_side': 'CREDIT',
                'account_category': 'LIABILITY',
                'account_subcategory': 'Current Liabilities',
                'initial_balance': 15000.00,
                'debit': 10000.00,
                'credit': 25000.00,
                'balance': 15000.00,
                'order': 6,
                'statement': 'BS',
                'comment': 'Vendor invoices due within 30 days',
            },
            {
                'account_name': 'Salaries Payable',
                'account_number': '2100',
                'account_description': 'Accrued salaries and wages owed to employees',
                'normal_side': 'CREDIT',
                'account_category': 'LIABILITY',
                'account_subcategory': 'Current Liabilities',
                'initial_balance': 8500.00,
                'debit': 2000.00,
                'credit': 10500.00,
                'balance': 8500.00,
                'order': 7,
                'statement': 'BS',
                'comment': 'Payroll due next Friday',
            },
            {
                'account_name': 'Common Stock',
                'account_number': '3000',
                'account_description': 'Equity from stock issued to shareholders',
                'normal_side': 'CREDIT',
                'account_category': 'EQUITY',
                'account_subcategory': 'Stockholders Equity',
                'initial_balance': 100000.00,
                'debit': 0.00,
                'credit': 100000.00,
                'balance': 100000.00,
                'order': 8,
                'statement': 'BS',
                'comment': '10,000 shares at $10 par value',
            },
            {
                'account_name': 'Service Revenue',
                'account_number': '4000',
                'account_description': 'Income from services provided to clients',
                'normal_side': 'CREDIT',
                'account_category': 'REVENUE',
                'account_subcategory': 'Operating Revenue',
                'initial_balance': 125000.00,
                'debit': 5000.00,
                'credit': 130000.00,
                'balance': 125000.00,
                'order': 9,
                'statement': 'IS',
                'comment': 'Primary revenue stream from consulting services',
            },
            {
                'account_name': 'Rent Expense',
                'account_number': '5000',
                'account_description': 'Monthly office space rental costs',
                'normal_side': 'DEBIT',
                'account_category': 'EXPENSE',
                'account_subcategory': 'Operating Expenses',
                'initial_balance': 24000.00,
                'debit': 24000.00,
                'credit': 0.00,
                'balance': 24000.00,
                'order': 10,
                'statement': 'IS',
                'comment': '$2,000 per month for office lease',
            },
            {
                'account_name': 'Utilities Expense',
                'account_number': '5100',
                'account_description': 'Electricity, water, internet, and phone services',
                'normal_side': 'DEBIT',
                'account_category': 'EXPENSE',
                'account_subcategory': 'Operating Expenses',
                'initial_balance': 4800.00,
                'debit': 4800.00,
                'credit': 0.00,
                'balance': 4800.00,
                'order': 11,
                'statement': 'IS',
                'comment': 'Average $400 per month for all utilities',
            },
            {
                'account_name': 'Salaries Expense',
                'account_number': '5200',
                'account_description': 'Employee wages and compensation',
                'normal_side': 'DEBIT',
                'account_category': 'EXPENSE',
                'account_subcategory': 'Operating Expenses',
                'initial_balance': 60000.00,
                'debit': 60000.00,
                'credit': 0.00,
                'balance': 60000.00,
                'order': 12,
                'statement': 'IS',
                'comment': 'Staff payroll and benefits',
            },
            {
                'account_name': 'Retained Earnings',
                'account_number': '3100',
                'account_description': 'Accumulated profits retained in the business',
                'normal_side': 'CREDIT',
                'account_category': 'EQUITY',
                'account_subcategory': 'Retained Earnings',
                'initial_balance': 45000.00,
                'debit': 5000.00,
                'credit': 50000.00,
                'balance': 45000.00,
                'order': 13,
                'statement': 'RE',
                'comment': 'Cumulative earnings since inception',
            },
            {
                'account_name': 'Notes Payable',
                'account_number': '2200',
                'account_description': 'Long-term loans and notes payable to banks',
                'normal_side': 'CREDIT',
                'account_category': 'LIABILITY',
                'account_subcategory': 'Long-term Liabilities',
                'initial_balance': 50000.00,
                'debit': 0.00,
                'credit': 50000.00,
                'balance': 50000.00,
                'order': 14,
                'statement': 'BS',
                'comment': '5-year business loan at 6% interest',
            },
            {
                'account_name': 'Supplies',
                'account_number': '1250',
                'account_description': 'Office supplies and materials on hand',
                'normal_side': 'DEBIT',
                'account_category': 'ASSET',
                'account_subcategory': 'Current Assets',
                'initial_balance': 2500.00,
                'debit': 3500.00,
                'credit': 1000.00,
                'balance': 2500.00,
                'order': 15,
                'statement': 'BS',
                'comment': 'Paper, pens, toner, and general office supplies',
            },
        ]

        # Create accounts
        for account_data in accounts:
            if admin_user:
                account_data['created_by'] = admin_user
            
            account = ChartOfAccounts.objects.create(**account_data)
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created account: {account.account_number} - {account.account_name}'
                )
            )

        self.stdout.write(
            self.style.SUCCESS(f'\nSuccessfully seeded {len(accounts)} accounts!')
        )

