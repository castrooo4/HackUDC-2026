import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt
from sqlmodel import Session, select

from app.config import settings
from app.models.user import User

PBKDF2_ALGORITHM = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 210_000
SALT_BYTES = 16
DKLEN = 32


class AuthService:
    def hash_password(self, password: str) -> str:
        salt = secrets.token_bytes(SALT_BYTES)
        derived_key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            PBKDF2_ITERATIONS,
            dklen=DKLEN,
        )
        salt_b64 = base64.urlsafe_b64encode(salt).decode("ascii")
        hash_b64 = base64.urlsafe_b64encode(derived_key).decode("ascii")
        return f"{PBKDF2_ALGORITHM}${PBKDF2_ITERATIONS}${salt_b64}${hash_b64}"

    def verify_password(self, plain_password: str, password_hash: str) -> bool:
        try:
            algorithm, iterations_str, salt_b64, hash_b64 = password_hash.split("$", 3)
            if algorithm != PBKDF2_ALGORITHM:
                return False
            iterations = int(iterations_str)
            salt = base64.urlsafe_b64decode(salt_b64.encode("ascii"))
            expected_hash = base64.urlsafe_b64decode(hash_b64.encode("ascii"))
        except Exception:
            return False

        derived_key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt,
            iterations,
            dklen=len(expected_hash),
        )
        return hmac.compare_digest(derived_key, expected_hash)

    def create_access_token(self, *, subject: str) -> tuple[str, int]:
        expire_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_at = datetime.now(timezone.utc) + expire_delta
        payload = {
            "sub": subject,
            "exp": expires_at,
        }
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return token, int(expire_delta.total_seconds())

    def get_user_by_email(self, session: Session, email: str) -> Optional[User]:
        statement = select(User).where(User.email == email.lower())
        return session.exec(statement).first()

    def register_user(self, session: Session, *, email: str, password: str, full_name: str | None) -> User:
        user = User(
            email=email.lower(),
            full_name=full_name,
            password_hash=self.hash_password(password),
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
