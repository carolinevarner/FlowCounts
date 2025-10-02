# Use official Python image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Copy backend code
COPY backend/ /app/

# Upgrade pip and install dependencies
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Run database migrations and collect static files
RUN python manage.py migrate --noinput
RUN python manage.py collectstatic --noinput

# Expose the port Elastic Beanstalk will use
EXPOSE 8080

# Run Gunicorn with environment port
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:$PORT"]
