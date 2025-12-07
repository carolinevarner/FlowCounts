# Data Migration Guide: Local SQLite → Production PostgreSQL

This guide will help you export your local database data and import it into your production PostgreSQL database on Render.

## Step 1: Export Data from Local Database

1. **Open your terminal/command prompt**
2. **Navigate to your backend directory**:
   ```bash
   cd FlowCounts/backend
   ```
3. **Activate your virtual environment** (if you have one):
   ```bash
   # Windows
   .\venv\Scripts\Activate
   
   # Mac/Linux
   source venv/bin/activate
   ```
4. **Export all your data**:
   ```bash
   python manage.py export_data --output data_export.json
   ```
   
   This will create a file called `data_export.json` in your `backend` directory containing:
   - All users (with passwords hashed - safe)
   - All accounts (Chart of Accounts)
   - All journal entries
   - All ledger entries
   - All registration requests
   - All event logs
   - All error messages
   - Everything else in your database

5. **Verify the file was created**:
   - Check that `FlowCounts/backend/data_export.json` exists
   - The file should be several KB or MB depending on your data size

## Step 2: Upload Data to Render

You have two options:

### Option A: Upload via Render Dashboard (Easiest)

1. **Go to your backend service in Render**
2. **Click on "Environment" tab**
3. **Scroll down to "Environment Variables"**
4. **Add a new environment variable**:
   - **Key**: `IMPORT_DATA_FILE`
   - **Value**: You'll set this after uploading (see below)

5. **Upload the file**:
   - Unfortunately, Render's free tier doesn't have a direct file upload feature
   - Use Option B instead (recommended)

### Option B: Use a File Hosting Service (Recommended)

1. **Upload your `data_export.json` file to a temporary hosting service**:
   - **Option 1**: Use [Pastebin](https://pastebin.com) or [GitHub Gist](https://gist.github.com)
     - Create a new paste/gist
     - Paste the contents of `data_export.json`
     - Get the raw URL (e.g., `https://pastebin.com/raw/xxxxx` or `https://gist.githubusercontent.com/.../raw/...`)
   - **Option 2**: Use [Google Drive](https://drive.google.com) or [Dropbox](https://dropbox.com)
     - Upload the file
     - Get a shareable link (make sure it's set to "Anyone with the link can view")
     - Convert to direct download link if needed
   - **Option 3**: Use [GitHub](https://github.com) (if you're comfortable)
     - Create a private repository or use a private gist
     - Upload the file
     - Get the raw URL

2. **Copy the raw/direct download URL**

### Option C: Use Base64 Encoding (For Small Files)

If your file is small (< 1MB), you can encode it:

1. **Encode the file** (Windows PowerShell):
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("data_export.json")) | Out-File "data_export_base64.txt"
   ```

2. **Copy the contents of `data_export_base64.txt`**

3. **Add as environment variable**:
   - **Key**: `IMPORT_DATA_BASE64`
   - **Value**: [paste the base64 string]

## Step 3: Import Data into Production

### Method 1: Using Environment Variable (Recommended)

1. **Go to your backend service in Render**
2. **Click "Settings" tab**
3. **Scroll to "Environment Variables"**
4. **Add environment variable**:
   - **Key**: `IMPORT_DATA_FILE`
   - **Value**: The URL from Step 2 (e.g., `https://pastebin.com/raw/xxxxx`)
5. **Update your Start Command** to include import:
   - Go to "Start Command" in Settings
   - Add before `gunicorn`:
     ```
     (python manage.py import_data --file "$IMPORT_DATA_FILE" || true) &&
     ```
   - Full command should look like:
     ```
     cd backend && python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py init_error_messages && python manage.py create_superuser && (python manage.py import_data --file "$IMPORT_DATA_FILE" || true) && python manage.py seed_sprint_users && python manage.py seed_chart_accounts && python manage.py check_user --email varner4262@gmail.com && (python manage.py reset_user_password --email varner4262@gmail.com --password "$RESET_PASSWORD" || true) && (python manage.py set_user_role --email varner4262@gmail.com --role ADMIN || true) && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
     ```
6. **Save changes** - Render will automatically redeploy
7. **Check the logs** to verify import:
   - Go to "Logs" tab
   - Look for "[IMPORT_DATA] ✅ SUCCESS!" message
   - You should see "Installed X object(s) from Y fixture(s)"

### Method 2: Manual Import via Render Shell (If Available)

If you have shell access (paid plan), you can:
1. Upload the file to Render
2. SSH into your service
3. Run: `python manage.py import_data --file data_export.json`

## Step 4: Verify Data Import

After deployment:

1. **Check the logs** for import success messages
2. **Log into your application**:
   - Go to `https://flowcounts-frontend.onrender.com`
   - Log in with your credentials
3. **Verify you see**:
   - ✅ All your accounts (not just seeded ones)
   - ✅ All your users
   - ✅ All journal entries
   - ✅ Ledger entries
   - ✅ Registration requests
   - ✅ Your correct name and photo

## Step 5: Clean Up

After successful import:

1. **Remove the import from Start Command** (optional - it's safe to leave it):
   - The `|| true` ensures it won't fail if the file doesn't exist
   - You can remove it to speed up deployments
2. **Delete the local export file** (optional):
   - The `data_export.json` file contains sensitive data
   - Consider deleting it after successful import
   - Or keep it as a backup

## Troubleshooting

### Import fails with "No such file or directory":
- Check that the URL in `IMPORT_DATA_FILE` is accessible
- Try opening the URL in a browser - it should show JSON data
- Make sure it's a raw/direct download URL, not a web page

### Import fails with "DeserializationError":
- The JSON file might be corrupted
- Re-export the data: `python manage.py export_data --output data_export.json`
- Make sure you're using the latest export

### Some data is missing after import:
- Check the logs for any errors during import
- Some data might have foreign key constraints
- Try importing again - Django's loaddata is idempotent (safe to run multiple times)

### Users can't log in after import:
- Passwords are hashed, so they should work
- If not, use the `reset_user_password` command for specific users
- Or use the seed_sprint_users command which sets known passwords

### Duplicate data:
- If you run import multiple times, you might get duplicates
- The seed commands check for existing data, but import doesn't
- You may need to clear the database first (be careful!)

## Alternative: Manual Database Copy

If the above doesn't work, you can manually copy specific data:

1. **Export specific models**:
   ```bash
   python manage.py dumpdata accounts.User accounts.ChartOfAccounts accounts.JournalEntry > specific_data.json
   ```

2. **Import specific models**:
   ```bash
   python manage.py loaddata specific_data.json
   ```

## Security Note

⚠️ **IMPORTANT**: The exported JSON file contains:
- User data (names, emails, addresses)
- Account data
- Journal entries
- Event logs

**DO NOT**:
- Commit this file to GitHub
- Share it publicly
- Leave it in a public location

**DO**:
- Delete it after successful import
- Store it securely if keeping as backup
- Use private file hosting if uploading



