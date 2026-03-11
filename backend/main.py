from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.routers import lobby, ws
from app.managers.connection import connection_manager
from app.managers.table import table_manager
from app.managers.game import game_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown - cleanup active games
    pass

app = FastAPI(title="Liar's Bar", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

app.include_router(lobby.router, prefix="/api")
app.include_router(ws.router)

# Serve React build in production
if settings.env == "prod" and os.path.isdir("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
