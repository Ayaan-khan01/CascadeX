import os
import sys
import traceback
from pathlib import Path

# Add all candidate paths where 'backend' might reside in Vercel or local runtimes
current_file = Path(__file__).resolve()
candidate_dirs = [
    current_file.parent.parent / "backend",
    current_file.parent / "backend",
    Path("/var/task/backend"),
    Path("/var/task"),
    Path.cwd() / "backend",
    Path.cwd(),
]

for p in candidate_dirs:
    if p.exists() and str(p) not in sys.path:
        sys.path.insert(0, str(p))

try:
    from app.main import app as main_app

    # Ensure routes match both with and without '/api' prefix seamlessly
    existing_paths = {getattr(r, "path", None) for r in main_app.routes}
    for route in list(main_app.routes):
        path = getattr(route, "path", None)
        if path and path.startswith("/api/"):
            alt_path = path[4:]  # e.g., /api/health -> /health
            if alt_path not in existing_paths:
                main_app.add_api_route(
                    alt_path,
                    route.endpoint,
                    methods=list(route.methods or ["GET"]),
                    include_in_schema=False,
                )
                existing_paths.add(alt_path)

    app = main_app

except Exception as err:
    err_traceback = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI(title="CascadeX Startup Diagnostic")

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    def startup_error(path: str):
        task_files = []
        try:
            task_files = os.listdir("/var/task")
        except Exception:
            pass

        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend initialization failed",
                "exception": str(err),
                "traceback": err_traceback,
                "sys_path": sys.path,
                "task_files": task_files,
                "cwd": os.getcwd(),
            },
        )
