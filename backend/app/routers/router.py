from fastapi import APIRouter

from app.routers.auth import router as auth_router
from app.routers.directory import router as directory_router
from app.routers.inbox import router as inbox_router
from app.routers.telegram import router as telegram_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(inbox_router)
api_router.include_router(directory_router)
api_router.include_router(telegram_router)
