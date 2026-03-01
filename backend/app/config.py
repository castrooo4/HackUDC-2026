from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
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
    LLM_ENABLED: bool = True
    LLM_PROVIDER: str = "groq"
    LLM_TIMEOUT_SECONDS: float = 6.0
    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    GROQ_MODEL_TEXT: str = "llama-3.1-8b-instant"
    GROQ_MODEL_VISION: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    GEOCODER_ENABLED: bool = True
    GEOCODER_BASE_URL: str = "https://nominatim.openstreetmap.org/reverse"
    GEOCODER_FALLBACK_BASE_URL: str = "https://api.bigdatacloud.net/data/reverse-geocode-client"
    GEOCODER_TIMEOUT_SECONDS: float = 5.0
    GEOCODER_USER_AGENT: str = "kelea-digital-brain/1.0"
    ALLOW_INSECURE_SSL_FETCH: bool = False


settings = Settings()
