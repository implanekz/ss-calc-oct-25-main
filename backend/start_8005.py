
import subprocess
import time
import sys

# Define specific paths and ports
VENV_PYTHON = "/Users/kurtzahner/Desktop/ss-calc-oct-25-main/backend/venv/bin/python"
UVICORN_BIN = "/Users/kurtzahner/Desktop/ss-calc-oct-25-main/backend/venv/bin/uvicorn"
CWD = "/Users/kurtzahner/Desktop/ss-calc-oct-25-main/backend"
PORT = 8005
LOG_FILE = "/Users/kurtzahner/Desktop/ss-calc-oct-25-main/backend/backend_8005.log"

print(f"Attempting to start backend on port {PORT}...")

with open(LOG_FILE, "w") as f:
    f.write(f"--- Starting Backend on Port {PORT} ---\n")
    f.flush()
    
    # Check if dotenv is installed first
    try:
        subprocess.check_call([VENV_PYTHON, "-c", "import dotenv"], stdout=f, stderr=f)
        f.write("dotenv module verification passed.\n")
    except subprocess.CalledProcessError:
        f.write("ERROR: dotenv module missing!\n")
        f.flush()
        print("Error: dotenv missing!")
        sys.exit(1)

    # Start Uvicorn
    cmd = [
        UVICORN_BIN,
        "core.integrated_ss_api:app",
        "--host", "0.0.0.0",
        "--port", str(PORT),
        "--reload"
    ]
    
    process = subprocess.Popen(cmd, cwd=CWD, stdout=f, stderr=f)
    print(f"Backend process started with PID {process.pid}")
    
    # Monitor for a few seconds to ensure it stays up
    time.sleep(3)
    if process.poll() is None:
        print("Backend appears to be running successfully.")
    else:
        print(f"Backend exited early with code {process.returncode}. Check {LOG_FILE}")
