from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.db.database import get_session
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenRead, UserRead
from app.service.auth_dependencies import get_current_user
from app.service.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
auth_service = AuthService()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, session: Session = Depends(get_session)):
    existing = auth_service.get_user_by_email(session, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email ya esta registrado",
        )
    user = auth_service.register_user(
        session,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
    )
    return user


@router.post("/login", response_model=TokenRead)
def login(payload: LoginRequest, session: Session = Depends(get_session)):
    user = auth_service.get_user_by_email(session, payload.email)
    if not user or not auth_service.verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas",
        )
    token, expires_in = auth_service.create_access_token(subject=str(user.id))
    return TokenRead(access_token=token, expires_in=expires_in)


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
