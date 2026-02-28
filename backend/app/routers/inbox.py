from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.db.database import get_session
from app.models.inbox_item import InboxStatus
from app.models.user import User
from app.schemas.inbox import (
    InboxConfirmOrganization,
    InboxCityRead,
    InboxCreate,
    InboxRead,
    InboxRecommendationRead,
    InboxUpdate,
    YouTubeRecommendationRead,
)
from app.service.auth_dependencies import get_current_user
from app.service.inbox_service import InboxService

router = APIRouter(prefix="/inbox", tags=["inbox"])
inbox_service = InboxService()


@router.post(
    "",
    response_model=InboxRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear item de inbox",
    description=(
        "Crea una captura en inbox por tipo.\n"
        "- TEXT: requiere content\n"
        "- YOUTUBE: requiere url\n"
        "- IMAGE: requiere url o file_base64\n"
        "- PDF: requiere url o file_base64\n"
        "- WEB: requiere url\n"
        "- location_lat y location_lon son opcionales, pero deben enviarse juntos\n"
        "- si se envian coordenadas, location_city se calcula automaticamente"
    ),
)
def create_inbox_item(
    payload: InboxCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        return inbox_service.create_item(
            session,
            user_id=current_user.id,
            payload=payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("", response_model=list[InboxRead], summary="Listar inbox")
def list_inbox_items(
    status_filter: InboxStatus | None = Query(default=None, alias="status"),
    city: str | None = Query(default=None, min_length=1, max_length=120),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return inbox_service.list_items(
        session,
        user_id=current_user.id,
        status_filter=status_filter,
        city=city,
    )


@router.get("/cities", response_model=list[InboxCityRead], summary="Listado de ciudades en inbox")
def list_inbox_cities(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rows = inbox_service.list_cities(session, user_id=current_user.id)
    return [InboxCityRead(city=city_name, item_count=count) for city_name, count in rows]


@router.get(
    "/recommendations/youtube",
    response_model=list[YouTubeRecommendationRead],
    summary="Recomendaciones YouTube del usuario",
)
def get_youtube_recommendations(
    current_url: str | None = Query(default=None, max_length=500),
    current_title: str | None = Query(default=None, max_length=300),
    current_channel: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=20, ge=1, le=20),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return inbox_service.get_youtube_recommendations(
        session,
        user_id=current_user.id,
        current_url=current_url,
        current_title=current_title,
        current_channel=current_channel,
        limit=limit,
    )


@router.get(
    "/cities/{city}/items",
    response_model=list[InboxRead],
    summary="Listar inbox por ciudad",
)
def list_inbox_items_by_city(
    city: str,
    status_filter: InboxStatus | None = Query(default=None, alias="status"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return inbox_service.list_items(
        session,
        user_id=current_user.id,
        status_filter=status_filter,
        city=city,
    )


@router.get("/{item_id}", response_model=InboxRead, summary="Detalle de item inbox")
def get_inbox_item(
    item_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    item = inbox_service.get_owned_item(session, item_id=item_id, user_id=current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="InboxItem not found")
    return item


@router.get(
    "/{item_id}/nearby",
    response_model=list[InboxRecommendationRead],
    summary="Inbox cercanos por id",
)
def get_nearby_items_by_id(
    item_id: int,
    radius_km: float = Query(default=25.0, gt=0, le=200),
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    base_item = inbox_service.get_owned_item(session, item_id=item_id, user_id=current_user.id)
    if not base_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="InboxItem not found")
    try:
        return inbox_service.get_recommendations_by_item_location(
            session,
            base_item=base_item,
            user_id=current_user.id,
            radius_km=radius_km,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.patch("/{item_id}", response_model=InboxRead, summary="Actualizar item inbox")
def update_inbox_item(
    item_id: int,
    payload: InboxUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    item = inbox_service.get_owned_item(session, item_id=item_id, user_id=current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="InboxItem not found")
    try:
        return inbox_service.update_item(session, item=item, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar item inbox")
def delete_inbox_item(
    item_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    item = inbox_service.get_owned_item(session, item_id=item_id, user_id=current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="InboxItem not found")
    inbox_service.delete_item(session, item=item)


@router.post("/{item_id}/confirm-organization", response_model=InboxRead, summary="Confirmar organizacion")
def confirm_inbox_item_organization(
    item_id: int,
    payload: InboxConfirmOrganization,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    item = inbox_service.get_owned_item(session, item_id=item_id, user_id=current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="InboxItem not found")
    try:
        return inbox_service.confirm_organization(
            session=session,
            user_id=current_user.id,
            item=item,
            payload=payload,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
