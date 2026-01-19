import os
from core.integrated_ss_api import app

if __name__ == "__main__":
    import uvicorn
    # Get port from environment variable or default to 8000
    # Binding to 0.0.0.0 is crucial for external access (Railway/Docker)
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
