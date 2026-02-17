from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, users, goals, posts, reactions, friends

app = FastAPI(title="Streakd API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(goals.router)
app.include_router(posts.router)
app.include_router(reactions.router)
app.include_router(friends.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
