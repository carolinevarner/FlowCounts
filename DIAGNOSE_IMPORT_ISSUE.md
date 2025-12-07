# Diagnose Why Import Isn't Working

Since nothing changed, let's diagnose the exact issue. Follow these steps:

## Step 1: Check Render Logs

**Go to Render** → Your backend service → **Logs** tab

**Look for these specific messages**:

### ✅ If you see this:
```
[CHECK_GIST] ✅ Gist is accessible and contains valid JSON!
[CHECK_GIST] Accounts: X
[CHECK_GIST] Journal Entries: Y
```

**Good!** The Gist is accessible and has data.

### ❌ If you see this:
```
[CHECK_GIST] ❌ IMPORT_DATA_FILE environment variable is not set!
```
**Problem**: Environment variable not set. Fix: Set `IMPORT_DATA_FILE` in Render.

### ❌ If you see this:
```
[CHECK_GIST] ❌ Failed to access Gist URL
```
**Problem**: Gist URL is wrong or Gist is private. Fix: Check the raw URL.

### ❌ If you see this:
```
[CHECK_GIST] Accounts: 0
[CHECK_GIST] Journal Entries: 0
```
**Problem**: Gist doesn't have your data. Fix: Update the Gist with your export file.

---

## Step 2: Check Import Messages

**Look for**:
```
[IMPORT_DATA] Before import: X accounts, Y entries, Z lines
[IMPORT_DATA] Loading data into database...
Installed X object(s) from 1 fixture(s)
[IMPORT_DATA] After import: X accounts (+X), Y entries (+Y)...
```

### ✅ If you see "Installed X object(s)" where X > 0:
**Good!** Data was imported. The problem is elsewhere.

### ❌ If you see "Installed 0 object(s)":
**Problem**: Import failed. Look for errors BEFORE this message.

### ❌ If you DON'T see "[IMPORT_DATA]" messages at all:
**Problem**: Import command didn't run. Check:
1. Is `IMPORT_DATA_FILE` set?
2. Is the import command in the Start Command?
3. Did deployment complete?

---

## Step 3: Check Verification Messages

**Look for**:
```
[VERIFY_IMPORT] Accounts: X total, Y active
[VERIFY_IMPORT] Journal Entries: X total (Y approved, Z pending)
[VERIFY_IMPORT] Journal Entry Lines: X
```

### ✅ If counts match your local database:
**Good!** Data is imported. Problem might be:
- Balances not recalculated
- Frontend not showing data
- Cache issues

### ❌ If counts are 0:
**Problem**: Data wasn't imported. Go back to Step 2.

### ❌ If counts are lower than expected:
**Problem**: Partial import. Check for foreign key errors in logs.

---

## Step 4: Check Balance Recalculation

**Look for**:
```
[RECALCULATE_BALANCES] Account 1000 (Cash): Balance=$X...
[RECALCULATE_BALANCES] ✅ SUCCESS! Recalculated balances for X accounts
```

### ❌ If you DON'T see these messages:
**Problem**: `recalculate_balances` didn't run. Check Start Command.

---

## Step 5: Most Common Issues & Fixes

### Issue 1: Gist Not Updated
**Symptoms**: 
- `[CHECK_GIST] Accounts: 0`
- Or Gist has old data

**Fix**:
1. Open your Gist
2. Delete ALL content
3. Copy ALL 6047 lines from `data_export.json`
4. Paste into Gist
5. Save
6. Update `IMPORT_DATA_FILE` with new raw URL
7. Redeploy

### Issue 2: Environment Variable Not Set
**Symptoms**:
- `[CHECK_GIST] ❌ IMPORT_DATA_FILE environment variable is not set!`
- `[IMPORT_DATA]` messages don't appear

**Fix**:
1. Render → Settings → Environment Variables
2. Add `IMPORT_DATA_FILE` = [your Gist raw URL]
3. Save
4. Redeploy

### Issue 3: Import Fails Silently
**Symptoms**:
- `Installed 0 object(s)`
- Or import messages don't appear

**Fix**:
1. Check logs for errors BEFORE "Installed 0"
2. Common errors:
   - Foreign key constraint violations
   - Duplicate key violations
   - Invalid JSON
3. Fix the error and re-export/re-import

### Issue 4: Data Imported But Not Showing
**Symptoms**:
- `[VERIFY_IMPORT]` shows correct counts
- But frontend shows no data

**Fix**:
1. Log out and log back in
2. Clear browser cache
3. Check browser console for errors
4. Verify API calls are working (Network tab)

### Issue 5: Balances Wrong
**Symptoms**:
- Accounts show but balances are 0 or wrong

**Fix**:
1. Check logs for `[RECALCULATE_BALANCES]` messages
2. If missing, add to Start Command
3. Or run manually: `python manage.py recalculate_balances`

---

## Step 6: Quick Test - Run Commands Manually

If you have shell access (or can SSH), run these to diagnose:

```bash
# Check Gist
python manage.py check_gist

# Check what's in database
python manage.py verify_import

# Manually import (if needed)
python manage.py import_data --file "$IMPORT_DATA_FILE"

# Manually recalculate balances
python manage.py recalculate_balances
```

---

## Step 7: Share Logs for Help

If still not working, share these from Render logs:

1. **`[CHECK_GIST]` messages** - Shows if Gist is accessible
2. **`[IMPORT_DATA]` messages** - Shows if import ran
3. **`[VERIFY_IMPORT]` messages** - Shows what's in database
4. **Any ERROR messages** - Shows what failed

Copy these sections and we can diagnose further.

---

## Emergency Fix: Skip Import, Use Seed Data

If import keeps failing, you can temporarily use seed data:

**Remove from Start Command**:
```
(python manage.py import_data --file "$IMPORT_DATA_FILE" || true) &&
```

**Keep**:
```
python manage.py seed_sprint_users && python manage.py seed_chart_accounts &&
```

This will at least give you some data to work with while we fix the import.

---

## Next Steps

1. **Check Render logs** using Step 1-4 above
2. **Identify the specific issue** from the symptoms
3. **Apply the fix** from Step 5
4. **Redeploy** and check again
5. **Share logs** if still not working

The logs will tell us exactly what's wrong!

