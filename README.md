# FlowCounts

FlowCounts is a modern, intuitive accounting platform designed to demystify business finances. We transform complex bookkeeping into a streamlined flow of data, empowering entrepreneurs and small businesses to visualize their financial health, track transactions with ease, and make informed decisions with confidence.

## 🚀 Built With

*   **Frontend:** React
*   **Backend:** Django, Django REST Framework
*   **Database:** SQLite (for development)
*   **Authentication:** JWT (JSON Web Tokens)

## 👥 Development Team

This project is collaboratively built by:

*   [Caroline Varner](https://github.com/carolinevarner)
*   [Brenden Horne](https://github.com/BrendenHorne)
*   [Ali Dabdoub](https://github.com/alid03)

## 🎯 Quick Start

1. Clone the repository
2. Open 2 separate terminals and use these commands:

**Terminal 1 (Backend):**
```bash
cd backend 
.\venv\Scripts\Activate
python manage.py runserver
```

**Terminal 2 (Frontend):**
```bash
cd frontend 
npm run dev
```

3. Access the application at `http://localhost:5173`

**That's it!** The frontend automatically proxies API requests to the backend. Works on any computer without configuration.

## 🔑 Features

### Authentication & Security
- ✅ Multi-field login (email or username)
- ✅ JWT token-based authentication with auto-refresh
- ✅ Password requirements (min 8 chars, letter, number, special char)
- ✅ Password history tracking (prevents reuse of last 5 passwords)
- ✅ Failed login attempt tracking (3 attempts before suspension)
- ✅ Security questions for password recovery
- ✅ Password expiration with warnings (90 days)

### User Management (Admin)
- ✅ Create, edit, activate, deactivate users
- ✅ Role assignment (Admin, Manager, Accountant)
- ✅ Suspend users with date ranges
- ✅ View all users and their status
- ✅ Approve/reject registration requests
- ✅ Email notifications for all user actions

### Event Logging
- ✅ Track all user actions (creation, updates, suspensions, etc.)
- ✅ Detailed event history with timestamps
- ✅ Admin dashboard for event monitoring

### Email Notifications
- ✅ User created/approved notifications
- ✅ Suspension/unsuspension notifications
- ✅ Password expiration warnings
- ✅ Admin notifications for system events

## 🔧 Troubleshooting

### "Invalid Credentials" Error
- Verify username/email and password are correct
- Account may be suspended after 3 failed login attempts
- Check if account is active in Django admin panel

### Cannot Connect to Backend
- Ensure backend is running: `python manage.py runserver`
- Ensure frontend is running: `npm run dev`
- Check Django server logs in terminal for errors

## 📧 Support

For issues or questions, contact the development team or check the Django server logs in the terminal.
