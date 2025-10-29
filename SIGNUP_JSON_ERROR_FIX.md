# Signup JSON Error - Fix Guide

## Issue
When attempting to sign up, you're seeing the error:
```
Failed to execute 'json' on 'Response': Unexpected end of JSON input
SyntaxError: Unexpected token '<', '<!doctype ...' is not valid JSON
```

## Root Cause
The frontend is trying to call the backend API at `http://localhost:8000/api/auth/signup`, but instead of receiving JSON, it's getting HTML (likely a 404 error page). This happens when:

1. **The backend server is not running**
2. The backend is running on a different port
3. There's a CORS or routing configuration issue

## Solution

### Step 1: Start the Backend Server

The backend FastAPI server needs to be running for the signup to work. Here's how to start it:

```bash
# From the project root directory
cd backend

# Make sure you have the required dependencies installed
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn core.integrated_ss_api:app --reload --host 0.0.0.0 --port 8000
```

You should see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Step 2: Verify Backend is Running

Open a browser and navigate to:
- `http://localhost:8000/` - Should return: `{"message": "The RISE and SHINE Method™ API", "status": "healthy", "version": "2.0.0"}`
- `http://localhost:8000/docs` - Should show the FastAPI interactive documentation

### Step 3: Start the Frontend

In a **separate terminal** window:

```bash
# From the project root directory
cd frontend

# Install dependencies if needed
npm install

# Start the React development server
npm start
```

### Step 4: Test the Signup

Now try the signup process again. The error should be resolved.

## Environment Configuration

Make sure your `.env` files are configured correctly:

### Backend `.env` (in `backend/` directory)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Frontend `.env.local` (in `frontend/` directory)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Improved Error Messages

I've updated the `frontend/src/contexts/UserContext.jsx` to provide clearer error messages when the backend isn't responding. Now you'll see:

```
Backend server is not responding correctly. Please ensure the API server is running at http://localhost:8000
```

This makes it immediately clear when the backend server needs to be started.

## Common Issues

### Issue: Port 8000 is already in use
**Solution:** Either kill the process using port 8000, or start the backend on a different port:
```bash
python -m uvicorn core.integrated_ss_api:app --reload --port 8001
```
Then update `frontend/.env.local` to use `REACT_APP_API_URL=http://localhost:8001`

### Issue: Module import errors
**Solution:** Make sure you're in the `backend` directory when starting the server, and all dependencies are installed:
```bash
cd backend
pip install -r requirements.txt
```

### Issue: Supabase connection errors
**Solution:** Verify your Supabase credentials in the `.env` files are correct. You can test the connection with:
```bash
cd backend
python test_supabase_connection.py
```

## Production Deployment

For production deployment on Vercel:
1. Backend and frontend will use different URLs
2. Update `REACT_APP_API_URL` to point to your deployed backend
3. Configure CORS in the backend to allow your production frontend domain
4. See `VERCEL_DEPLOYMENT_SETTINGS.md` for detailed deployment instructions

## Quick Start Script

To make this easier, you can create a startup script:

```bash
#!/bin/bash
# start-dev.sh

# Start backend
cd backend
python -m uvicorn core.integrated_ss_api:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Backend running at: http://localhost:8000"
echo "Frontend running at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
wait
```

Make it executable:
```bash
chmod +x start-dev.sh
./start-dev.sh
