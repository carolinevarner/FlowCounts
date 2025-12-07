# Complete Database Connection Fix

This guide addresses all database connection issues: missing data, login problems, and display issues.

## Issues Identified

1. **Users can't log in** - Passwords may not have been imported correctly
2. **Ledger entries not showing** - Only APPROVED entries show in ledger
3. **Not all accounts showing** - May be filtered or not imported
4. **Reference numbers not showing** - Frontend display issue

## Step 1: Export Your Complete Local Database

1. **Open terminal in `FlowCounts/backend`**
2. **Run export command**:
   ```bash
   python manage.py export_data --output data_export.json
   ```
3. **Verify the file was created** - should be in `FlowCounts/backend/data_export.json`

## Step 2: Upload to File Hosting

1. **Go to https://gist.github.com**
2. **Create a new secret gist**
3. **Paste the entire contents of `data_export.json`**
4. **Click "Create secret gist"**
5. **Click "Raw" button** to get the direct URL
6. **Copy the raw URL** (looks like `https://gist.githubusercontent.com/.../raw/...`)

## Step 3: Update Render Configuration

### 3.1 Add Environment Variable

1. **Go to your backend service in Render**
2. **Settings → Environment Variables**
3. **Add**:
   - **Key**: `IMPORT_DATA_FILE`
   - **Value**: The raw URL from Step 2

### 3.2 Update Start Command

**Replace your Start Command with**:

```
cd backend && python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py init_error_messages && python manage.py create_superuser && (python manage.py import_data --file "$IMPORT_DATA_FILE" || true) && python manage.py seed_sprint_users && python manage.py seed_chart_accounts && python manage.py reset_all_passwords && python manage.py check_user --email varner4262@gmail.com && (python manage.py reset_user_password --email varner4262@gmail.com --password "$RESET_PASSWORD" || true) && (python manage.py set_user_role --email varner4262@gmail.com --role ADMIN || true) && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

**What this does**:
- Imports your complete database data
- Seeds users (updates existing ones)
- Seeds accounts (only adds missing ones)
- **Resets all known passwords** (fixes login issues)
- Sets your role to ADMIN

### 3.3 Save and Redeploy

1. **Click "Save Changes"**
2. **Wait for deployment** (~5-10 minutes)
3. **Check the logs** for:
   - `[IMPORT_DATA] ✅ SUCCESS!`
   - `Reset password for varner4262@gmail.com`
   - `Reset password for brendenhorne03@gmail.com`
   - `Reset password for alidabdoub0@gmail.com`
   - `Successfully seeded X accounts!`

## Step 4: Verify Everything Works

### 4.1 Test Logins

Try logging in with these accounts:

- **Caroline Varner** (varner4262@gmail.com) - Password: `Skyrush2013.`
- **Brenden Horne** (brendenhorne03@gmail.com) - Password: `Brenden2025!`
- **Ali Dabdoub** (alidabdoub0@gmail.com) - Password: `AliDabdoub2025!`

### 4.2 Check Accounts

1. **Go to Chart of Accounts**
2. **Verify you see ALL your accounts** (not just seeded ones)
3. **Check that inactive accounts are visible** (if you have any)

### 4.3 Check Ledger Entries

**Important**: Ledger entries only show **APPROVED** journal entries by default.

- **If you have PENDING entries**, they won't show in the ledger until approved
- **To see all entries**, the ledger needs to be updated (see fixes below)

### 4.4 Check Journal Entries

1. **Go to Journal Entries**
2. **Verify all entries are visible**
3. **Check that reference numbers display correctly**

## Step 5: Fix Ledger to Show All Entries (Optional)

If you want to see PENDING entries in ledgers, you need to update the frontend to pass a status parameter.

**Current behavior**: Ledger only shows APPROVED entries
**To change**: Update the ledger API call to include `?status=ALL`

## Step 6: Fix Reference Numbers (If Still Not Showing)

The reference number should be the journal entry ID. Check:

1. **Journal List page** - Does it show the entry ID?
2. **Journal View page** - Does it show the entry ID?
3. **Browser console** - Any JavaScript errors?

If reference numbers aren't showing, the frontend may need to be updated to display `entry.id` or `journal_entry_id`.

## Troubleshooting

### Still can't log in after import:

1. **Check logs** for `[RESET_ALL_PASSWORDS]` messages
2. **Verify passwords were reset** - look for "✅ Reset password for..."
3. **Try the known passwords** from Step 4.1
4. **If still not working**, manually reset:
   - Add to Start Command: `(python manage.py reset_user_password --email USER_EMAIL --password "PASSWORD" || true) &&`

### Accounts still missing:

1. **Check logs** for import errors
2. **Verify the export file** contains all accounts
3. **Check if accounts are inactive** - inactive accounts should still show
4. **Re-export and re-import** if needed

### Ledger entries still not showing:

1. **Check journal entry status** - only APPROVED entries show
2. **Approve pending entries** if you want them in the ledger
3. **Or update the ledger API** to show all statuses (see Step 5)

### Reference numbers not showing:

1. **Check browser console** for JavaScript errors
2. **Verify the API returns** `id` or `journal_entry_id` field
3. **Check the frontend code** - it should display `entry.id` or similar

## Quick Fix Commands

If you need to reset passwords manually, add these to your Start Command:

```bash
(python manage.py reset_user_password --email varner4262@gmail.com --password "Skyrush2013." || true) &&
(python manage.py reset_user_password --email brendenhorne03@gmail.com --password "Brenden2025!" || true) &&
(python manage.py reset_user_password --email alidabdoub0@gmail.com --password "AliDabdoub2025!" || true) &&
```

## After Everything Works

1. **Remove import from Start Command** (optional - it's safe to leave):
   - Remove: `(python manage.py import_data --file "$IMPORT_DATA_FILE" || true) &&`
   - This speeds up deployments

2. **Keep reset_all_passwords** - It's fast and ensures passwords work

3. **Keep seed commands** - They ensure data consistency

