# Free Deployment Guide for FlowCounts

This guide covers the **easiest free deployment options** for your Django + React application.

## 🎯 Recommended: Render (Easiest - All-in-One)

**Render** offers free tiers for both frontend and backend, plus a free PostgreSQL database. This is the simplest option.

### Prerequisites
- GitHub account (free)
- Render account (free at [render.com](https://render.com))

### Step 1: Prepare Your Code

**✅ Most changes have already been made!** Just verify:

#### 1.1 Verify Backend Procfile ✅
**Location**: `FlowCounts/backend/Procfile`
- Should contain: `web: gunicorn core.wsgi:application --bind 0.0.0.0:$PORT`
- ✅ Already created

#### 1.2 Verify Backend Requirements ✅
**Location**: `FlowCounts/backend/requirements.txt`
- Must include: `gunicorn`, `whitenoise`, `psycopg2-binary`, `python-dotenv`, `dj-database-url`, `Pillow`
- ✅ Already updated (Pillow added for ImageField support)

#### 1.3 Verify Backend Settings ✅
**Location**: `FlowCounts/backend/core/settings.py`
- PostgreSQL support added (auto-detects `DATABASE_URL`)
- ✅ Already updated

#### 1.4 Verify Frontend API Configuration ✅
**Location**: `FlowCounts/frontend/src/api.js`
- Supports `VITE_API_URL` environment variable
- ✅ Already updated

#### 1.5 Commit and Push to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

#### 1.6 Generate Secret Key

You need to generate a Django secret key for production. Here's how:

**Option 1: Using Command Line (Easiest)**

1. Open your terminal/command prompt
2. Navigate to your backend directory:
   ```bash
   cd FlowCounts/backend
   ```
3. Activate your virtual environment (if you have one):
   ```bash
   # Windows
   .\venv\Scripts\Activate
   
   # Mac/Linux
   source venv/bin/activate
   ```
4. Run this command:
   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```
5. **Copy the output** - it will look something like:
   ```
   django-insecure-abc123xyz789...very-long-string...
   ```
6. **Save this key somewhere safe** (notepad, password manager, etc.) - you'll need it in Step 2.2!

**Option 2: Using Django Shell**

1. Navigate to backend directory and activate virtual environment
2. Run:
   ```bash
   python manage.py shell
   ```
3. In the shell, type:
   ```python
   from django.core.management.utils import get_random_secret_key
   print(get_random_secret_key())
   ```
4. Copy the output and save it

**⚠️ Important**: 
- This key is used to encrypt sessions and other sensitive data
- Never commit this key to GitHub
- Keep it secret and secure
- You'll paste this into Render's environment variables in Step 2.2

### Step 2: Deploy to Render

#### 2.1 Create PostgreSQL Database
1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `flowcounts-db`
   - **Database**: `flowcounts` (or leave default)
   - **User**: `flowcounts` (or leave default)
   - **Plan**: **Free**
4. Click "Create Database"
5. Wait for database to be created (~1-2 minutes)
6. **Find the Database URL**:
   - Click on your database name in the dashboard
   - Go to the **"Connections"** tab
   - Copy the **"Internal Database URL"** 
   - It looks like: `postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com/dbname`
   - **Save this URL** - you'll need it in Step 2.2!

#### 2.2 Deploy Backend
1. Click "New +" → "Web Service"
2. **Connect Repository**:
   - If first time: Click "Connect account" and authorize Render to access GitHub
   - Select your repository: `FlowCounts` (or your repo name)
   - Click "Connect"
3. **Configure Service**:
   - **Name**: `flowcounts-backend` (this becomes your URL: `flowcounts-backend.onrender.com`)
   - **Language**: **Select "Python 3"** (⚠️ Important: Do NOT select "Docker" - select "Python 3" from the dropdown)
     - Once you select "Python 3", the Build Command and Start Command fields will appear!
   - **Branch**: `main` (or your default branch)
   - **Region**: Choose closest to you (e.g., Ohio, Oregon)
   - **Root Directory**: `FlowCounts` (if your repo structure is `FlowCounts/backend/`, otherwise leave empty)
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT`
   - **Plan**: **Free**
   
   **⚠️ If you don't see Build Command/Start Command fields:**
   - Make sure you selected **"Python 3"** as the Language (not "Docker")
   - The fields appear after selecting Python 3

4. **Add Environment Variables** (Click "Advanced" → "Add Environment Variable"):
   
   Add these one by one:
   
   | Key | Value | Where to Find |
   |-----|-------|---------------|
   | `SECRET_KEY` | [Paste the key from Step 1.6] | You generated this in Step 1.6 |
   | `DEBUG` | `False` | Type this value |
   | `ALLOWED_HOSTS` | `flowcounts-backend.onrender.com` | Replace `flowcounts-backend` with your actual service name |
   | `DATABASE_URL` | [Paste Internal Database URL] | From Step 2.1 - "Connections" tab in database |
   | `CORS_ALLOWED_ORIGINS` | `https://flowcounts-frontend.onrender.com` | We'll update this after frontend is deployed |

5. Click "Create Web Service"
6. Wait for deployment (~5-10 minutes for first build)
7. **Note your backend URL**: It will be `https://flowcounts-backend.onrender.com` (replace with your service name)

#### 2.3 Run Migrations (Free Tier - No Shell Access Needed)

Since the free tier doesn't include shell access, we'll run migrations automatically during deployment.

**✅ A management command has been created for you!** (`create_superuser.py`)

**Steps:**

1. **Update your Start Command** in Render:
   - Go to your **backend service** in Render dashboard
   - Click **"Settings"** tab
   - Scroll down to **"Start Command"**
   - **Replace** the existing start command with:
     ```
     cd backend && python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py init_error_messages && python manage.py create_superuser && python manage.py check_user --email varner4262@gmail.com && (python manage.py reset_user_password --email varner4262@gmail.com --password "$RESET_PASSWORD" || true) && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
     ```
     **Note**: 
     - Replace `varner4262@gmail.com` with your email
     - The `|| true` ensures commands don't fail if user doesn't exist
     - You'll need to set `RESET_PASSWORD` environment variable (see step 2b below)
     This will automatically:
     - Run database migrations
     - Collect static files (required for Django admin)
     - Initialize error messages
     - Create a superuser (if environment variables are set)
     - Start the server
   
2. **Add Environment Variables**:
   - Still in the **"Settings"** tab, scroll to **"Environment Variables"**
   - Click **"Add Environment Variable"** and add these:
   
   | Key | Value | Example | Required |
   |-----|-------|---------|----------|
   | `SUPERUSER_USERNAME` | Your admin username | `admin` | Yes |
   | `SUPERUSER_EMAIL` | Your admin email | `admin@example.com` | Yes |
   | `SUPERUSER_PASSWORD` | Your admin password | `YourSecurePassword123!` | Yes |
   | `RESET_PASSWORD` | Password to reset for varner4262@gmail.com | `YourKnownPassword123!` | Optional* |
   | `RESET_PASSWORD_EMAIL` | Email to reset password for | `varner4262@gmail.com` | Optional* |
   
   **⚠️ Important**: 
   - Use a strong password for `SUPERUSER_PASSWORD`!
   - *Set `RESET_PASSWORD` and `RESET_PASSWORD_EMAIL` if you want to reset your account password during deployment
   - This will unsuspend your account and set the password to the value you specify

3. **Commit and push** the new management command (if you haven't already):
   ```bash
   git add .
   git commit -m "Add create_superuser management command for deployment"
   git push origin main
   ```

4. **Save Changes** in Render - it will automatically redeploy

5. **Check the logs** to verify everything worked:
   - Go to **"Logs"** tab in your backend service
   - You should see messages like:
     - "Operations to perform: Apply all migrations..."
     - "Successfully created default error messages!"
     - "Superuser admin created successfully!"
     - "Starting gunicorn..."

6. **Verify backend is working**:
   - Go to: `https://flowcounts-backend.onrender.com/api/`
   - You should see the Django REST Framework API browser (or a JSON response)
   - Try logging in at: `https://flowcounts-backend.onrender.com/admin/` with your superuser credentials

#### 2.4 Deploy Frontend
1. Click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `flowcounts-frontend`
   - **Root Directory**: `FlowCounts` (if needed)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`

4. Add Environment Variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://flowcounts-backend.onrender.com` (replace with your actual backend URL - do NOT include `/api` at the end, it's added automatically)
   - **Example**: If your backend is at `https://flowcounts-backend.onrender.com`, use exactly that (without trailing slash)

5. Click "Create Static Site"

#### 2.5 Update CORS Settings
1. Go to backend service → "Environment" tab
2. Update `CORS_ALLOWED_ORIGINS` to: `https://flowcounts-frontend.onrender.com` (replace with your frontend URL)
3. Click "Save Changes"

### Step 3: Test Your Deployment

1. **Frontend**: Go to `https://flowcounts-frontend.onrender.com`
2. **Backend**: Go to `https://flowcounts-backend.onrender.com/api/`
3. **Login**: Try logging in with your superuser account

---

## 📝 Important Notes

### Free Tier Limitations:
- **Render**: Services spin down after 15 minutes of inactivity. First request may take 30-60 seconds.

### File Uploads:
For file uploads (profile photos, journal attachments), consider:
- **Cloudinary** (free tier) - easiest
- **AWS S3** (free tier for 12 months)
- Or use Render's disk storage (limited on free tier)

### Email Configuration:
Update your email settings in environment variables for production.

---

## 🆘 Troubleshooting

### Backend won't start:
- Check `ALLOWED_HOSTS` includes your Render URL
- Verify `DATABASE_URL` is set correctly
- Check logs in Render dashboard

### Frontend can't connect to backend / "Invalid credentials" on login:
1. **Check `VITE_API_URL` is set correctly**:
   - Go to frontend service → Settings → Environment Variables
   - `VITE_API_URL` should be: `https://your-backend-name.onrender.com` (without `/api` at the end)
   - **Do NOT include `/api`** - the code adds it automatically
   - Make sure there's no trailing slash

2. **Verify CORS settings**:
   - Go to backend service → Settings → Environment Variables
   - `CORS_ALLOWED_ORIGINS` should include: `https://your-frontend-name.onrender.com`
   - Or `CORS_ALLOW_ALL_ORIGINS` should be `True` (if you want to allow all origins)

3. **Check browser console**:
   - Open browser DevTools (F12) → Console tab
   - Try logging in and look for errors
   - Check Network tab to see if API calls are being made and what the response is

4. **Verify backend is running**:
   - Go to `https://your-backend-name.onrender.com/api/`
   - You should see the Django REST Framework API browser
   - If you see 401, that's normal (it requires auth)

5. **Check if superuser exists**:
   - The superuser should have been created during deployment
   - Check the deployment logs to see if "Superuser created successfully!" appeared
   - If not, verify `SUPERUSER_USERNAME`, `SUPERUSER_EMAIL`, and `SUPERUSER_PASSWORD` are set in backend environment variables

6. **After fixing, redeploy frontend**:
   - If you changed `VITE_API_URL`, you need to redeploy the frontend
   - Go to frontend service → Manual Deploy → Deploy latest commit

### Database errors:
- Run migrations: `python manage.py migrate`
- Check database is running in Render dashboard

### Account Suspended / Can't Login / Password Mismatch:
1. **Reset password and unsuspend** (Recommended):
   - Go to backend service → Settings → Environment Variables
   - Add these variables:
     - `RESET_PASSWORD_EMAIL` = `varner4262@gmail.com` (your email)
     - `RESET_PASSWORD` = `YourNewPassword123!` (the password you want to use)
   - Update Start Command to include:
     ```
     (python manage.py reset_user_password --email varner4262@gmail.com --password "$RESET_PASSWORD" || true) &&
     ```
   - Save and redeploy
   - After successful login, you can remove these from the start command

2. **Just unsuspend (if password is correct)**:
   - Go to backend service → Settings → Start Command
   - Add to start command (before gunicorn):
     ```
     (python manage.py unsuspend_user --email varner4262@gmail.com || true) &&
     ```
   - Save and redeploy

3. **Use Django admin to fix** (if you have superuser access):
   - Go to: `https://your-backend.onrender.com/admin/`
   - Login with superuser credentials
   - Go to Users → Find your user
   - Click on your user → Change password (enter new password twice)
   - Set "Is active" to checked
   - Set "Failed attempts" to 0
   - Clear "Suspend from" and "Suspend to" dates
   - Save

4. **Check logs to see what's happening**:
   - Go to backend service → Logs tab
   - Look for "Login failed" messages
   - Check if password reset command ran successfully
   - Look for "check_user" output to see user status
   - Look for "Successfully reset password" message

5. **Debug step-by-step**:
   - First, check if user exists: Look for "check_user" output in logs
   - If user doesn't exist, you may need to create it first
   - If user exists but password reset failed, check the error message
   - Verify `RESET_PASSWORD` environment variable is set correctly
   - Try using Django admin to reset password manually (see step 3)

6. **If password reset command isn't running**:
   - Check that `RESET_PASSWORD` environment variable is set
   - Check that the email in the command matches your actual email
   - Look for errors in the deployment logs
   - The command should show "✅ Successfully reset password" if it worked

### "Cannot use ImageField because Pillow is not installed":
- **Fixed!** Pillow has been added to `requirements.txt`
- Commit and push the updated requirements.txt:
  ```bash
  git add backend/requirements.txt
  git commit -m "Add Pillow to requirements"
  git push origin main
  ```
- Render will automatically redeploy with Pillow installed

### Static files directory warnings:
- **Fixed!** Settings now only include directories that exist
- These are just warnings and won't prevent deployment
- Commit and push the updated settings.py if you see these warnings

### Server Error (500) when accessing admin:
1. **Check the logs first**:
   - Go to your backend service → **"Logs"** tab
   - Scroll to the bottom to see the most recent errors
   - Look for Python tracebacks or error messages
   
2. **Most common causes**:
   - **Django admin URLs not included**: ✅ **Fixed!** Admin URLs have been added to `urls.py`
   - **Static files not collected**: Update your Start Command to include `python manage.py collectstatic --noinput`
   - **Database connection issue**: Verify `DATABASE_URL` is set correctly
   - **Missing migrations**: Check if migrations ran successfully in logs
   - **Missing environment variables**: Verify all required env vars are set

3. **Fix static files issue** (if still having issues):
   - Go to Settings → Start Command
   - Make sure it includes: `python manage.py collectstatic --noinput`
   - Should look like:
     ```
     cd backend && python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py init_error_messages && python manage.py create_superuser && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
     ```
   - Save changes and wait for redeploy

4. **If you still get 500 errors after fixes**:
   - Commit and push the updated `urls.py` file:
     ```bash
     git add backend/core/urls.py
     git commit -m "Add Django admin URLs and fix catch-all pattern"
     git push origin main
     ```
   - Render will automatically redeploy
   - The admin panel should now work at `/admin/`

5. **Check specific error in logs**:
   - The logs will show the exact Python error
   - Common errors:
     - `No such table`: Migrations didn't run - check migration logs
     - `Static files not found`: Need to run collectstatic
     - `Database connection failed`: Check DATABASE_URL
     - `Template not found`: Admin URLs not included (now fixed)

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)

