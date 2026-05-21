FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for building some python packages)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything
COPY . .

# Debug: List files to ensure main.py is here
RUN echo "Listing files in /app:" && ls -la

# Command to run the application using Railway's PORT
CMD ["sh", "-c", "gunicorn -w ${WEB_CONCURRENCY:-2} -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:${PORT:-8000} --timeout ${WORKER_TIMEOUT:-60}"]
