import os

try:
    # Production entrypoint: gunicorn/uvicorn run this as a bare `main` module
    # with the backend/ directory as the working directory (and on sys.path),
    # so unqualified imports resolve.
    from core.integrated_ss_api import app
except ModuleNotFoundError:
    # Test/import entrypoint: `from backend.main import app` from the repo
    # root, where `backend` is a package and `core` is not top-level importable.
    from backend.core.integrated_ss_api import app

if __name__ == "__main__":
    import uvicorn
    # Get port from environment variable or default to 8000
    # Binding to 0.0.0.0 is crucial for external access (Railway/Docker)
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
