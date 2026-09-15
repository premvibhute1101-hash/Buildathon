from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, and_, desc
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
import uuid
import os
import shutil

from app import schemas, models, deps, database
from app.config import settings
from app.routers.detect import execute_yolo_detection
from app.routers.assistant import call_llm_if_available

router = APIRouter(prefix="/comparisons", tags=["comparisons"])

def compute_safety_diff(before_img: models.Image, after_img: models.Image) -> schemas.ComparisonSafetyDiff:
    """Computes differences in PPE detections between before and after images."""
    before_dets = before_img.detections or []
    after_dets = after_img.detections or []

    before_violations = [d.class_name for d in before_dets if d.class_name in ("no_hardhat", "no_vest") and d.confidence >= 0.40]
    after_violations = [d.class_name for d in after_dets if d.class_name in ("no_hardhat", "no_vest") and d.confidence >= 0.40]

    before_classes = [d.class_name for d in before_dets]
    after_classes = [d.class_name for d in after_dets]

    new_violations = [v for v in after_violations if after_violations.count(v) > before_violations.count(v)]
    resolved_violations = [v for v in before_violations if before_violations.count(v) > after_violations.count(v)]

    before_count = len(before_violations)
    after_count = len(after_violations)
    diff = after_count - before_count

    if after_count < before_count:
        status_change = "improved"
    elif after_count > before_count:
        status_change = "degraded"
    else:
        status_change = "stable"

    return schemas.ComparisonSafetyDiff(
        before_violations_count=before_count,
        after_violations_count=after_count,
        diff_count=diff,
        before_classes=before_classes,
        after_classes=after_classes,
        new_violations=new_violations,
        resolved_violations=resolved_violations,
        status_change=status_change
    )

async def generate_comparison_ai_summary(
    comparison: models.SiteComparison,
    before_img: models.Image,
    after_img: models.Image,
    safety_diff: schemas.ComparisonSafetyDiff
) -> str:
    """Generates a grounded natural language change summary between before and after photos."""
    b_date_str = comparison.before_date.strftime("%b %d, %Y")
    a_date_str = comparison.after_date.strftime("%b %d, %Y")
    loc = comparison.location_tag

    # Gather report texts if available
    b_text = before_img.report.text if before_img.report else ""
    a_text = after_img.report.text if after_img.report else ""

    # Prompt LLM if keys are available
    prompt = (
        f"Generate a crisp, 1-2 sentence site intelligence change summary for construction site comparison at '{loc}'.\n"
        f"Timeline: Before ({b_date_str}) vs After ({a_date_str}).\n"
        f"Before Photo Data: AI Label: {before_img.ai_label}, Violations: {safety_diff.before_violations_count}, Detected items: {safety_diff.before_classes}. Log note: {b_text}\n"
        f"After Photo Data: AI Label: {after_img.ai_label}, Violations: {safety_diff.after_violations_count}, Detected items: {safety_diff.after_classes}. Log note: {a_text}\n"
        f"Safety Status: {safety_diff.status_change} (New violations: {safety_diff.new_violations}, Resolved: {safety_diff.resolved_violations}).\n"
        f"Provide a direct, factual executive summary of progress and safety changes."
    )

    llm_res = await call_llm_if_available(prompt)
    if llm_res and len(llm_res.strip()) > 10:
        # Clean quotes and markdown
        cleaned = llm_res.strip().replace('"', '').replace('\n', ' ')
        return cleaned

    # Fallback local structured synthesis engine
    summary_parts = []

    # 1. Safety assessment
    if safety_diff.status_change == "improved":
        summary_parts.append(
            f"Safety compliance improved with {len(safety_diff.resolved_violations)} violation(s) resolved since {b_date_str}."
        )
    elif safety_diff.status_change == "degraded":
        new_items = ", ".join(set(safety_diff.new_violations)) or "PPE violations"
        summary_parts.append(
            f"{safety_diff.diff_count} new safety flag(s) identified ({new_items}) requiring site supervisor attention."
        )
    else:
        if safety_diff.after_violations_count == 0:
            summary_parts.append(f"Site maintained 100% PPE safety compliance across both inspection intervals.")
        else:
            summary_parts.append(f"Ongoing safety monitoring active with {safety_diff.after_violations_count} flag(s) noted.")

    # 2. Progress / Activity assessment
    if a_text and a_text != b_text:
        summary_parts.append(f"Recent log: {a_text[:90]}{'...' if len(a_text) > 90 else ''}")
    elif len(safety_diff.after_classes) > len(safety_diff.before_classes):
        summary_parts.append(f"Active site operations detected with {len(safety_diff.after_classes)} monitored PPE items on site.")
    else:
        summary_parts.append(f"Visual audit verified for {loc} between {b_date_str} and {a_date_str}.")

    return " ".join(summary_parts)

def format_image_response(img: models.Image) -> schemas.ImageResponse:
    detections_list = [
        schemas.DetectionResponse(
            id=d.id,
            class_name=d.class_name,
            confidence=d.confidence,
            bbox_x=d.bbox_x,
            bbox_y=d.bbox_y,
            bbox_w=d.bbox_w,
            bbox_h=d.bbox_h,
        )
        for d in (img.detections or [])
    ]
    return schemas.ImageResponse(
        id=img.id,
        url=img.url,
        location_tag=img.location_tag,
        ai_label=img.ai_label,
        ai_confidence=img.ai_confidence,
        created_at=img.created_at,
        detections=detections_list
    )

async def format_comparison_detail(comparison: models.SiteComparison) -> schemas.SiteComparisonResponse:
    before_photo = format_image_response(comparison.before_photo)
    after_photo = format_image_response(comparison.after_photo)
    safety_diff = compute_safety_diff(comparison.before_photo, comparison.after_photo)
    ai_summary = await generate_comparison_ai_summary(comparison, comparison.before_photo, comparison.after_photo, safety_diff)

    project_name = comparison.project.name if comparison.project else None
    created_by_name = comparison.user.name if comparison.user else None

    return schemas.SiteComparisonResponse(
        id=comparison.id,
        project_id=comparison.project_id,
        project_name=project_name,
        location_tag=comparison.location_tag,
        before_photo_id=comparison.before_photo_id,
        after_photo_id=comparison.after_photo_id,
        before_date=comparison.before_date,
        after_date=comparison.after_date,
        created_by=comparison.created_by,
        created_by_name=created_by_name,
        created_at=comparison.created_at,
        before_photo=before_photo,
        after_photo=after_photo,
        ai_summary=ai_summary,
        safety_diff=safety_diff
    )

def format_comparison_list_item(comparison: models.SiteComparison) -> schemas.SiteComparisonListItem:
    before_dets = comparison.before_photo.detections or [] if comparison.before_photo else []
    after_dets = comparison.after_photo.detections or [] if comparison.after_photo else []

    before_violations = len([d for d in before_dets if d.class_name in ("no_hardhat", "no_vest") and d.confidence >= 0.40])
    after_violations = len([d for d in after_dets if d.class_name in ("no_hardhat", "no_vest") and d.confidence >= 0.40])

    project_name = comparison.project.name if comparison.project else None

    return schemas.SiteComparisonListItem(
        id=comparison.id,
        project_id=comparison.project_id,
        project_name=project_name,
        location_tag=comparison.location_tag,
        before_photo_id=comparison.before_photo_id,
        after_photo_id=comparison.after_photo_id,
        before_photo_url=comparison.before_photo.url if comparison.before_photo else "",
        after_photo_url=comparison.after_photo.url if comparison.after_photo else "",
        before_date=comparison.before_date,
        after_date=comparison.after_date,
        created_at=comparison.created_at,
        before_ai_label=comparison.before_photo.ai_label if comparison.before_photo else None,
        after_ai_label=comparison.after_photo.ai_label if comparison.after_photo else None,
        before_violations_count=before_violations,
        after_violations_count=after_violations,
        ai_summary=None
    )

@router.post("", response_model=schemas.SiteComparisonResponse, status_code=status.HTTP_201_CREATED)
async def create_comparison(
    payload: schemas.SiteComparisonCreate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Create a site comparison by selecting two existing photos.
    Validates that:
    1. Before and after photos are not identical.
    2. Both photos exist.
    3. Both photos belong to sites in the specified project.
    """
    if payload.before_photo_id == payload.after_photo_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Before photo and after photo cannot be the same photo"
        )

    # Fetch before image with report and site
    res_before = await db.execute(
        select(models.Image)
        .options(
            selectinload(models.Image.report).selectinload(models.Report.site),
            selectinload(models.Image.detections)
        )
        .filter(models.Image.id == payload.before_photo_id)
    )
    before_img = res_before.scalars().first()
    if not before_img:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Before photo not found")

    # Fetch after image with report and site
    res_after = await db.execute(
        select(models.Image)
        .options(
            selectinload(models.Image.report).selectinload(models.Report.site),
            selectinload(models.Image.detections)
        )
        .filter(models.Image.id == payload.after_photo_id)
    )
    after_img = res_after.scalars().first()
    if not after_img:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="After photo not found")

    # Validate project ownership
    before_project_id = before_img.report.site.project_id if before_img.report and before_img.report.site else None
    after_project_id = after_img.report.site.project_id if after_img.report and after_img.report.site else None

    if before_project_id != payload.project_id or after_project_id != payload.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both photos must belong to the specified project"
        )

    before_date = payload.before_date or before_img.created_at
    after_date = payload.after_date or after_img.created_at

    # Auto-sort chronologically if dates are reversed
    if before_date > after_date:
        before_img, after_img = after_img, before_img
        before_date, after_date = after_date, before_date

    # Tag images with location_tag if not set
    if not before_img.location_tag:
        before_img.location_tag = payload.location_tag
    if not after_img.location_tag:
        after_img.location_tag = payload.location_tag

    db_comparison = models.SiteComparison(
        project_id=payload.project_id,
        location_tag=payload.location_tag,
        before_photo_id=before_img.id,
        after_photo_id=after_img.id,
        before_date=before_date,
        after_date=after_date,
        created_by=current_user.id
    )
    db.add(db_comparison)
    await db.commit()

    # Re-fetch with full associations
    res = await db.execute(
        select(models.SiteComparison)
        .options(
            selectinload(models.SiteComparison.project),
            selectinload(models.SiteComparison.user),
            selectinload(models.SiteComparison.before_photo).selectinload(models.Image.detections),
            selectinload(models.SiteComparison.before_photo).selectinload(models.Image.report),
            selectinload(models.SiteComparison.after_photo).selectinload(models.Image.detections),
            selectinload(models.SiteComparison.after_photo).selectinload(models.Image.report),
        )
        .filter(models.SiteComparison.id == db_comparison.id)
    )
    comparison = res.scalars().first()
    return await format_comparison_detail(comparison)

@router.post("/upload", response_model=schemas.SiteComparisonResponse, status_code=status.HTTP_201_CREATED)
async def upload_and_create_comparison(
    project_id: uuid.UUID = Form(...),
    location_tag: str = Form(...),
    site_id: Optional[uuid.UUID] = Form(None),
    before_file: UploadFile = File(...),
    after_file: UploadFile = File(...),
    before_date: Optional[datetime] = Form(None),
    after_date: Optional[datetime] = Form(None),
    before_notes: Optional[str] = Form(None),
    after_notes: Optional[str] = Form(None),
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Direct upload of two photos (Before + After) to create a comparison in one action.
    Runs YOLOv8 detections on both images automatically.
    """
    # Verify project exists
    res_p = await db.execute(select(models.Project).filter(models.Project.id == project_id))
    project = res_p.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Resolve site
    resolved_site_id = site_id
    if not resolved_site_id:
        res_site = await db.execute(select(models.Site).filter(models.Site.project_id == project_id))
        first_site = res_site.scalars().first()
        if first_site:
            resolved_site_id = first_site.id
        else:
            # Create a site for this project
            new_site = models.Site(name=f"{location_tag} Area", project_id=project_id)
            db.add(new_site)
            await db.commit()
            await db.refresh(new_site)
            resolved_site_id = new_site.id

    now = datetime.utcnow()
    b_date = before_date or (now - timedelta(days=7))
    a_date = after_date or now

    # Save & detect before image
    b_ext = os.path.splitext(before_file.filename)[1] or ".jpg"
    b_filename = f"{uuid.uuid4()}{b_ext}"
    b_path = os.path.join(settings.UPLOAD_DIR, b_filename)
    with open(b_path, "wb") as buf:
        shutil.copyfileobj(before_file.file, buf)
    b_yolo = execute_yolo_detection(b_path)

    # Save & detect after image
    a_ext = os.path.splitext(after_file.filename)[1] or ".jpg"
    a_filename = f"{uuid.uuid4()}{a_ext}"
    a_path = os.path.join(settings.UPLOAD_DIR, a_filename)
    with open(a_path, "wb") as buf:
        shutil.copyfileobj(after_file.file, buf)
    a_yolo = execute_yolo_detection(a_path)

    # Create Before Report & Image
    b_rep = models.Report(
        site_id=resolved_site_id,
        user_id=current_user.id,
        type=models.ReportTypeEnum.inspection,
        text=before_notes or f"Initial progress photo logged for {location_tag}",
        created_at=b_date
    )
    db.add(b_rep)
    await db.commit()
    await db.refresh(b_rep)

    b_img = models.Image(
        report_id=b_rep.id,
        url=f"/uploads/{b_filename}",
        location_tag=location_tag,
        ai_label=b_yolo.get("ai_label", "compliant"),
        ai_confidence=b_yolo.get("ai_confidence", 0.90),
        created_at=b_date
    )
    db.add(b_img)
    await db.commit()
    await db.refresh(b_img)

    for det in b_yolo.get("detections", []):
        db.add(models.Detection(
            image_id=b_img.id,
            class_name=det["class_name"],
            confidence=det["confidence"],
            bbox_x=det["bbox_x"],
            bbox_y=det["bbox_y"],
            bbox_w=det["bbox_w"],
            bbox_h=det["bbox_h"],
        ))
    await db.commit()

    # Create After Report & Image
    a_rep = models.Report(
        site_id=resolved_site_id,
        user_id=current_user.id,
        type=models.ReportTypeEnum.progress,
        text=after_notes or f"Timeline follow-up inspection for {location_tag}",
        created_at=a_date
    )
    db.add(a_rep)
    await db.commit()
    await db.refresh(a_rep)

    a_img = models.Image(
        report_id=a_rep.id,
        url=f"/uploads/{a_filename}",
        location_tag=location_tag,
        ai_label=a_yolo.get("ai_label", "compliant"),
        ai_confidence=a_yolo.get("ai_confidence", 0.90),
        created_at=a_date
    )
    db.add(a_img)
    await db.commit()
    await db.refresh(a_img)

    for det in a_yolo.get("detections", []):
        db.add(models.Detection(
            image_id=a_img.id,
            class_name=det["class_name"],
            confidence=det["confidence"],
            bbox_x=det["bbox_x"],
            bbox_y=det["bbox_y"],
            bbox_w=det["bbox_w"],
            bbox_h=det["bbox_h"],
        ))
    await db.commit()

    # Create comparison record
    db_comparison = models.SiteComparison(
        project_id=project_id,
        location_tag=location_tag,
        before_photo_id=b_img.id,
        after_photo_id=a_img.id,
        before_date=b_date,
        after_date=a_date,
        created_by=current_user.id
    )
    db.add(db_comparison)
    await db.commit()

    res = await db.execute(
        select(models.SiteComparison)
        .options(
            selectinload(models.SiteComparison.project),
            selectinload(models.SiteComparison.user),
            selectinload(models.SiteComparison.before_photo).selectinload(models.Image.detections),
            selectinload(models.SiteComparison.before_photo).selectinload(models.Image.report),
            selectinload(models.SiteComparison.after_photo).selectinload(models.Image.detections),
            selectinload(models.SiteComparison.after_photo).selectinload(models.Image.report),
        )
        .filter(models.SiteComparison.id == db_comparison.id)
    )
    comparison = res.scalars().first()
    return await format_comparison_detail(comparison)

@router.get("/suggest-pairs/{project_id}", response_model=List[schemas.ComparisonPairSuggestion])
async def get_suggested_pairs(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Auto-suggests photo pairs for a project by finding images with matching location tags
    taken on different dates that haven't been compared yet.
    """
    # Fetch all images belonging to the project
    res = await db.execute(
        select(models.Image)
        .join(models.Report, models.Image.report_id == models.Report.id)
        .join(models.Site, models.Report.site_id == models.Site.id)
        .filter(models.Site.project_id == project_id)
        .options(selectinload(models.Image.detections), selectinload(models.Image.report).selectinload(models.Report.site))
        .order_by(models.Image.created_at.asc())
    )
    images = res.scalars().all()

    # Fetch existing comparisons in project to avoid duplicate suggestions
    res_comps = await db.execute(
        select(models.SiteComparison).filter(models.SiteComparison.project_id == project_id)
    )
    existing_comps = res_comps.scalars().all()
    existing_pairs = set((c.before_photo_id, c.after_photo_id) for c in existing_comps) | \
                     set((c.after_photo_id, c.before_photo_id) for c in existing_comps)

    # Group images by location_tag (or site name fallback)
    grouped: Dict[str, List[models.Image]] = {}
    for img in images:
        tag = img.location_tag or (img.report.site.name if img.report and img.report.site else "General Site Area")
        if tag not in grouped:
            grouped[tag] = []
        grouped[tag].append(img)

    suggestions = []
    for tag, img_list in grouped.items():
        if len(img_list) >= 2:
            # Pair adjacent dates
            for i in range(len(img_list) - 1):
                b_img = img_list[i]
                a_img = img_list[i + 1]
                if (b_img.id, a_img.id) not in existing_pairs:
                    days_diff = abs((a_img.created_at - b_img.created_at).days)
                    suggestions.append(schemas.ComparisonPairSuggestion(
                        project_id=project_id,
                        location_tag=tag,
                        before_photo=format_image_response(b_img),
                        after_photo=format_image_response(a_img),
                        date_difference_days=days_diff
                    ))

    return suggestions[:10]

@router.get("/project/{project_id}", response_model=List[schemas.SiteComparisonListItem])
async def list_comparisons_for_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """List all site comparisons for a specific project."""
    res = await db.execute(
        select(models.SiteComparison)
        .options(
            selectinload(models.SiteComparison.project),
            selectinload(models.SiteComparison.before_photo).selectinload(models.Image.detections),
            selectinload(models.SiteComparison.after_photo).selectinload(models.Image.detections),
        )
        .filter(models.SiteComparison.project_id == project_id)
        .order_by(desc(models.SiteComparison.created_at))
    )
    comps = res.scalars().all()
    return [format_comparison_list_item(c) for c in comps]

@router.get("/detail/{comparison_id}", response_model=schemas.SiteComparisonResponse)
async def get_comparison_detail(
    comparison_id: uuid.UUID,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Fetch full metadata for a single comparison."""
    res = await db.execute(
        select(models.SiteComparison)
        .options(
            selectinload(models.SiteComparison.project),
            selectinload(models.SiteComparison.user),
            selectinload(models.SiteComparison.before_photo).selectinload(models.Image.detections),
            selectinload(models.SiteComparison.before_photo).selectinload(models.Image.report),
            selectinload(models.SiteComparison.after_photo).selectinload(models.Image.detections),
            selectinload(models.SiteComparison.after_photo).selectinload(models.Image.report),
        )
        .filter(models.SiteComparison.id == comparison_id)
    )
    comp = res.scalars().first()
    if not comp:
        raise HTTPException(status_code=404, detail="Site comparison not found")
    return await format_comparison_detail(comp)

@router.get("/{id_or_project_id}", response_model=Union[schemas.SiteComparisonResponse, List[schemas.SiteComparisonListItem]])
async def get_comparison_or_project_comparisons(
    id_or_project_id: uuid.UUID,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Unified router supporting both:
    1. GET /comparisons/{id} -> Single comparison detail with YOLO detections and AI summary.
    2. GET /comparisons/{project_id} -> List all comparisons for a project.
    """
    # 1. Check if it's a comparison ID
    res_comp = await db.execute(
        select(models.SiteComparison)
        .options(
            selectinload(models.SiteComparison.project),
            selectinload(models.SiteComparison.user),
            selectinload(models.SiteComparison.before_photo).selectinload(models.Image.detections),
            selectinload(models.SiteComparison.before_photo).selectinload(models.Image.report),
            selectinload(models.SiteComparison.after_photo).selectinload(models.Image.detections),
            selectinload(models.SiteComparison.after_photo).selectinload(models.Image.report),
        )
        .filter(models.SiteComparison.id == id_or_project_id)
    )
    comp = res_comp.scalars().first()
    if comp:
        return await format_comparison_detail(comp)

    # 2. Check if it's a project ID
    res_proj = await db.execute(select(models.Project).filter(models.Project.id == id_or_project_id))
    proj = res_proj.scalars().first()
    if proj:
        res_list = await db.execute(
            select(models.SiteComparison)
            .options(
                selectinload(models.SiteComparison.project),
                selectinload(models.SiteComparison.before_photo).selectinload(models.Image.detections),
                selectinload(models.SiteComparison.after_photo).selectinload(models.Image.detections),
            )
            .filter(models.SiteComparison.project_id == id_or_project_id)
            .order_by(desc(models.SiteComparison.created_at))
        )
        comps = res_list.scalars().all()
        return [format_comparison_list_item(c) for c in comps]

    raise HTTPException(status_code=404, detail="Comparison or project not found")

@router.get("", response_model=List[schemas.SiteComparisonListItem])
async def list_all_comparisons(
    project_id: Optional[uuid.UUID] = None,
    location_tag: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """List comparisons across projects with optional filters."""
    query = select(models.SiteComparison).options(
        selectinload(models.SiteComparison.project),
        selectinload(models.SiteComparison.before_photo).selectinload(models.Image.detections),
        selectinload(models.SiteComparison.after_photo).selectinload(models.Image.detections),
    )
    if project_id:
        query = query.filter(models.SiteComparison.project_id == project_id)
    if location_tag:
        query = query.filter(models.SiteComparison.location_tag.ilike(f"%{location_tag}%"))

    query = query.order_by(desc(models.SiteComparison.created_at)).limit(limit)
    res = await db.execute(query)
    comps = res.scalars().all()
    return [format_comparison_list_item(c) for c in comps]
