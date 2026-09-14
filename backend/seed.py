import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import uuid
import os
import shutil
from pathlib import Path

from app.config import settings
from app.models import Base, User, Project, Site, Report, Image, Detection, RoleEnum, ProjectStatusEnum, ReportTypeEnum
from app.auth import get_password_hash
from app.routers.detect import execute_yolo_detection

engine = create_async_engine(settings.DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def seed_db():
    print("Starting database seeding...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    sample_images_dir = Path(__file__).resolve().parents[1] / "ai model" / "ai" / "data" / "test" / "images"
    sample_images = list(sample_images_dir.glob("*.jpg")) if sample_images_dir.is_dir() else []
    print(f"Found {len(sample_images)} test images for seeding.")

    async with SessionLocal() as db:
        # 1. Users
        admin_user = User(
            name="Alexander Vance (Admin)",
            email="admin@example.com",
            password_hash=get_password_hash("password"),
            role=RoleEnum.admin
        )
        supervisor_user = User(
            name="Marcus Holloway (Site Supervisor)",
            email="supervisor@example.com",
            password_hash=get_password_hash("password"),
            role=RoleEnum.site_user
        )
        safety_user = User(
            name="Elena Rostova (Safety Officer)",
            email="safety@example.com",
            password_hash=get_password_hash("password"),
            role=RoleEnum.site_user
        )
        contractor_user = User(
            name="David Chen (General Contractor)",
            email="contractor@example.com",
            password_hash=get_password_hash("password"),
            role=RoleEnum.site_user
        )
        db.add_all([admin_user, supervisor_user, safety_user, contractor_user])
        await db.commit()
        await db.refresh(admin_user)
        await db.refresh(supervisor_user)
        await db.refresh(safety_user)
        await db.refresh(contractor_user)

        # 2. Projects
        p1 = Project(
            name="Metropolis Commercial Tower",
            status=ProjectStatusEnum.active,
            created_by=admin_user.id,
            created_at=datetime.utcnow() - timedelta(days=30)
        )
        p2 = Project(
            name="Apex Industrial Logistics Hub",
            status=ProjectStatusEnum.active,
            created_by=admin_user.id,
            created_at=datetime.utcnow() - timedelta(days=60)
        )
        db.add_all([p1, p2])
        await db.commit()
        await db.refresh(p1)
        await db.refresh(p2)

        # 3. Sites / Areas
        sites = [
            Site(name="Foundation & Basement Zone", project_id=p1.id),
            Site(name="Area B - Structural Steel Framing", project_id=p1.id),
            Site(name="Roof Deck & Mechanical Room", project_id=p1.id),
            Site(name="Logistics Warehouse Floor", project_id=p2.id),
            Site(name="Electrical Vault & Switchgear", project_id=p2.id),
        ]
        db.add_all(sites)
        await db.commit()
        for s in sites:
            await db.refresh(s)

        # 4. Realistic Report Scenarios
        report_templates = [
            (
                sites[1].id, safety_user.id, ReportTypeEnum.inspection,
                "Safety audit on Area B steel framing. Several workers observed at elevation; flagged missing hardhats near hoist point.",
                1
            ),
            (
                sites[0].id, supervisor_user.id, ReportTypeEnum.progress,
                "Concrete pouring for foundation pad section 4 completed ahead of schedule. Core curing temperature normal.",
                2
            ),
            (
                sites[1].id, safety_user.id, ReportTypeEnum.incident,
                "Safety violation in Area B: Subcontractor crew entered active crane swing radius without high-visibility vests.",
                3
            ),
            (
                sites[2].id, supervisor_user.id, ReportTypeEnum.inspection,
                "Roof perimeter guardrail inspection. East edge netting secure. Weatherproofing membrane installation underway.",
                4
            ),
            (
                sites[1].id, safety_user.id, ReportTypeEnum.inspection,
                "Recurring safety issue in Area B: Scaffold platform workers observed without fastened chinstraps and safety gear.",
                5
            ),
            (
                sites[3].id, contractor_user.id, ReportTypeEnum.progress,
                "Logistics hub concrete slab polished and joint sealing complete. Ready for rack installation team.",
                6
            ),
            (
                sites[4].id, safety_user.id, ReportTypeEnum.inspection,
                "Electrical substation conduit clearance verified. Lockout/tagout protocol strictly observed.",
                7
            ),
            (
                sites[0].id, supervisor_user.id, ReportTypeEnum.progress,
                "Basement drainage sump pump installation completed. Waterproofing inspection signed off by engineer.",
                8
            ),
            (
                sites[1].id, safety_user.id, ReportTypeEnum.inspection,
                "Area B framing afternoon spot check. Majority of crew compliant; one warning issued for missing safety vest.",
                9
            ),
            (
                sites[2].id, contractor_user.id, ReportTypeEnum.progress,
                "HVAC chiller crane lift completed on roof deck. Structural anchor bolts torqued to specification.",
                10
            ),
            (
                sites[0].id, safety_user.id, ReportTypeEnum.inspection,
                "Excavation shoring wall deflection test passed. Soil stability monitoring sensors operational.",
                11
            ),
            (
                sites[1].id, supervisor_user.id, ReportTypeEnum.progress,
                "Area B third-floor decking installation 80% complete. Rebar reinforcement mesh delivered.",
                12
            ),
            (
                sites[3].id, supervisor_user.id, ReportTypeEnum.inspection,
                "Fire suppression sprinkler system pressure test passed in warehouse section.",
                13
            ),
            (
                sites[1].id, safety_user.id, ReportTypeEnum.incident,
                "Safety incident logged in Area B: Material hoist gate left open during lunch break. Area secured immediately.",
                14
            )
        ]

        # 5. Populate Reports and Process Images with YOLO
        img_idx = 0
        for site_id, user_id, r_type, text, days_ago in report_templates:
            report_time = datetime.utcnow() - timedelta(days=days_ago, hours=days_ago*2 % 24)
            db_report = Report(
                site_id=site_id,
                user_id=user_id,
                type=r_type,
                text=text,
                created_at=report_time
            )
            db.add(db_report)
            await db.commit()
            await db.refresh(db_report)

            # Attach 1 sample image to selected reports
            if sample_images and img_idx < len(sample_images):
                src_img = sample_images[img_idx % len(sample_images)]
                img_idx += 1
                
                dest_filename = f"{uuid.uuid4()}{src_img.suffix}"
                dest_path = os.path.join(settings.UPLOAD_DIR, dest_filename)
                shutil.copyfile(str(src_img), dest_path)
                url = f"/uploads/{dest_filename}"

                # Run real YOLOv8 detection
                detection_res = execute_yolo_detection(dest_path)
                
                db_img = Image(
                    report_id=db_report.id,
                    url=url,
                    ai_label=detection_res.get("ai_label", "compliant"),
                    ai_confidence=detection_res.get("ai_confidence", 0.90),
                    created_at=report_time
                )
                db.add(db_img)
                await db.commit()
                await db.refresh(db_img)

                for det in detection_res.get("detections", []):
                    db_det = Detection(
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

        print("Database seeded successfully with authentic YOLO detection outputs!")

if __name__ == "__main__":
    asyncio.run(seed_db())
