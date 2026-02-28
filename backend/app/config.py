from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    APP_NAME: str = "Kelea Digital Brain - MVP"
    API_PREFIX: str = ""
    CORS_ORIGINS: str = (
        "http://localhost,http://localhost:3000,http://localhost:4173,http://localhost:5173,http://localhost:8080,"
        "http://127.0.0.1,http://127.0.0.1:3000,http://127.0.0.1:4173,http://127.0.0.1:5173,http://127.0.0.1:8080"
    )
    DATABASE_URL: str = "sqlite:///./kelea.db"
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60


settings = Settings()
