# ---------- Stage 1: Python Backend ----------
FROM python:3.11-slim as backend

# Prevent interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app/backend

# Copy Python requirements first for caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Collect static files (optional if using Django staticfiles)
# RUN python manage.py collectstatic --noinput

# Expose Django port
EXPOSE 8080

# Command to run Django
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8080"]

# ---------- Stage 2: React Frontend ----------
FROM node:20 as frontend

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./

# Build Vite app
RUN npm run build

# Verify the build folder
RUN ls -la dist

# ---------- Stage 3: Final Image ----------
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install system deps for Python runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend and installed packages
COPY --from=backend /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend /app/backend /app/backend

# Copy frontend build into Django static files
COPY --from=frontend /app/frontend/dist /app/backend/staticfiles

EXPOSE 8000

CMD ["gunicorn", "myproject.wsgi:application", "--bind", "0.0.0.0:8000"]
