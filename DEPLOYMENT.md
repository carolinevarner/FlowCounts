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
- Must include: `gunicorn`, `whitenoise`, `psycopg2-binary`, `python-dotenv`, `dj-database-url`
- ✅ Already updated

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
   - **Environment**: `Python 3`
   - **Root Directory**: `FlowCounts` (if your repo structure is `FlowCounts/backend/`, otherwise leave empty)
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT`
   - **Plan**: **Free**

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

#### 2.3 Run Migrations
1. In Render dashboard, go to your **backend service** (`flowcounts-backend`)
2. Click the **"Shell"** tab (or "Logs" tab, then click "Shell" button)
3. Wait for shell to connect
4. Run these commands one by one:

```bash
cd backend
python manage.py migrate
```

This creates all your database tables. You should see output showing migrations being applied.

5. **Initialize error messages** (if you have this command):
```bash
python manage.py init_error_messages
```

6. **Create a superuser** (admin account):
```bash
python manage.py createsuperuser
```
   - Enter username, email, and password when prompted
   - **Save these credentials** - you'll use them to log into your deployed app!

7. **Verify backend is working**:
   - Go to: `https://flowcounts-backend.onrender.com/api/`
   - You should see the Django REST Framework API browser (or a JSON response)

#### 2.4 Deploy Frontend
1. Click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `flowcounts-frontend`
   - **Root Directory**: `FlowCounts` (if needed)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`

4. Add Environment Variable:
   - `VITE_API_URL`: `https://flowcounts-backend.onrender.com` (replace with your backend URL)

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

### Frontend can't connect to backend:
- Verify `CORS_ALLOWED_ORIGINS` includes frontend URL
- Check `VITE_API_URL` is set correctly
- Ensure backend is running (may be spinning up)

### Database errors:
- Run migrations: `python manage.py migrate`
- Check database is running in Render dashboard

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)

