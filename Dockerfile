# Use official Python image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Copy backend code
COPY backend/ /app/

# Install dependencies
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Expose the port that Gunicorn will run on
EXPOSE 8080

# Run Gunicorn with correct module path
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8080"]
