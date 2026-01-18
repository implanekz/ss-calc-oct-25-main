import uvicorn
import os
import sys

# Add the current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.integrated_ss_api import app

if __name__ == "__main__":
    # Run the application using Uvicorn
    # This entry point is useful for local development or simple VPS deployments
    uvicorn.run("core.integrated_ss_api:app", host="0.0.0.0", port=8000, reload=False)
