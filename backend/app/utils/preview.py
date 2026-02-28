import base64
import mimetypes
from io import BytesIO
from urllib.parse import urlparse

from PIL import Image, UnidentifiedImageError


def to_data_url(raw_bytes: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(raw_bytes).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def parse_data_url_base64(value: str) -> tuple[str | None, str]:
    if value.startswith("data:") and ";base64," in value:
        header, payload = value.split(",", 1)
        mime_type = header[5:].replace(";base64", "") or None
        return mime_type, payload
    return None, value


def decode_base64_payload(value: str) -> tuple[str | None, bytes]:
    mime_type, payload = parse_data_url_base64(value)
    raw = base64.b64decode(payload, validate=True)
    return mime_type, raw


def guess_mime_type_from_url(url: str) -> str | None:
    path = urlparse(url).path
    guessed, _ = mimetypes.guess_type(path)
    return guessed


def truncate_title(text: str, max_chars: int = 120) -> str:
    clean = " ".join(text.split()).strip()
    if len(clean) <= max_chars:
        return clean
    clipped = clean[:max_chars].rstrip()
    if " " in clipped:
        clipped = clipped.rsplit(" ", 1)[0]
    return clipped.strip()


def generate_title_from_text(content: str) -> str:
    words = content.split()
    selected = words[:12] if len(words) >= 8 else words[:8]
    candidate = " ".join(selected).strip()
    candidate = truncate_title(candidate, max_chars=120)
    return candidate if candidate else "Sin titulo"


def optimize_image_to_preview(
    raw_bytes: bytes,
    *,
    max_width: int,
    max_height: int,
    output_format: str = "JPEG",
    quality: int = 68,
) -> dict:
    try:
        image = Image.open(BytesIO(raw_bytes))
    except UnidentifiedImageError as exc:
        raise ValueError("Contenido de imagen no valido para previsualizacion") from exc

    original_width, original_height = image.size
    input_format = image.format
    image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

    if output_format.upper() == "JPEG":
        if image.mode in ("RGBA", "LA"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[-1])
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")
        save_kwargs = {"format": "JPEG", "quality": quality, "optimize": True, "progressive": True}
        mime_type = "image/jpeg"
    else:
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA")
        save_kwargs = {"format": "PNG", "optimize": True}
        mime_type = "image/png"

    output = BytesIO()
    image.save(output, **save_kwargs)
    optimized = output.getvalue()

    return {
        "data_url": to_data_url(optimized, mime_type),
        "mime_type": mime_type,
        "original_width": original_width,
        "original_height": original_height,
        "preview_width": image.width,
        "preview_height": image.height,
        "input_format": input_format,
        "preview_bytes": len(optimized),
    }
