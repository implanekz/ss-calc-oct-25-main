FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for building some python packages)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files explicitly
COPY main.py .
COPY api ./api
COPY core ./core
COPY config ./config

# Debug: List files to ensure they are present
RUN echo "Listing files in /app:" && ls -R .

# Expose the port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
