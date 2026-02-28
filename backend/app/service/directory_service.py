from collections import defaultdict

from sqlmodel import Session, select

from app.models.directory import Directory
from app.models.inbox_item import InboxItem, InboxStatus
from app.schemas.directory import DirectoryNode, DirectoryTreeResponse
from app.service.directory_classifier import DirectoryClassifier

DEFAULT_DIRECTORY_NAMES = ["Trabajo", "Personal", "Finanzas", "Documentos"]


class DirectoryService:
    def __init__(self):
        self.classifier = DirectoryClassifier()

    def ensure_default_directories(self, session: Session, user_id: int) -> int:
        existing = session.exec(
            select(Directory).where(Directory.user_id == user_id, Directory.parent_id.is_(None))
        ).all()
        existing_names = {directory.name.lower() for directory in existing}
        created = 0

        for name in DEFAULT_DIRECTORY_NAMES:
            if name.lower() in existing_names:
                continue
            session.add(Directory(user_id=user_id, name=name, parent_id=None))
            created += 1

        if created:
            session.commit()
        return created

    def suggest_directory_for_item(self, session: Session, user_id: int, item: InboxItem) -> InboxItem:
        self.ensure_default_directories(session, user_id)
        root_directories = session.exec(
            select(Directory).where(Directory.user_id == user_id, Directory.parent_id.is_(None))
        ).all()
        existing_names = [directory.name for directory in root_directories]
        directory_name = self.classifier.suggest_directory_name(item, existing_names)
        directory_name = self._resolve_existing_name(directory_name, existing_names)
        directory = self._get_or_create_root_directory(session, user_id, directory_name)

        item.directory_id = directory.id
        item.status = InboxStatus.PROCESSED
        session.add(item)
        session.commit()
        session.refresh(item)
        return item

    def confirm_item_directory(
        self,
        session: Session,
        user_id: int,
        item: InboxItem,
        directory_id: int | None = None,
        directory_name: str | None = None,
    ) -> InboxItem:
        target_directory = None
        if directory_id is not None:
            target_directory = self.get_directory_by_id(session, user_id, directory_id)
            if not target_directory:
                raise ValueError("Directory not found")
        elif directory_name:
            target_directory = self.get_or_create_directory_by_name(session, user_id, directory_name)
        elif item.directory_id:
            target_directory = self.get_directory_by_id(session, user_id, item.directory_id)

        if not target_directory:
            raise ValueError("No directory available to confirm")

        item.directory_id = target_directory.id
        item.status = InboxStatus.ORGANIZED
        session.add(item)
        session.commit()
        session.refresh(item)
        return item

    def build_tree(self, session: Session, user_id: int) -> DirectoryTreeResponse:
        directories = session.exec(select(Directory).where(Directory.user_id == user_id)).all()
        items = session.exec(
            select(InboxItem).where(InboxItem.user_id == user_id, InboxItem.directory_id.is_not(None))
        ).all()

        nodes_by_id = {
            directory.id: DirectoryNode(
                id=directory.id,
                name=directory.name,
                children=[],
                item_ids=[],
                items_count=0,
            )
            for directory in directories
        }

        children_by_parent: dict[int | None, list[int]] = defaultdict(list)
        for directory in directories:
            children_by_parent[directory.parent_id].append(directory.id)

        for parent_id, children_ids in children_by_parent.items():
            if parent_id is None:
                continue
            parent_node = nodes_by_id.get(parent_id)
            if not parent_node:
                continue
            ordered_children = sorted(children_ids, key=lambda child_id: nodes_by_id[child_id].name.lower())
            parent_node.children.extend(nodes_by_id[child_id] for child_id in ordered_children)

        for item in items:
            if item.directory_id in nodes_by_id:
                node = nodes_by_id[item.directory_id]
                node.item_ids.append(item.id)
                node.items_count += 1

        root_ids = sorted(children_by_parent[None], key=lambda directory_id: nodes_by_id[directory_id].name.lower())
        return DirectoryTreeResponse(roots=[nodes_by_id[directory_id] for directory_id in root_ids])

    def _resolve_existing_name(self, suggested_name: str, existing_names: list[str]) -> str:
        if not suggested_name.strip():
            return "Inbox"

        normalized_suggested = suggested_name.strip().lower()
        for name in existing_names:
            if name.lower() == normalized_suggested:
                return name
        return suggested_name

    def _get_or_create_root_directory(self, session: Session, user_id: int, name: str) -> Directory:
        statement = select(Directory).where(
            Directory.user_id == user_id,
            Directory.parent_id.is_(None),
            Directory.name == name,
        )
        existing = session.exec(statement).first()
        if existing:
            return existing

        directory = Directory(user_id=user_id, name=name, parent_id=None)
        session.add(directory)
        session.commit()
        session.refresh(directory)
        return directory

    def get_or_create_directory_by_name(self, session: Session, user_id: int, name: str) -> Directory:
        normalized = " ".join(name.split()).strip()
        if not normalized:
            normalized = "Inbox"

        existing = session.exec(
            select(Directory).where(
                Directory.user_id == user_id,
                Directory.parent_id.is_(None),
                Directory.name == normalized,
            )
        ).first()
        if existing:
            return existing

        for candidate in session.exec(
            select(Directory).where(Directory.user_id == user_id, Directory.parent_id.is_(None))
        ).all():
            if candidate.name.lower() == normalized.lower():
                return candidate

        return self._get_or_create_root_directory(session, user_id, normalized)

    def get_directory_by_id(self, session: Session, user_id: int, directory_id: int) -> Directory | None:
        return session.exec(
            select(Directory).where(
                Directory.id == directory_id,
                Directory.user_id == user_id,
            )
        ).first()
