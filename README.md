# FlowCounts

A modern, web-based accounting application designed to simplify financial tracking and management for individuals and small businesses.

## Built With

* **Backend:** Django & Django REST Framework
* **Frontend:** React
* **Database:** SQLite (Development) / PostgreSQL (Production)

## Developers

* **Caroline Varner**
* **Brenden Horne**
* **Ali Dabdoub**

## Project Structure
flowcounts/
├── backend/ # Django project (API & Admin)
│ ├── flowcounts/ # Main project directory (settings, urls)
│ └── accounts/ # Example Django app (e.g., for user management)
├── frontend/ # React application
│ ├── public/
│ └── src/
│ ├── components/
│ ├── pages/
│ └── App.js
└── README.md


## Getting Started (Development)

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have the following installed on your machine:
* Python 3.x & pip
* Node.js & npm
* Git

### Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone <your-repository-url>
    cd flowcounts
    ```

2.  **Set up the Backend (Django)**
    ```bash
    # Navigate to the backend directory
    cd backend

    # Create a virtual environment (recommended)
    python -m venv venv
    # On macOS/Linux:
    source venv/bin/activate
    # On Windows:
    .\venv\Scripts\activate

    # Install Python dependencies
    pip install -r requirements.txt

    # Run database migrations
    python manage.py migrate

    # Create a superuser (optional)
    python manage.py createsuperuser

    # Start the development server
    python manage.py runserver
    ```
    The Django API will be running at `http://localhost:5173`.

3.  **Set up the Frontend (React)**
    ```bash
    # Open a new terminal and navigate to the frontend directory
    cd ../frontend

    # Install npm dependencies
    npm install

    # Start the React development server
    npm start
    ```
    The React app will be running at `http://localhost:5173` and should connect to the Django API.

## License

This project is licensed for the purposes of this course and group collaboration.
