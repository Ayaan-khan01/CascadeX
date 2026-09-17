import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Resolve and add backend directory to sys.path
_current_file = Path(__file__).resolve()
for _candidate in [
    _current_file.parent.parent / "backend",
    _current_file.parent / "backend",
    Path("/var/task/backend"),
    Path("/var/task"),
    Path.cwd() / "backend",
    Path.cwd(),
]:
    if _candidate.exists() and str(_candidate) not in sys.path:
        sys.path.insert(0, str(_candidate))

from app.main import app as backend_app

# Top-level FastAPI instance required by Vercel's build analyzer
app = FastAPI(
    title="CascadeX API",
    description="Urban Infrastructure Failure & Resilience Simulator",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all backend routes
app.include_router(backend_app.router)

# Alias routes without /api prefix as well for maximum proxy compatibility
for _route in list(backend_app.router.routes):
    if hasattr(_route, "path") and _route.path.startswith("/api/"):
        app.add_api_route(
            _route.path[4:],
            _route.endpoint,
            methods=list(_route.methods or ["GET"]),
            include_in_schema=False,
        )
