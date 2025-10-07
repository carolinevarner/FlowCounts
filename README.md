# FlowCounts

FlowCounts is a modern, intuitive accounting platform designed to demystify business finances. We transform complex bookkeeping into a streamlined flow of data, empowering entrepreneurs and small businesses to visualize their financial health, track transactions with ease, and make informed decisions with confidence.

## Tech Stack:

*   **Frontend:** React
*   **Backend:** Django, Django REST Framework
*   **Database:** SQLite (for development)
*   **Authentication:** JWT (JSON Web Tokens)

## Development Team

This project is collaboratively built by:

*   [Caroline Varner](https://github.com/carolinevarner)
*   [Brenden Horne](https://github.com/BrendenHorne)
*   [Ali Dabdoub](https://github.com/alid03)

## Quick Start

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

The frontend automatically proxies API and media requests to the backend. Works on any computer without configuration

## Troubleshooting

### "Invalid Credentials" Error
- Verify username/email and password are correct
- Account may be suspended after 3 failed login attempts
- Password may have expired - check email for expiration notice
- Check if account is active in Django admin panel

### Cannot Connect to Backend
- Ensure backend is running: `python manage.py runserver`
- Ensure frontend is running: `npm run dev`
- Check Django server logs in terminal for errors
