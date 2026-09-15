from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
import os

app = FastAPI(title="Construction Site Intelligence Platform MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to Construction Site Intelligence Platform MVP Backend"}

from app.routers import auth, projects, reports, detect, dashboard, assistant, comparisons
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(reports.router)
app.include_router(detect.router)
app.include_router(dashboard.router)
app.include_router(assistant.router)
app.include_router(comparisons.router)

