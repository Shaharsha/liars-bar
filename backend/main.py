from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.routers import lobby, ws

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Liar's Bar", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SPA fallback middleware — must be added before static files mount
if settings.env == "prod" and os.path.isdir("static"):
    class SPAMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            response = await call_next(request)
            path = request.url.path
            # If 404 and not an API/WS route, serve index.html
            if response.status_code == 404 and not path.startswith(("/api", "/ws")):
                return FileResponse("static/index.html")
            return response

    app.add_middleware(SPAMiddleware)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

app.include_router(lobby.router, prefix="/api")
app.include_router(ws.router)

# Serve React build static files in production
if settings.env == "prod" and os.path.isdir("static"):
    app.mount("/", StaticFiles(directory="static"), name="static")
