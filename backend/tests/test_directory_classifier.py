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

    image_messages = classifier._build_messages(image_item, ["Trabajo", "Documentos"])
    pdf_messages = classifier._build_messages(pdf_item, ["Trabajo", "Documentos"])

    assert image_messages[1]["content"][1]["type"] == "image_url"
    assert image_messages[1]["content"][1]["image_url"]["url"] == image_data
    assert pdf_messages[1]["content"][1]["type"] == "image_url"
    assert pdf_messages[1]["content"][1]["image_url"]["url"] == image_data


def test_build_messages_text_only_for_text_items():
    classifier = DirectoryClassifier()
    text_item = _build_item(InboxItemType.TEXT, content="nota simple")

    messages = classifier._build_messages(text_item, ["Trabajo"])
    assert len(messages[1]["content"]) == 1
    assert messages[1]["content"][0]["type"] == "text"


def test_suggest_with_groq_returns_existing_match(monkeypatch):
    classifier = DirectoryClassifier()
    item = _build_item(InboxItemType.TEXT, content="facturas y pagos del mes")

    monkeypatch.setattr("app.service.directory_classifier.settings.LLM_ENABLED", True)
    monkeypatch.setattr("app.service.directory_classifier.settings.LLM_PROVIDER", "groq")
    monkeypatch.setattr("app.service.directory_classifier.settings.GROQ_API_KEY", "test-key")
    monkeypatch.setattr(
        "app.service.directory_classifier.requests.post",
        lambda *args, **kwargs: MockGroqResponse(
            {"choices": [{"message": {"content": '{"directory_name":"Finanzas"}'}}]}
        ),
    )

    result = classifier.suggest_directory_name(item, ["Trabajo", "Finanzas"])
    assert result == "Finanzas"


def test_suggest_with_groq_non_existing_falls_back_to_existing(monkeypatch):
    classifier = DirectoryClassifier()
    item = _build_item(InboxItemType.TEXT, content="tema de producto")

    monkeypatch.setattr("app.service.directory_classifier.settings.LLM_ENABLED", True)
    monkeypatch.setattr("app.service.directory_classifier.settings.LLM_PROVIDER", "groq")
    monkeypatch.setattr("app.service.directory_classifier.settings.GROQ_API_KEY", "test-key")
    monkeypatch.setattr(
        "app.service.directory_classifier.requests.post",
        lambda *args, **kwargs: MockGroqResponse(
            {"choices": [{"message": {"content": '{"directory_name":"Innovacion"}'}}]}
        ),
    )

    result = classifier.suggest_directory_name(item, ["Trabajo", "Personal", "Finanzas", "Documentos"])
    assert result in {"Trabajo", "Personal", "Finanzas", "Documentos"}


def test_suggest_when_llm_disabled_uses_existing_fallback(monkeypatch):
    classifier = DirectoryClassifier()
    item = _build_item(InboxItemType.PDF, content="manual tecnico")

    monkeypatch.setattr("app.service.directory_classifier.settings.LLM_ENABLED", False)
    result = classifier.suggest_directory_name(item, ["Trabajo", "Documentos"])
    assert result == "Documentos"


def test_resolve_to_existing_is_case_insensitive():
    classifier = DirectoryClassifier()
    resolved = classifier._resolve_to_existing("trabajo", ["Trabajo", "Personal"])
    assert resolved == "Trabajo"


def test_fallback_returns_first_existing_when_preferred_missing():
    classifier = DirectoryClassifier()
    item = _build_item(InboxItemType.IMAGE, content="captura")
    result = classifier._fallback_directory(item, ["Kelea Docs", "Producto"])
    assert result == "Kelea Docs"
