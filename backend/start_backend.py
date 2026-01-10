
import subprocess
import os
import sys

log_file = "/Users/kurtzahner/Desktop/ss-calc-oct-25-main/backend/backend_boot.log"

with open(log_file, "w") as f:
    f.write("Starting backend via Python script...\n")
    f.flush()
    try:
        # Use absolute path to uvicorn in venv
        uvicorn_path = "/Users/kurtzahner/Desktop/ss-calc-oct-25-main/backend/venv/bin/uvicorn"
        
        # Start process
        p = subprocess.Popen(
            [uvicorn_path, "core.integrated_ss_api:app", "--host", "0.0.0.0", "--port", "8000"],
            cwd="/Users/kurtzahner/Desktop/ss-calc-oct-25-main/backend",
            stdout=f,
            stderr=f
        )
        f.write(f"Started process with PID: {p.pid}\n")
        f.flush()
        
        # Wait a bit to see if it crashes immediately
        try:
            code = p.wait(timeout=3)
            f.write(f"Process exited immediately with code: {code}\n")
        except subprocess.TimeoutExpired:
            f.write("Process is still running after 3 seconds.\n")
            
    except Exception as e:
        f.write(f"Failed to start: {str(e)}\n")
