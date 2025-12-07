# Deployment Checklist - Fix Missing Data

Follow these steps **in order** to get your data into production:

## ✅ Step 1: Verify Your Export File Has Data

Your `data_export.json` file should be:
- ✅ **6047 lines** (you have this!)
- ✅ **Formatted** (readable, not minified)
- ✅ **Contains users** (you have this!)

**Quick check**: Open `data_export.json` and search for:
- `"model": "accounts.chartofaccounts"` - Should find your accounts
- `"model": "accounts.journalentry"` - Should find your journal entries
- `"model": "accounts.journalentryline"` - Should find journal entry lines

If you find these, your export is good! ✅

## ✅ Step 2: Update Your GitHub Gist

**This is critical!** The code changes alone won't import new data.

1. **Go to your GitHub Gist** (the one you created earlier)
2. **Click "Edit"** (pencil icon)
3. **Select ALL the contents** (Ctrl+A / Cmd+A)
4. **Delete it**
5. **Open your local `data_export.json` file**
6. **Copy ALL contents** (Ctrl+A, Ctrl+C)
7. **Paste into the Gist** (Ctrl+V)
8. **Click "Update secret gist"**
9. **Copy the Raw URL again** (click "Raw" button) - make sure it's the same URL

## ✅ Step 3: Verify Render Environment Variable

1. **Go to Render** → Your backend service → **Settings** → **Environment Variables**
2. **Check `IMPORT_DATA_FILE`** is set to your Gist's raw URL
3. **If it's wrong or missing**, update it with the correct raw URL

## ✅ Step 4: Verify Start Command

Your Start Command should include `recalculate_balances`:

```
cd backend && python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py init_error_messages && (python manage.py create_superuser || true) && (python manage.py import_data --file "$IMPORT_DATA_FILE" || true) && python manage.py seed_sprint_users && python manage.py seed_chart_accounts && python manage.py recalculate_balances && python manage.py reset_all_passwords && python manage.py check_user --email varner4262@gmail.com && (python manage.py reset_user_password --email varner4262@gmail.com --password "$RESET_PASSWORD" || true) && (python manage.py set_user_role --email varner4262@gmail.com --role ADMIN || true) && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

**Key parts**:
- ✅ `(python manage.py import_data --file "$IMPORT_DATA_FILE" || true) &&`
- ✅ `python manage.py recalculate_balances &&`
- ✅ `python manage.py reset_all_passwords &&`

## ✅ Step 5: Trigger Deployment

You have two options:

### Option A: Manual Deploy (Recommended)
1. **Go to Render** → Your backend service
2. **Click "Manual Deploy"** → **"Deploy latest commit"**
3. **Wait for deployment** (~5-10 minutes)

### Option B: Push a Dummy Commit
```bash
git commit --allow-empty -m "Trigger deployment with new data export"
git push origin main
```

## ✅ Step 6: Check Deployment Logs

After deployment starts, **watch the logs** for:

1. **Import success**:
   ```
   [IMPORT_DATA] ✅ SUCCESS! Imported data successfully
   Installed X object(s) from 1 fixture(s)
   ```

2. **Balance recalculation**:
   ```
   [RECALCULATE_BALANCES] ✅ SUCCESS! Recalculated balances for X accounts
   ```

3. **Password resets**:
   ```
   [RESET_ALL_PASSWORDS] ✅ Reset password for varner4262@gmail.com
   [RESET_ALL_PASSWORDS] ✅ Reset password for brendenhorne03@gmail.com
   [RESET_ALL_PASSWORDS] ✅ Reset password for alidabdoub0@gmail.com
   ```

4. **Server starting**:
   ```
   Starting gunicorn...
   ```

## ✅ Step 7: Verify in Production

After deployment completes:

1. **Log into your app**: `https://flowcounts-frontend.onrender.com`
2. **Check Chart of Accounts** - should see ALL your accounts
3. **Check Journal Entries** - should see ALL your entries
4. **Check Account Balances** - should be correct
5. **Check Ledger** - should show entries for APPROVED journal entries
6. **Check Financial Statements** - should have correct balances

## ❌ If Still Not Working

### Check 1: Is the import running?
- Look for `[IMPORT_DATA]` messages in logs
- If missing, check `IMPORT_DATA_FILE` environment variable

### Check 2: Is data being imported?
- Look for `Installed X object(s)` in logs
- Count should match your export file

### Check 3: Are balances being recalculated?
- Look for `[RECALCULATE_BALANCES]` messages
- Should show account-by-account updates

### Check 4: Is the Gist URL correct?
- Open the raw URL in a browser
- Should see your JSON data (formatted)
- Should start with `[` and contain `"model": "accounts.user"`

### Check 5: Did you update the Gist?
- **Most common issue**: Code was pushed but Gist wasn't updated
- The Gist still has the OLD export file
- **Solution**: Update the Gist with the new export (Step 2)

## Quick Test

To verify your Gist has the new data:

1. **Open the raw Gist URL** in a browser
2. **Search for** `"model": "accounts.chartofaccounts"` (Ctrl+F)
3. **If you find it**, the Gist is updated ✅
4. **If not found**, you need to update the Gist (Step 2)

---

**Remember**: Pushing code changes doesn't update the Gist! You must manually update the Gist with the new export file.

