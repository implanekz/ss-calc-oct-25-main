#!/bin/bash
cd /Users/kurtzahner/Desktop/ss-calc-oct-25-main/backend
source venv/bin/activate
# Try running uvicorn explicitly
uvicorn core.integrated_ss_api:app --host 0.0.0.0 --port 8000 > backend_startup.log 2>&1 &
echo "Started backend"
