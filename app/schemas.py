from datetime import datetime
from pydantic import BaseModel


class LinkBase(BaseModel):
    codigo: str
    url_original: str


class LinkCreate(LinkBase):
    pass


class LinkRead(LinkBase):
    id: int
    total_cliques: int
    criado_em: datetime

    model_config = {"from_attributes": True}