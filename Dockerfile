# Stage 1: Build the Python environment
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV APP_HOME /app

# Create and set the working directory
WORKDIR $APP_HOME

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY backend/core/ $APP_HOME/core/

# Expose the port (FastAPI defaults to 8000)
EXPOSE 8000

# Command to run the application using Uvicorn (ASGI server)
# The API wrapper is integrated_ss_api.py, running the 'app' object
CMD ["uvicorn", "core.integrated_ss_api:app", "--host", "0.0.0.0", "--port", "8000"]