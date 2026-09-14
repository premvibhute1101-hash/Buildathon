from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid

from app import schemas, models, deps, database

router = APIRouter(tags=["projects"])

@router.post("/projects", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: schemas.ProjectCreate, 
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_admin)
):
    db_project = models.Project(**project.model_dump(), created_by=current_user.id)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.get("/projects", response_model=List[schemas.ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    result = await db.execute(select(models.Project).options(selectinload(models.Project.sites)))
    projects = result.scalars().all()
    res = []
    for p in projects:
        p_dict = {
            "id": p.id,
            "name": p.name,
            "status": p.status,
            "created_by": p.created_by,
            "created_at": p.created_at,
            "sites_count": len(p.sites) if p.sites else 0
        }
        res.append(p_dict)
    return res

@router.get("/projects/{project_id}", response_model=schemas.ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    result = await db.execute(
        select(models.Project)
        .options(selectinload(models.Project.sites))
        .filter(models.Project.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "id": project.id,
        "name": project.name,
        "status": project.status,
        "created_by": project.created_by,
        "created_at": project.created_at,
        "sites_count": len(project.sites) if project.sites else 0
    }

@router.patch("/projects/{project_id}", response_model=schemas.ProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    project_update: schemas.ProjectUpdate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_admin)
):
    result = await db.execute(select(models.Project).filter(models.Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project_update.name is not None:
        project.name = project_update.name
    if project_update.status is not None:
        project.status = project_update.status
    
    await db.commit()
    await db.refresh(project)
    return project

@router.post("/projects/{project_id}/sites", response_model=schemas.SiteResponse, status_code=status.HTTP_201_CREATED)
async def create_site(
    project_id: uuid.UUID,
    site: schemas.SiteCreate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_admin)
):
    result = await db.execute(select(models.Project).filter(models.Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db_site = models.Site(**site.model_dump(), project_id=project_id)
    db.add(db_site)
    await db.commit()
    await db.refresh(db_site)
    return db_site

@router.get("/projects/{project_id}/sites", response_model=List[schemas.SiteResponse])
async def list_sites_for_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    result = await db.execute(
        select(models.Site)
        .options(selectinload(models.Site.reports))
        .filter(models.Site.project_id == project_id)
    )
    sites = result.scalars().all()
    res = []
    for s in sites:
        res.append({
            "id": s.id,
            "project_id": s.project_id,
            "name": s.name,
            "created_at": s.created_at,
            "reports_count": len(s.reports) if s.reports else 0
        })
    return res

@router.get("/sites", response_model=List[schemas.SiteResponse])
async def list_all_sites(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    result = await db.execute(
        select(models.Site).options(selectinload(models.Site.reports))
    )
    sites = result.scalars().all()
    res = []
    for s in sites:
        res.append({
            "id": s.id,
            "project_id": s.project_id,
            "name": s.name,
            "created_at": s.created_at,
            "reports_count": len(s.reports) if s.reports else 0
        })
    return res
