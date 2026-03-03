from datetime import datetime
from typing import Optional

from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

PASSWORD_MIN_LENGTH = 8


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(max_length=128)
    full_name: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, value: str) -> str:
        try:
            validated = validate_email(value.strip(), check_deliverability=False)
            return validated.normalized
        except EmailNotValidError as exc:
            raise ValueError("Introduce un email valido") from exc

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value) < PASSWORD_MIN_LENGTH:
            raise ValueError(f"La contrasena debe tener al menos {PASSWORD_MIN_LENGTH} caracteres")
        return value

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        return cleaned[:120] if cleaned else None


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, value: str) -> str:
        try:
            validated = validate_email(value.strip(), check_deliverability=False)
            return validated.normalized
        except EmailNotValidError as exc:
            raise ValueError("Introduce un email valido") from exc


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    email: EmailStr
    full_name: Optional[str]
    is_active: bool


class TokenRead(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
