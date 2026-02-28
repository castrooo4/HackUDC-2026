from pydantic import BaseModel, Field


class DirectoryNode(BaseModel):
    id: int
    name: str
    children: list["DirectoryNode"] = Field(default_factory=list)
    item_ids: list[int] = Field(default_factory=list)
    items_count: int = 0


class DirectoryTreeResponse(BaseModel):
    roots: list[DirectoryNode]


DirectoryNode.model_rebuild()
