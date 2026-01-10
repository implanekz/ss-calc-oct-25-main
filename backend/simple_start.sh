#!/bin/bash
cd /Users/kurtzahner/Desktop/ss-calc-oct-25-main/backend
echo "Script started" > status.txt
/Users/kurtzahner/Desktop/ss-calc-oct-25-main/backend/venv/bin/uvicorn core.integrated_ss_api:app --host 0.0.0.0 --port 8000 > backend_simple.log 2>&1 &
echo "Script ended" >> status.txt
