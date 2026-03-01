from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.health import router as health_router
from app.routers.router import api_router


def get_application() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, version="1.0.0")
    origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(api_router, prefix=settings.API_PREFIX)
    return app


app = get_application()
