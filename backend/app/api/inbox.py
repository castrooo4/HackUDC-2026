from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from summa.summarizer import summarize

from app.db.database import get_session
from app.models.inbox_item import InboxItem
from app.schemas.inbox import InboxCreate, InboxRead, InboxUpdate

router = APIRouter(prefix="/inbox", tags=["inbox"])


def _truncate_title(text: str, max_chars: int = 120) -> str:
    clean = " ".join(text.split()).strip()
    if len(clean) <= max_chars:
        return clean
    clipped = clean[:max_chars].rstrip()
    if " " in clipped:
        clipped = clipped.rsplit(" ", 1)[0]
    return clipped.strip()


def generate_title_from_content(content: str) -> str:
    try:
        summary = summarize(content, words=12)
        if summary:
            title = " ".join(summary.split()[:12])
            title = _truncate_title(title, max_chars=120)
            if title:
                return title
    except Exception:
        pass

    words = content.split()
    selected = words[:12]
    if len(selected) < 8:
        selected = words[:8]
    generated = " ".join(selected).strip()
    generated = _truncate_title(generated, max_chars=120)
    return generated if generated else "Sin titulo"


@router.post("", response_model=InboxRead, status_code=status.HTTP_201_CREATED)
def create_inbox_item(
    payload: InboxCreate,
    session: Session = Depends(get_session),
):
    title = payload.title or generate_title_from_content(payload.content)
    item = InboxItem(
        source=payload.source,
        title=title,
        content=payload.content,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.get("", response_model=list[InboxRead])
def list_inbox_items(session: Session = Depends(get_session)):
    statement = select(InboxItem).order_by(InboxItem.created_at.desc())
    items = session.exec(statement).all()
    return items


@router.get("/{item_id}", response_model=InboxRead)
def get_inbox_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(InboxItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="InboxItem not found")
    return item


@router.patch("/{item_id}", response_model=InboxRead)
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


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inbox_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(InboxItem, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="InboxItem not found")

    session.delete(item)
    session.commit()
