# Use official Python image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Copy requirements first and install dependencies (for Docker caching)
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the rest of the backend code
COPY backend/ /app/

# Expose the port Gunicorn will run on
EXPOSE 8000

# Run Gunicorn with correct module path
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]
