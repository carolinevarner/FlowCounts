# Database Connection & User Login Fix Guide

This guide will help you fix your database connection issues and get all users able to log in.

## Problem Summary
- Database is missing a lot of information
- Other users can't log in
- Production database is not fully populated

## Solution Overview
You need to:
1. Export your local database data (if you have important data there)
2. Ensure your Render start command includes all necessary seeding commands
3. Import your local data OR use the seed commands to populate the database
4. Verify users can log in

---

## Step 1: Check Your Current Render Start Command

1. **Go to your Render dashboard**
2. **Click on your backend service**
3. **Go to "Settings" tab**
4. **Scroll to "Start Command"**
5. **Copy the current command** (so you can reference it)

Your start command should include ALL of these commands in this order:

```bash
cd backend && python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py init_error_messages && python manage.py create_superuser && (python manage.py import_data --file "$IMPORT_DATA_FILE" || true) && python manage.py seed_sprint_users && python manage.py seed_chart_accounts && python manage.py check_user --email varner4262@gmail.com && (python manage.py reset_user_password --email varner4262@gmail.com --password "$RESET_PASSWORD" || true) && (python manage.py set_user_role --email varner4262@gmail.com --role ADMIN || true) && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

**Important parts:**
- `seed_sprint_users` - Creates/updates Caroline, Brenden, Ali, and test users
- `seed_chart_accounts` - Creates all the chart of accounts
- `import_data` - Imports your local database data (if you have IMPORT_DATA_FILE set)

---

## Step 2: Export Your Local Database (If You Have Important Data)

If you have important data in your local database that you want to keep:

1. **Open PowerShell or Command Prompt**
2. **Navigate to your backend directory**:
   ```powershell
   cd "C:\Users\Owner\OneDrive - Kennesaw State University\Documents\GitHub\FlowCounts\FlowCounts\backend"
   ```

3. **Activate your virtual environment** (if you have one):
   ```powershell
   .\venv\Scripts\Activate
   ```

4. **Export all your data**:
   ```powershell
   python manage.py export_data --output data_export.json
   ```

5. **Verify the file was created**:
   - Check that `FlowCounts/backend/data_export.json` exists
   - The file should be several KB or MB depending on your data size

---

## Step 3: Upload Your Data to a File Hosting Service

You need to upload your `data_export.json` file so Render can download it during deployment.

### Option A: Use GitHub Gist (Recommended - Free & Easy)

1. **Go to**: https://gist.github.com
2. **Create a new Gist**:
   - Click "Create a new gist"
   - **Filename**: `data_export.json`
   - **Content**: Open your `data_export.json` file and copy ALL its contents into the text box
   - **Visibility**: Choose "Create secret gist" (it's still accessible via URL)
3. **Click "Create secret gist"**
4. **Get the raw URL**:
   - Click the "Raw" button (top right of the file)
   - Copy the URL (it will look like: `https://gist.githubusercontent.com/username/gist-id/raw/.../data_export.json`)
   - **Save this URL** - you'll need it in Step 4

### Option B: Use Pastebin

1. **Go to**: https://pastebin.com
2. **Create a new paste**:
   - Paste the contents of your `data_export.json` file
   - **Paste name**: `data_export.json`
   - **Expiration**: Never
   - **Paste Exposure**: Unlisted
3. **Click "Create New Paste"**
4. **Get the raw URL**:
   - Click "Raw" button
   - Copy the URL (it will look like: `https://pastebin.com/raw/xxxxx`)
   - **Save this URL**

---

## Step 4: Update Your Render Configuration

### 4.1 Update Environment Variables

1. **Go to your backend service in Render**
2. **Click "Settings" tab**
3. **Scroll to "Environment Variables"**
4. **Add or update these variables**:

   | Key | Value | Notes |
   |-----|-------|-------|
   | `IMPORT_DATA_FILE` | `https://gist.githubusercontent.com/...` | The raw URL from Step 3 |
   | `RESET_PASSWORD` | `YourPassword123!` | Password for varner4262@gmail.com (optional) |
   | `SUPERUSER_USERNAME` | `admin` | Your admin username |
   | `SUPERUSER_EMAIL` | `admin@example.com` | Your admin email |
   | `SUPERUSER_PASSWORD` | `YourSecurePassword123!` | Your admin password |

### 4.2 Update Start Command

1. **Still in Settings tab, scroll to "Start Command"**
2. **Replace the entire command with this** (update the email if needed):

```bash
cd backend && python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py init_error_messages && python manage.py create_superuser && (python manage.py import_data --file "$IMPORT_DATA_FILE" || true) && python manage.py seed_sprint_users && python manage.py seed_chart_accounts && python manage.py check_user --email varner4262@gmail.com && (python manage.py reset_user_password --email varner4262@gmail.com --password "$RESET_PASSWORD" || true) && (python manage.py set_user_role --email varner4262@gmail.com --role ADMIN || true) && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

**What this does:**
- ✅ Runs migrations (creates/updates database tables)
- ✅ Collects static files
- ✅ Initializes error messages
- ✅ Creates superuser (if env vars are set)
- ✅ Imports your local data (if IMPORT_DATA_FILE is set)
- ✅ Seeds users (Caroline, Brenden, Ali, test users) with correct passwords
- ✅ Seeds chart of accounts
- ✅ Resets your password and sets your role to ADMIN
- ✅ Starts the server

3. **Click "Save Changes"** - Render will automatically redeploy

---

## Step 5: Monitor the Deployment

1. **Go to "Logs" tab** in your backend service
2. **Watch for these success messages**:
   - ✅ `Operations to perform: Apply all migrations...` (database connected)
   - ✅ `Successfully created default error messages!`
   - ✅ `Superuser admin created successfully!` (if env vars set)
   - ✅ `[IMPORT_DATA] ✅ SUCCESS!` (if you uploaded data)
   - ✅ `Created/Updated users` (from seed_sprint_users)
   - ✅ `Successfully seeded X accounts!` (from seed_chart_accounts)
   - ✅ `[RESET_PASSWORD] ✅ SUCCESS!` (if password reset ran)
   - ✅ `[SET_ROLE] ✅ SUCCESS!` (if role was set)
   - ✅ `Starting gunicorn...`

3. **If you see errors**, check:
   - Is `IMPORT_DATA_FILE` URL accessible? (try opening it in a browser)
   - Are all environment variables set correctly?
   - Are there any red error messages in the logs?

---

## Step 6: Verify Everything Works

### 6.1 Test User Logins

Try logging in with these accounts (from `seed_sprint_users`):

| Email | Password | Role |
|-------|----------|------|
| `varner4262@gmail.com` | `Skyrush2013.` | ADMIN |
| `brendenhorne03@gmail.com` | `Brenden2025!` | MANAGER |
| `alidabdoub0@gmail.com` | `AliDabdoub2025!` | ACCOUNTANT |

### 6.2 Verify Data is Present

1. **Log into the application**
2. **Check that you see**:
   - ✅ Chart of Accounts (not empty)
   - ✅ Users list (Caroline, Brenden, Ali should be there)
   - ✅ Journal entries (if you imported them)
   - ✅ Your correct name and profile

### 6.3 If Users Still Can't Log In

If specific users can't log in, you can reset their passwords:

1. **Add to Start Command** (before gunicorn):
   ```bash
   (python manage.py reset_user_password --email USER_EMAIL --password "$RESET_PASSWORD" || true) &&
   ```

2. **Or unsuspend a user**:
   ```bash
   (python manage.py unsuspend_user --email USER_EMAIL || true) &&
   ```

3. **Save and redeploy**

---

## Step 7: Clean Up (Optional)

After everything is working:

1. **You can remove the import from Start Command** (it's safe to leave it - the `|| true` prevents failures):
   - Remove: `(python manage.py import_data --file "$IMPORT_DATA_FILE" || true) &&`
   - This speeds up future deployments

2. **Keep the seed commands** - they ensure users and accounts are always present

---

## Troubleshooting

### "No such file or directory" error during import:
- ✅ Check that `IMPORT_DATA_FILE` URL is accessible (open in browser)
- ✅ Make sure it's a raw/direct download URL, not a web page
- ✅ Try re-uploading the file to a new Gist/Pastebin

### "DeserializationError" during import:
- ✅ The JSON file might be corrupted
- ✅ Re-export: `python manage.py export_data --output data_export.json`
- ✅ Re-upload to a new Gist/Pastebin

### Users can't log in after import:
- ✅ Passwords are hashed, so they should work
- ✅ Use `seed_sprint_users` command - it sets known passwords
- ✅ Or use `reset_user_password` command for specific users

### Database still appears empty:
- ✅ Check logs for "Successfully seeded X accounts!"
- ✅ Make sure `seed_chart_accounts` is in your Start Command
- ✅ Make sure `seed_sprint_users` is in your Start Command
- ✅ Log out and log back in after deployment

### Duplicate data:
- ✅ The seed commands check for existing data, so they're safe to run multiple times
- ✅ The import command might create duplicates if run multiple times
- ✅ You may need to clear the database first (be careful!)

---

## Quick Reference: User Accounts

These users are created by `seed_sprint_users`:

- **Caroline Varner** (varner4262@gmail.com) - ADMIN - Password: `Skyrush2013.`
- **Brenden Horne** (brendenhorne03@gmail.com) - MANAGER - Password: `Brenden2025!`
- **Ali Dabdoub** (alidabdoub0@gmail.com) - ACCOUNTANT - Password: `AliDabdoub2025!`

---

## Need More Help?

If you're still having issues:
1. Check the Render logs for specific error messages
2. Verify all environment variables are set correctly
3. Make sure your Start Command includes all the seed commands
4. Try redeploying after making changes


