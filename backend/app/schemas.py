from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from app.models import RoleEnum, ProjectStatusEnum, ReportTypeEnum

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: RoleEnum = RoleEnum.site_user

class UserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: RoleEnum
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserResponse] = None

class ProjectCreate(BaseModel):
    name: str
    status: ProjectStatusEnum = ProjectStatusEnum.active

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[ProjectStatusEnum] = None

class ProjectResponse(BaseModel):
    id: UUID
    name: str
    status: ProjectStatusEnum
    created_by: UUID
    created_at: datetime
    sites_count: Optional[int] = 0

    class Config:
        from_attributes = True

class SiteCreate(BaseModel):
    name: str

class SiteResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    created_at: datetime
    reports_count: Optional[int] = 0

    class Config:
        from_attributes = True

class ReportCreate(BaseModel):
    type: ReportTypeEnum
    text: str

class DetectionResponse(BaseModel):
    id: UUID
    class_name: str
    confidence: float
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float

    class Config:
        from_attributes = True

class ImageResponse(BaseModel):
    id: UUID
    url: str
    ai_label: Optional[str] = None
    ai_confidence: Optional[float] = None
    created_at: datetime
    detections: List[DetectionResponse] = []

    class Config:
        from_attributes = True

class ReportResponse(BaseModel):
    id: UUID
    site_id: UUID
    site_name: Optional[str] = None
    user_id: UUID
    user_name: Optional[str] = None
    type: ReportTypeEnum
    text: str
    created_at: datetime
    images: List[ImageResponse] = []

    class Config:
        from_attributes = True

class DashboardSummaryResponse(BaseModel):
    total_reports: int
    total_issues: int
    issues_this_week: int
    compliance_rate: float
    recent_activity: List[dict]
    issues_by_site: List[dict]
    violations_by_class: List[dict]

class RecurringIssueItem(BaseModel):
    site_id: UUID
    site_name: str
    class_name: str
    count: int
    latest_occurrence: datetime
    severity: str # "critical", "warning", "info"

class AssistantQuery(BaseModel):
    question: str
    site_id: Optional[UUID] = None

class AssistantResponse(BaseModel):
    answer: str
    referenced_report_ids: List[UUID]
    sources: Optional[List[dict]] = []
