import sys
from pathlib import Path
from starlette.types import ASGIApp, Scope, Receive, Send

# Add backend directory to sys.path so 'app' and its submodules can be resolved
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app as _fastapi_app


class PathPrefixMiddleware:
    """Ensures requests match FastAPI routes whether the /api prefix was stripped by a proxy or retained."""

    def __init__(self, inner: ASGIApp):
        self.inner = inner

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] in ("http", "websocket"):
            path = scope.get("path", "")
            if not path.startswith("/api"):
                scope = dict(scope)
                scope["path"] = f"/api{path}"
        await self.inner(scope, receive, send)


app = PathPrefixMiddleware(_fastapi_app)
