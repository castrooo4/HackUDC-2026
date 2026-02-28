from fastapi import APIRouter

from app.routers.inbox import router as inbox_router

api_router = APIRouter()
api_router.include_router(inbox_router)
