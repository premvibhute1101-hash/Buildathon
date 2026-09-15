from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
import uuid
import os
import shutil

from app import schemas, models, deps, database
from app.config import settings
from app.routers.detect import execute_yolo_detection

router = APIRouter(tags=["reports"])

def format_report_response(report: models.Report) -> dict:
    user_name = None
    try:
        if hasattr(report, "user") and report.user:
            user_name = report.user.name
    except Exception:
        pass

    return {
        "id": report.id,
        "site_id": report.site_id,
        "site_name": report.site.name if report.site else None,
        "user_id": report.user_id,
        "user_name": user_name,
        "type": report.type,
        "text": report.text,
        "created_at": report.created_at,
        "images": [
            {
                "id": img.id,
                "url": img.url,
                "ai_label": img.ai_label,
                "ai_confidence": img.ai_confidence,
                "created_at": img.created_at,
                "detections": [
                    {
                        "id": det.id,
                        "class_name": det.class_name,
                        "confidence": det.confidence,
                        "bbox_x": det.bbox_x,
                        "bbox_y": det.bbox_y,
                        "bbox_w": det.bbox_w,
                        "bbox_h": det.bbox_h,
                    }
                    for det in (img.detections or [])
                ]
            }
            for img in (report.images or [])
        ]
    }

@router.post("/sites/{site_id}/reports", response_model=schemas.ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    site_id: uuid.UUID,
    type: models.ReportTypeEnum = Form(...),
    text: str = Form(...),
    images: List[UploadFile] = File(None),
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    result = await db.execute(select(models.Site).filter(models.Site.id == site_id))
    site = result.scalars().first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    db_report = models.Report(
        site_id=site_id,
        user_id=current_user.id,
        type=type,
        text=text
    )
    db.add(db_report)
    await db.commit()
    await db.refresh(db_report)

    if images:
        for img in images:
            if not img.filename:
                continue
            file_extension = os.path.splitext(img.filename)[1] or ".jpg"
            file_name = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(settings.UPLOAD_DIR, file_name)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(img.file, buffer)
            
            url = f"/uploads/{file_name}"
            
            # Execute real YOLOv8 PPE detection
            detection_results = execute_yolo_detection(file_path)
            
            db_img = models.Image(
                report_id=db_report.id,
                url=url,
                ai_label=detection_results.get("ai_label", "compliant"),
                ai_confidence=detection_results.get("ai_confidence", 0.90)
            )
            db.add(db_img)
            await db.commit()
            await db.refresh(db_img)
            
            for det in detection_results.get("detections", []):
                db_det = models.Detection(
                    image_id=db_img.id,
                    class_name=det["class_name"],
                    confidence=det["confidence"],
                    bbox_x=det["bbox_x"],
                    bbox_y=det["bbox_y"],
                    bbox_w=det["bbox_w"],
                    bbox_h=det["bbox_h"],
                )
                db.add(db_det)
            
            await db.commit()

    # Re-fetch report with related site, user, images and detections
    result = await db.execute(
        select(models.Report)
        .options(
            selectinload(models.Report.site),
            selectinload(models.Report.user),
            selectinload(models.Report.images).selectinload(models.Image.detections)
        )
        .filter(models.Report.id == db_report.id)
    )
    report = result.scalars().first()
    return format_report_response(report)

@router.get("/reports/search", response_model=List[schemas.ReportResponse])
async def search_reports(
    site_id: Optional[uuid.UUID] = None,
    project_id: Optional[uuid.UUID] = None,
    type: Optional[models.ReportTypeEnum] = None,
    ai_label: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    keyword: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    query = select(models.Report).options(
        selectinload(models.Report.site),
        selectinload(models.Report.user),
        selectinload(models.Report.images).selectinload(models.Image.detections)
    )
    
    if site_id:
        query = query.filter(models.Report.site_id == site_id)
    if type:
        query = query.filter(models.Report.type == type)
    if date_from:
        query = query.filter(models.Report.created_at >= date_from)
    if date_to:
        query = query.filter(models.Report.created_at <= date_to)
    if keyword:
        query = query.filter(models.Report.text.ilike(f"%{keyword}%"))
    
    if project_id:
        query = query.join(models.Site, models.Report.site_id == models.Site.id).filter(models.Site.project_id == project_id)
    
    if ai_label:
        query = query.join(models.Image, models.Image.report_id == models.Report.id).filter(models.Image.ai_label == ai_label)

    query = query.order_by(models.Report.created_at.desc()).limit(limit)
    result = await db.execute(query)
    reports = result.scalars().all()
    return [format_report_response(r) for r in reports]

@router.get("/reports", response_model=List[schemas.ReportResponse])
async def list_all_reports(
    site_id: Optional[uuid.UUID] = None,
    type: Optional[models.ReportTypeEnum] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    keyword: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    return await search_reports(
        site_id=site_id,
        type=type,
        date_from=date_from,
        date_to=date_to,
        keyword=keyword,
        limit=limit,
        db=db,
        current_user=current_user
    )

@router.get("/sites/{site_id}/reports", response_model=List[schemas.ReportResponse])
async def list_reports_for_site(
    site_id: uuid.UUID,
    type: Optional[models.ReportTypeEnum] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    keyword: Optional[str] = None,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    return await search_reports(
        site_id=site_id,
        type=type,
        date_from=date_from,
        date_to=date_to,
        keyword=keyword,
        limit=50,
        db=db,
        current_user=current_user
    )

@router.get("/reports/{report_id}", response_model=schemas.ReportResponse)
async def get_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    result = await db.execute(
        select(models.Report)
        .options(
            selectinload(models.Report.site),
            selectinload(models.Report.user),
            selectinload(models.Report.images).selectinload(models.Image.detections)
        )
        .filter(models.Report.id == report_id)
    )
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return format_report_response(report)
