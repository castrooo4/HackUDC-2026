from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db.database import get_session
from app.models.user import User
from app.schemas.directory import DirectoryTreeResponse
from app.service.auth_dependencies import get_current_user
from app.service.directory_service import DirectoryService

router = APIRouter(prefix="/directories", tags=["directories"])
directory_service = DirectoryService()


@router.get("/tree", response_model=DirectoryTreeResponse)
def get_directory_tree(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return directory_service.build_tree(session, current_user.id)
