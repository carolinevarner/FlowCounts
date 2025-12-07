# Complete Data Export Guide

This guide ensures you export ALL your data correctly, including all accounts, journal entries, and related data.

## Step 1: Export Your Complete Database

Run this command in your `FlowCounts/backend` directory:

```bash
python manage.py export_data --output data_export.json
```

This exports:
- ✅ All users
- ✅ All accounts (ChartOfAccounts)
- ✅ All journal entries (JournalEntry)
- ✅ All journal entry lines (JournalEntryLine)
- ✅ All journal entry attachments (JournalEntryAttachment)
- ✅ All registration requests
- ✅ All event logs
- ✅ All error messages
- ✅ All security questions

## Step 2: Verify the Export

Check that your export file includes all the data:

1. **Open `data_export.json`** in a text editor
2. **Search for**:
   - `"model": "accounts.chartofaccounts"` - Should have all your accounts
   - `"model": "accounts.journalentry"` - Should have all your journal entries
   - `"model": "accounts.journalentryline"` - Should have all journal entry lines
   - `"model": "accounts.user"` - Should have all your users

3. **Count the entries**:
   - How many accounts? (search for `"model": "accounts.chartofaccounts"`)
   - How many journal entries? (search for `"model": "accounts.journalentry"`)
   - How many journal entry lines? (search for `"model": "accounts.journalentryline"`)

## Step 3: If Data is Missing

If you're missing data in the export:

### Option 1: Export Everything (Recommended)

```bash
python manage.py export_data --output data_export.json --include-all
```

This exports all apps, not just accounts.

### Option 2: Export Specific Models

```bash
python manage.py dumpdata accounts.User accounts.ChartOfAccounts accounts.JournalEntry accounts.JournalEntryLine accounts.JournalEntryAttachment accounts.RegistrationRequest accounts.EventLog accounts.ErrorMessage accounts.SecurityQuestion --natural-foreign --natural-primary --output data_export.json
```

## Step 4: Upload and Import

1. **Upload to GitHub Gist** (as before)
2. **Update Render Start Command** to include `recalculate_balances`
3. **Redeploy**

## Step 5: After Import - Verify Data

After deployment, check:

1. **Accounts**: Go to Chart of Accounts - should see ALL accounts
2. **Journal Entries**: Go to Journal Entries - should see ALL entries
3. **Balances**: Check account balances - should be correct after recalculation
4. **Ledger**: Check ledger entries - should show all APPROVED entries
5. **Financial Statements**: Check trial balance, income statement, etc. - should have correct balances

## Troubleshooting

### Export file is too small:
- Check if you have data in your local database
- Run: `python manage.py shell` and check:
  ```python
  from accounts.models import ChartOfAccounts, JournalEntry
  print(f"Accounts: {ChartOfAccounts.objects.count()}")
  print(f"Journal Entries: {JournalEntry.objects.count()}")
  ```

### Some accounts missing after import:
- Check the export file - are they in there?
- Check import logs for errors
- Make sure `seed_chart_accounts` runs after import (it only adds missing ones)

### Journal entries missing:
- Check the export file - are they in there?
- Check import logs for foreign key errors
- Make sure users exist before journal entries are imported

### Balances are wrong:
- Run `python manage.py recalculate_balances` manually
- Check that journal entries are APPROVED (only approved entries affect balances)
- Verify journal entry lines are imported correctly

### Ledger entries not showing:
- Ledger only shows APPROVED journal entries
- Check that journal entries have status='APPROVED'
- Check that journal entry lines are linked to accounts correctly

