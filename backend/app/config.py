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
        "http://localhost,http://localhost:3000,http://localhost:5173,"
        "http://127.0.0.1,http://127.0.0.1:3000,http://127.0.0.1:5173"
    )
    DATABASE_URL: str = "sqlite:///./kelea.db"


settings = Settings()
