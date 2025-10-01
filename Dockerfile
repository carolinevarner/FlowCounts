# Use official Python image
FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Copy requirements first for caching
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django project code
COPY backend/ ./backend

# Set environment variables for Django
ENV PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=core.settings

# Collect static files (optional, but good for production)
RUN python backend/manage.py collectstatic --noinput

# Expose port 8080 for Elastic Beanstalk
EXPOSE 8080

# Run Gunicorn with the correct wsgi module
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8080", "--workers", "3"]
