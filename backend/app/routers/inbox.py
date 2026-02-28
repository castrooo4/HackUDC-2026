from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db.database import get_session
from app.models.inbox_item import InboxItem
from app.schemas.inbox import InboxCreate, InboxRead, InboxUpdate
from app.service.inbox_ingest_service import InboxIngestionService

router = APIRouter(prefix="/inbox", tags=["inbox"])
ingestion_service = InboxIngestionService()


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
        "- WEB: requiere url"
    ),
)
def create_inbox_item(payload: InboxCreate, session: Session = Depends(get_session)):
    try:
        processed = ingestion_service.process(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    item = InboxItem(
        source=payload.source,
        item_type=payload.item_type,
        title=processed.title,
        content=processed.content,
        url=processed.url,
        preview_base64=processed.preview_base64,
        favicon_base64=processed.favicon_base64,
        mime_type=processed.mime_type,
        metadata_json=processed.metadata_json,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.get("", response_model=list[InboxRead], summary="Listar inbox")
def list_inbox_items(session: Session = Depends(get_session)):
    statement = select(InboxItem).order_by(InboxItem.created_at.desc())
    items = session.exec(statement).all()
    return items


@router.get("/{item_id}", response_model=InboxRead, summary="Detalle de item inbox")
def get_inbox_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(InboxItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="InboxItem not found")
    return item


@router.patch("/{item_id}", response_model=InboxRead, summary="Actualizar item inbox")
def update_inbox_item(
    item_id: int,
    payload: InboxUpdate,
    session: Session = Depends(get_session),
):
    item = session.get(InboxItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="InboxItem not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar item inbox")
def delete_inbox_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(InboxItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="InboxItem not found")

    session.delete(item)
    session.commit()
