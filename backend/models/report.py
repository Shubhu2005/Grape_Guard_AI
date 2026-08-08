from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReportCreate(BaseModel):
    farmer_id: str
    image_url: Optional[str] = ""
    disease_name: Optional[str] = ""
    mongo_doc_id: Optional[str] = ""
    status: str = "pending"

class ReportUpdate(BaseModel):
    status: str                        # "verified" or "rejected"
    expert_id: str
    expert_comment: Optional[str] = ""

class ReportResponse(BaseModel):
    id: str
    farmer_id: str
    status: str
    disease_name: Optional[str]
    expert_comment: Optional[str]
    created_at: Optional[datetime]