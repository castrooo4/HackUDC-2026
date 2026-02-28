import json
import re

import requests

from app.config import settings
from app.models.inbox_item import InboxItem, InboxItemType


class DirectoryClassifier:
    def suggest_directory_name(self, item: InboxItem, existing_root_directories: list[str]) -> str:
        suggestion = self._suggest_with_groq(item, existing_root_directories)
        if suggestion:
            return suggestion
        return self._fallback_directory(item)

    def _suggest_with_groq(self, item: InboxItem, existing_root_directories: list[str]) -> str | None:
        if not settings.LLM_ENABLED:
            return None
        if settings.LLM_PROVIDER.lower() != "groq":
            return None
        if not settings.GROQ_API_KEY:
            return None

        model = self._select_groq_model(item)
        messages = self._build_messages(item, existing_root_directories)

        try:
            response = requests.post(
                f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "temperature": 0.2,
                    "max_tokens": 80,
                    "response_format": {"type": "json_object"},
                    "messages": messages,
                },
                timeout=settings.LLM_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            payload = response.json()
            content = payload["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            raw_name = parsed.get("directory_name")
            if not isinstance(raw_name, str):
                return None
            sanitized = self._sanitize_name(raw_name)
            return sanitized or None
        except Exception:
            return None

    def _select_groq_model(self, item: InboxItem) -> str:
        if item.item_type in {InboxItemType.IMAGE, InboxItemType.PDF}:
            return settings.GROQ_MODEL_VISION or settings.GROQ_MODEL
        return settings.GROQ_MODEL_TEXT or settings.GROQ_MODEL

    def _build_messages(self, item: InboxItem, existing_root_directories: list[str]) -> list[dict]:
        system_prompt = (
            "Eres un clasificador de carpetas para un inbox personal.\n"
            "Objetivo: elegir EXACTAMENTE una carpeta destino.\n"
            "Salida obligatoria: SOLO JSON valido con esta forma "
            '{"directory_name":"<nombre_carpeta>"}.\n'
            "Reglas estrictas:\n"
            "1) Usa carpeta existente SOLO si el encaje semantico es fuerte y especifico.\n"
            "2) Si el encaje con existentes es debil o ambiguo, crea una carpeta nueva.\n"
            "3) No fuerces categorias genericas (ej. Trabajo/Personal) cuando el tema es mas especifico.\n"
            "4) Nombre corto y reusable (1-2 palabras), sin '/' ni jerarquia.\n"
            "5) No expliques nada fuera del JSON.\n"
            "6) Si creas carpeta nueva, usa un nombre tematico claro basado en el contenido.\n"
            "7) Prioriza el texto principal y los metadatos sobre el titulo."
        )
        classification_text = self._build_classification_text(item)
        text_context = (
            f"Carpetas existentes: {existing_root_directories}\n"
            f"Tipo: {item.item_type.value}\n"
            f"Titulo: {item.title or ''}\n"
            f"Texto principal para clasificar: {classification_text}\n"
            f"URL: {item.url or ''}\n"
            f"Metadata: {json.dumps(item.metadata_json or {}, ensure_ascii=False)}\n"
            "Devuelve solo el JSON final."
        )

        user_content: list[dict] = [{"type": "text", "text": text_context}]
        preview_image = self._pick_preview_image(item)
        if preview_image:
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": preview_image},
                }
            )

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

    def _build_classification_text(self, item: InboxItem) -> str:
        parts: list[str] = []
        if item.content:
            parts.append(item.content)

        metadata = item.metadata_json or {}
        prioritized_keys = [
            "description_excerpt",
            "og_description",
            "meta_description",
            "summary",
            "keywords",
            "channel_name",
            "author_name",
            "site_name",
        ]
        for key in prioritized_keys:
            value = metadata.get(key)
            if isinstance(value, str) and value.strip():
                parts.append(value.strip())
            elif isinstance(value, list) and value:
                joined = ", ".join(str(v) for v in value if str(v).strip())
                if joined:
                    parts.append(joined)

        if not parts:
            return item.title or ""

        merged = " | ".join(parts)
        if len(merged) <= 1200:
            return merged
        return merged[:1200].rstrip() + "..."

    def _pick_preview_image(self, item: InboxItem) -> str | None:
        if item.item_type in {InboxItemType.IMAGE, InboxItemType.PDF, InboxItemType.YOUTUBE}:
            if item.preview_base64 and item.preview_base64.startswith("data:image/"):
                return item.preview_base64

        if item.item_type == InboxItemType.WEB:
            if item.favicon_base64 and item.favicon_base64.startswith("data:image/"):
                return item.favicon_base64
            if item.preview_base64 and item.preview_base64.startswith("data:image/"):
                return item.preview_base64

        return None

    def _sanitize_name(self, name: str) -> str:
        compact = re.sub(r"\s+", " ", name).strip()
        compact = compact.replace("/", " ")
        safe = re.sub(r"[^0-9A-Za-z _-]", "", compact).strip()
        if not safe:
            return ""
        words = [word for word in safe.split(" ") if word]
        short = " ".join(words[:2])
        return short[:40]

    def _fallback_directory(self, item: InboxItem) -> str:
        # Fallback tecnico: solo se usa si el LLM falla/no esta disponible.
        # No clasifica por categorias semanticas predefinidas para evitar sesgos.
        return self._derive_new_directory_name(item)

    def _derive_new_directory_name(self, item: InboxItem) -> str:
        type_defaults = {
            InboxItemType.TEXT: "Notas",
            InboxItemType.YOUTUBE: "Videos",
            InboxItemType.IMAGE: "Imagenes",
            InboxItemType.PDF: "Documentos",
            InboxItemType.WEB: "Enlaces",
        }
        source_text = ((item.title or "") + " " + (item.content or "")).strip()
        if not source_text:
            return type_defaults.get(item.item_type, "Inbox")

        clean = re.sub(r"[^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]", " ", source_text)
        words = [word for word in re.split(r"\s+", clean) if word]

        stopwords = {
            "de",
            "la",
            "el",
            "los",
            "las",
            "y",
            "o",
            "en",
            "para",
            "por",
            "con",
            "del",
            "al",
            "the",
            "and",
            "for",
            "with",
            "from",
            "this",
            "that",
        }
        useful = [word for word in words if len(word) > 2 and word.lower() not in stopwords]
        if not useful:
            return type_defaults.get(item.item_type, "Inbox")

        candidate = " ".join(useful[:2]).strip().title()
        return candidate[:40] if candidate else type_defaults.get(item.item_type, "Inbox")
