import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, users, goals, posts, reactions, friends, notifications, blocks

logger = logging.getLogger(__name__)

app = FastAPI(title="Streakd API", version="1.0.0")

# Warn on insecure defaults at startup
for warning in settings.validate_secrets():
    logger.warning(f"[SECURITY] {warning}")

# CORS — don't allow wildcard with credentials in production
cors_origins = settings.CORS_ORIGINS
allow_credentials = True
if cors_origins == ["*"]:
    # Browsers ignore credentials when origin is *, so this is safe as a dev fallback.
    # In production, set CORS_ORIGINS to your actual domain(s) in .env.
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(goals.router)
app.include_router(posts.router)
app.include_router(reactions.router)
app.include_router(friends.router)
app.include_router(notifications.router)
app.include_router(blocks.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
