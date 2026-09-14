from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List

from app import schemas, models, deps, database

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary", response_model=schemas.DashboardSummaryResponse)
async def get_dashboard_summary(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    # Total reports
    result = await db.execute(select(func.count(models.Report.id)))
    total_reports = result.scalar() or 0

    # Total images and issues
    result = await db.execute(select(func.count(models.Image.id)))
    total_images = result.scalar() or 0

    result = await db.execute(
        select(func.count(models.Image.id)).filter(models.Image.ai_label == "issue_detected")
    )
    total_issues = result.scalar() or 0

    compliance_rate = 100.0
    if total_images > 0:
        compliant_images = total_images - total_issues
        compliance_rate = round((compliant_images / total_images) * 100, 1)

    # Issues this week
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    result = await db.execute(
        select(func.count(models.Image.id))
        .filter(models.Image.ai_label == "issue_detected", models.Image.created_at >= one_week_ago)
    )
    issues_this_week = result.scalar() or 0

    # Recent activity
    result = await db.execute(
        select(models.Report, models.Site.name)
        .outerjoin(models.Site, models.Report.site_id == models.Site.id)
        .order_by(models.Report.created_at.desc())
        .limit(10)
    )
    recent_activity = []
    for report, site_name in result.all():
        recent_activity.append({
            "report_id": str(report.id),
            "site_name": site_name or "Unknown Site",
            "type": report.type.value if hasattr(report.type, "value") else str(report.type),
            "text": report.text[:80] + ("..." if len(report.text) > 80 else ""),
            "created_at": report.created_at.isoformat()
        })

    # Issues by site
    result = await db.execute(
        select(models.Site.name, func.count(models.Image.id))
        .join(models.Report, models.Report.site_id == models.Site.id)
        .join(models.Image, models.Image.report_id == models.Report.id)
        .filter(models.Image.ai_label == "issue_detected")
        .group_by(models.Site.id, models.Site.name)
    )
    issues_by_site = [{"site_name": row[0], "issue_count": row[1]} for row in result.all()]

    # Violations by class
    result = await db.execute(
        select(models.Detection.class_name, func.count(models.Detection.id))
        .group_by(models.Detection.class_name)
    )
    violations_by_class = [{"class_name": row[0], "count": row[1]} for row in result.all()]

    return schemas.DashboardSummaryResponse(
        total_reports=total_reports,
        total_issues=total_issues,
        issues_this_week=issues_this_week,
        compliance_rate=compliance_rate,
        recent_activity=recent_activity,
        issues_by_site=issues_by_site,
        violations_by_class=violations_by_class
    )

@router.get("/recurring-issues", response_model=List[schemas.RecurringIssueItem])
async def get_recurring_issues(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Identifies recurring safety violations grouped by site and detection class.
    """
    result = await db.execute(
        select(
            models.Site.id,
            models.Site.name,
            models.Detection.class_name,
            func.count(models.Detection.id).label("violation_count"),
            func.max(models.Report.created_at).label("latest_occurrence")
        )
        .join(models.Report, models.Report.site_id == models.Site.id)
        .join(models.Image, models.Image.report_id == models.Report.id)
        .join(models.Detection, models.Detection.image_id == models.Image.id)
        .filter(models.Detection.class_name.in_(["no_hardhat", "no_vest"]))
        .group_by(models.Site.id, models.Site.name, models.Detection.class_name)
        .having(func.count(models.Detection.id) >= 2)
        .order_by(func.count(models.Detection.id).desc())
    )
    
    recurring = []
    for site_id, site_name, class_name, count, latest_occ in result.all():
        severity = "critical" if count >= 4 else "warning"
        recurring.append(schemas.RecurringIssueItem(
            site_id=site_id,
            site_name=site_name,
            class_name=class_name,
            count=count,
            latest_occurrence=latest_occ or datetime.utcnow(),
            severity=severity
        ))
    return recurring
