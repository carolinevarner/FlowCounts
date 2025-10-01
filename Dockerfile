# -----------------------------
# Stage 1: Build React frontend
# -----------------------------
FROM node:20 AS frontend-build

WORKDIR /app/frontend

# Copy React source files
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# -----------------------------
# Stage 2: Build Django backend
# -----------------------------
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt ./
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy backend source
COPY backend/ ./

# Set up static files
RUN mkdir -p /app/staticfiles
ENV STATIC_ROOT=/app/staticfiles

# Collect static files
RUN python manage.py collectstatic --noinput

# Copy React build output into Django static files
COPY --from=frontend-build /app/frontend/build /app/staticfiles/frontend

# Expose port for Django
EXPOSE 8000

# Default command
CMD ["gunicorn", "your_project.wsgi:application", "--bind", "0.0.0.0:8000"]
