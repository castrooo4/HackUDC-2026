from app.models.inbox_item import InboxItem, InboxItemType
from app.service.directory_classifier import DirectoryClassifier


class MockGroqResponse:
    def __init__(self, payload: dict, status_code: int = 200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


def _build_item(
    item_type: InboxItemType,
    *,
    title: str = "",
    content: str = "",
    preview_base64: str | None = None,
    favicon_base64: str | None = None,
    metadata_json: dict | None = None,
):
    return InboxItem(
        user_id=1,
        source="extension",
        item_type=item_type,
        title=title or None,
        content=content,
        preview_base64=preview_base64,
        favicon_base64=favicon_base64,
        metadata_json=metadata_json or {},
    )


def test_select_model_text_and_vision(monkeypatch):
    classifier = DirectoryClassifier()
    monkeypatch.setattr("app.service.directory_classifier.settings.GROQ_MODEL_TEXT", "text-model")
    monkeypatch.setattr("app.service.directory_classifier.settings.GROQ_MODEL_VISION", "vision-model")
    monkeypatch.setattr("app.service.directory_classifier.settings.GROQ_MODEL", "legacy-model")

    assert classifier._select_groq_model(_build_item(InboxItemType.TEXT)) == "text-model"
    assert classifier._select_groq_model(_build_item(InboxItemType.WEB)) == "text-model"
    assert classifier._select_groq_model(_build_item(InboxItemType.IMAGE)) == "vision-model"
    assert classifier._select_groq_model(_build_item(InboxItemType.PDF)) == "vision-model"


def test_build_messages_adds_image_for_image_and_pdf():
    classifier = DirectoryClassifier()
    image_data = "data:image/jpeg;base64,abc123"
    image_item = _build_item(InboxItemType.IMAGE, preview_base64=image_data)
    pdf_item = _build_item(InboxItemType.PDF, preview_base64=image_data)

    image_messages = classifier._build_messages(image_item, ["Trabajo", "Otros"])
    pdf_messages = classifier._build_messages(pdf_item, ["Trabajo", "Otros"])

    assert image_messages[1]["content"][1]["type"] == "image_url"
    assert image_messages[1]["content"][1]["image_url"]["url"] == image_data
    assert pdf_messages[1]["content"][1]["type"] == "image_url"
    assert pdf_messages[1]["content"][1]["image_url"]["url"] == image_data


def test_build_messages_uses_favicon_for_web_when_available():
    classifier = DirectoryClassifier()
    icon_data = "data:image/png;base64,icon123"
    web_item = _build_item(InboxItemType.WEB, favicon_base64=icon_data)

    messages = classifier._build_messages(web_item, ["Trabajo"])
    assert messages[1]["content"][1]["type"] == "image_url"
    assert messages[1]["content"][1]["image_url"]["url"] == icon_data


def test_build_messages_text_only_for_text_items():
    classifier = DirectoryClassifier()
    text_item = _build_item(InboxItemType.TEXT, content="nota simple")

    messages = classifier._build_messages(text_item, ["Trabajo"])
    assert len(messages[1]["content"]) == 1
    assert messages[1]["content"][0]["type"] == "text"


def test_build_messages_prioritizes_content_and_metadata():
    classifier = DirectoryClassifier()
    item = _build_item(
        InboxItemType.WEB,
        title="Titulo corto",
        content="Contenido principal detallado",
        metadata_json={
            "og_description": "Descripcion OG importante",
            "keywords": ["backend", "arquitectura"],
        },
    )
    messages = classifier._build_messages(item, ["Trabajo"])
    text_block = messages[1]["content"][0]["text"]
    assert "Texto principal para clasificar" in text_block
    assert "Contenido principal detallado" in text_block
    assert "Descripcion OG importante" in text_block


def test_suggest_with_groq_success_and_sanitization(monkeypatch):
    classifier = DirectoryClassifier()
    item = _build_item(InboxItemType.TEXT, content="facturas y pagos del mes")

    monkeypatch.setattr("app.service.directory_classifier.settings.LLM_ENABLED", True)
    monkeypatch.setattr("app.service.directory_classifier.settings.LLM_PROVIDER", "groq")
    monkeypatch.setattr("app.service.directory_classifier.settings.GROQ_API_KEY", "test-key")
    monkeypatch.setattr(
        "app.service.directory_classifier.requests.post",
        lambda *args, **kwargs: MockGroqResponse(
            {"choices": [{"message": {"content": '{"directory_name":"  Finanzas/2026 !!!  "}'}}]}
        ),
    )

    result = classifier.suggest_directory_name(item, ["Trabajo", "Finanzas"])
    assert result == "Finanzas 2026"


def test_suggest_with_groq_invalid_json_falls_back(monkeypatch):
    classifier = DirectoryClassifier()
    item = _build_item(InboxItemType.PDF, title="Manual de API", content="")

    monkeypatch.setattr("app.service.directory_classifier.settings.LLM_ENABLED", True)
    monkeypatch.setattr("app.service.directory_classifier.settings.LLM_PROVIDER", "groq")
    monkeypatch.setattr("app.service.directory_classifier.settings.GROQ_API_KEY", "test-key")
    monkeypatch.setattr(
        "app.service.directory_classifier.requests.post",
        lambda *args, **kwargs: MockGroqResponse(
            {"choices": [{"message": {"content": "not-json"}}]}
        ),
    )

    result = classifier.suggest_directory_name(item, ["Trabajo", "Documentos"])
    assert isinstance(result, str)
    assert result
    assert "/" not in result


def test_suggest_when_llm_disabled_falls_back(monkeypatch):
    classifier = DirectoryClassifier()
    item = _build_item(InboxItemType.TEXT, content="pago de impuestos trimestral")

    monkeypatch.setattr("app.service.directory_classifier.settings.LLM_ENABLED", False)
    result = classifier.suggest_directory_name(item, ["Finanzas", "Otros"])
    assert isinstance(result, str)
    assert result


def test_fallback_derives_new_directory_name_not_general():
    classifier = DirectoryClassifier()
    item = _build_item(
        InboxItemType.TEXT,
        title="benchmark embeddings semanticos",
        content="comparativa para ranking y recall",
    )
    result = classifier._fallback_directory(item)
    assert result != "General"
    assert isinstance(result, str)
    assert result


def test_fallback_uses_type_default_when_text_is_empty():
    classifier = DirectoryClassifier()
    image_item = _build_item(InboxItemType.IMAGE, title="", content="")
    web_item = _build_item(InboxItemType.WEB, title="", content="")

    assert classifier._fallback_directory(image_item) == "Imagenes"
    assert classifier._fallback_directory(web_item) == "Enlaces"


def test_fallback_does_not_force_existing_directory(monkeypatch):
    classifier = DirectoryClassifier()
    item = _build_item(
        InboxItemType.TEXT,
        title="Arquitectura servidor",
        content="En kelea estamos usando una documentacion de la arquitectura del servidor",
    )
    monkeypatch.setattr("app.service.directory_classifier.settings.LLM_ENABLED", False)
    result = classifier.suggest_directory_name(item, ["Kelea Docs", "Trabajo"])
    assert isinstance(result, str)
    assert result
    assert result not in {"Kelea Docs", "Trabajo"}


def test_llm_suggestion_is_not_overridden_by_existing_match(monkeypatch):
    classifier = DirectoryClassifier()
    item = _build_item(
        InboxItemType.TEXT,
        title="Arquitectura servidor",
        content="Documento tecnico detallado para backend",
    )

    monkeypatch.setattr(
        classifier,
        "_suggest_with_groq",
        lambda item, existing: "Arquitectura Backend",
    )
    result = classifier.suggest_directory_name(item, ["Trabajo", "Documentos"])
    assert result == "Arquitectura Backend"
