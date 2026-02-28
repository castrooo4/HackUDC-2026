import base64
from io import BytesIO

from PIL import Image, ImageDraw
from sqlmodel import Session, delete, select

from app.db.database import engine
from app.models.directory import Directory
from app.models.inbox_item import InboxItem, InboxItemType
from app.models.user import User
from app.service.auth_service import AuthService
from app.service.directory_service import DirectoryService

DEMO_EMAIL = "test@gmail.com"
DEMO_PASSWORD = "test1234"
DEMO_FULL_NAME = "test"
CITY_A_CORUNA = "A Coruna"
CITY_SANTIAGO = "Santiago de Compostela"
CITY_MADRID = "Madrid"


def _make_image_data_url(
    width: int,
    height: int,
    bg_color: tuple[int, int, int],
    accent_color: tuple[int, int, int],
    fmt: str = "JPEG",
) -> str:
    image = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(image)
    draw.rectangle((16, 16, width - 16, height - 16), outline=accent_color, width=4)
    draw.rectangle((32, 32, width - 32, height - 32), outline=(255, 255, 255), width=2)
    buffer = BytesIO()
    image.save(buffer, format=fmt, quality=85)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    mime = "image/jpeg" if fmt.upper() == "JPEG" else "image/png"
    return f"data:{mime};base64,{encoded}"


def _root_dir_map(session: Session, user_id: int) -> dict[str, Directory]:
    roots = session.exec(
        select(Directory).where(Directory.user_id == user_id, Directory.parent_id.is_(None))
    ).all()
    return {directory.name: directory for directory in roots}


def _geo(city: str, lat: float, lon: float) -> dict[str, str | float]:
    return {
        "location_city": city,
        "location_lat": lat,
        "location_lon": lon,
    }


def seed():
    auth_service = AuthService()
    directory_service = DirectoryService()

    with Session(engine) as session:
        session.exec(delete(InboxItem))
        session.exec(delete(Directory))
        session.exec(delete(User))
        session.commit()

        user = auth_service.register_user(
            session,
            email=DEMO_EMAIL,
            password=DEMO_PASSWORD,
            full_name=DEMO_FULL_NAME,
        )
        directory_service.ensure_default_directories(session, user.id)

        youtube_preview = _make_image_data_url(
            width=640,
            height=360,
            bg_color=(180, 20, 20),
            accent_color=(230, 230, 230),
            fmt="JPEG",
        )
        image_preview = _make_image_data_url(
            width=800,
            height=500,
            bg_color=(30, 120, 200),
            accent_color=(255, 220, 80),
            fmt="JPEG",
        )
        pdf_preview = _make_image_data_url(
            width=700,
            height=980,
            bg_color=(240, 240, 240),
            accent_color=(80, 80, 80),
            fmt="JPEG",
        )
        favicon_preview = _make_image_data_url(
            width=128,
            height=128,
            bg_color=(20, 20, 20),
            accent_color=(0, 200, 130),
            fmt="PNG",
        )

        seed_items = [
            InboxItem(
                user_id=user.id,
                source="seed",
                item_type=InboxItemType.TEXT,
                title="Arquitectura API Kelea",
                content=(
                    "Documentacion tecnica de arquitectura de backend, capas de servicio, "
                    "routers y patrones para mantenibilidad."
                ),
                **_geo(CITY_A_CORUNA, 43.3623, -8.4115),
                metadata_json={"preview_kind": "text", "tags_hint": ["backend", "arquitectura", "docs"]},
            ),
            InboxItem(
                user_id=user.id,
                source="seed",
                item_type=InboxItemType.YOUTUBE,
                title="FastAPI Crash Course",
                content="Guia practica para construir APIs limpias con FastAPI.",
                url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                **_geo(CITY_A_CORUNA, 43.3630, -8.4100),
                preview_base64=youtube_preview,
                mime_type="video/youtube",
                metadata_json={
                    "video_id": "dQw4w9WgXcQ",
                    "preview_kind": "youtube",
                    "author_name": "Canal Demo",
                    "channel_name": "Canal Demo",
                    "description_excerpt": "Curso corto de FastAPI para backend.",
                    "duration_iso8601": "PT12M34S",
                    "upload_date": "2026-02-20",
                    "keywords": ["fastapi", "backend", "python"],
                    "view_count": 123456,
                    "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                },
            ),
            InboxItem(
                user_id=user.id,
                source="seed",
                item_type=InboxItemType.IMAGE,
                title="Wireframe Home",
                content="Diseño preliminar del dashboard principal.",
                url="https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg",
                **_geo(CITY_A_CORUNA, 43.3650, -8.4060),
                preview_base64=image_preview,
                mime_type="image/jpeg",
                metadata_json={
                    "preview_kind": "image",
                    "width": 800,
                    "height": 500,
                    "preview_width": 800,
                    "preview_height": 500,
                    "preview_bytes": len(image_preview),
                },
            ),
            InboxItem(
                user_id=user.id,
                source="seed",
                item_type=InboxItemType.PDF,
                title="API Design Notes",
                content="Notas de decisiones de diseño de API y convenciones.",
                url="https://arxiv.org/pdf/1706.03762.pdf",
                **_geo(CITY_MADRID, 40.4168, -3.7038),
                preview_base64=pdf_preview,
                mime_type="application/pdf",
                metadata_json={
                    "preview_kind": "pdf",
                    "pages": 12,
                    "pdf_title": "API Design Notes",
                    "preview_bytes": len(pdf_preview),
                },
            ),
            InboxItem(
                user_id=user.id,
                source="seed",
                item_type=InboxItemType.WEB,
                title="Python Docs",
                content="Referencia oficial de Python para librerias y guias.",
                url="https://www.python.org",
                **_geo(CITY_SANTIAGO, 42.8782, -8.5448),
                favicon_base64=favicon_preview,
                mime_type="text/html",
                metadata_json={
                    "preview_kind": "web",
                    "site_name": "Python",
                    "meta_description": "The official home of the Python Programming Language",
                    "og_description": "Learn more about Python and its ecosystem",
                    "og_type": "website",
                    "favicon_url": "https://www.python.org/favicon.ico",
                },
            ),
            InboxItem(
                user_id=user.id,
                source="seed",
                item_type=InboxItemType.TEXT,
                title="Ideas producto comunidad",
                content="Notas de producto para organizar eventos y medir engagement por ciudad.",
                **_geo(CITY_MADRID, 40.4210, -3.7000),
                metadata_json={"preview_kind": "text", "tags_hint": ["producto", "comunidad"]},
            ),
        ]

        created_ids: list[int] = []
        for item in seed_items:
            session.add(item)
            session.commit()
            session.refresh(item)
            directory_service.suggest_directory_for_item(session, user.id, item)
            created_ids.append(item.id)

        # Confirmamos algunos para mostrar ambos estados en frontend.
        text_item = session.get(InboxItem, created_ids[0])
        yt_item = session.get(InboxItem, created_ids[1])
        pdf_item = session.get(InboxItem, created_ids[3])
        if text_item:
            directory_service.confirm_item_directory(session, user.id, text_item, directory_name="Kelea Docs")
        if yt_item:
            directory_service.confirm_item_directory(session, user.id, yt_item, directory_name="Aprendizaje")
        if pdf_item:
            dir_map = _root_dir_map(session, user.id)
            document_dir = dir_map.get("Documentos")
            if document_dir:
                directory_service.confirm_item_directory(
                    session, user.id, pdf_item, directory_id=document_dir.id
                )

        all_items = session.exec(select(InboxItem).where(InboxItem.user_id == user.id)).all()
        processed = len([item for item in all_items if item.status.value == "PROCESSED"])
        organized = len([item for item in all_items if item.status.value == "ORGANIZED"])
        print(
            f"Seed done: user={DEMO_EMAIL}, inbox_total={len(all_items)}, "
            f"processed={processed}, organized={organized}"
        )
        city_counts: dict[str, int] = {}
        for item in all_items:
            if item.location_city:
                city_counts[item.location_city] = city_counts.get(item.location_city, 0) + 1
        print(f"Cities distribution: {city_counts}")
        print(f"Login demo -> email: {DEMO_EMAIL} | password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    seed()

