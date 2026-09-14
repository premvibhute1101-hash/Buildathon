import os
import re
from datetime import datetime, timedelta
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, func

from app import schemas, models, deps, database
from app.config import settings

router = APIRouter(prefix="/assistant", tags=["assistant"])

async def call_llm_if_available(prompt: str) -> Optional[str]:
    """Attempts to call Gemini or OpenAI if API keys are provided in environment or settings."""
    # 1. Check Gemini
    gemini_key = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
    if gemini_key and gemini_key.strip() and gemini_key != "dummy_key":
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key.strip())
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            if response and response.text:
                return response.text
        except Exception as e:
            print(f"[Assistant] Gemini API call failed: {e}")

    # 2. Check OpenAI
    openai_key = getattr(settings, "OPENAI_API_KEY", None) or os.getenv("OPENAI_API_KEY") or (settings.LLM_API_KEY if settings.LLM_API_KEY != "dummy_key" else None)
    if openai_key and openai_key.strip() and openai_key != "dummy_key":
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key.strip())
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a senior Construction Site Intelligence and Safety Assistant. Always cite source Report IDs formatted as [Report #<id>] and ground all answers strictly in the provided project data."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2
            )
            if response.choices and response.choices[0].message.content:
                return response.choices[0].message.content
        except Exception as e:
            print(f"[Assistant] OpenAI API call failed: {e}")

    return None

def generate_grounded_local_response(
    question: str,
    reports: List[models.Report],
    site_filter_name: Optional[str] = None
) -> str:
    """
    Intelligent contextual synthesis engine that analyzes real DB reports,
    safety detections, and site status to generate a grounded, structured answer.
    """
    q_lower = question.lower()
    total_count = len(reports)
    
    if total_count == 0:
        target = f" in {site_filter_name}" if site_filter_name else " across active zones"
        return f"No reports or incidents were found{target} matching the specified criteria."

    # Aggregate and analyze data
    violations = []
    compliant_images = 0
    total_images = 0
    issues_by_site = {}
    reports_by_type = {"progress": 0, "inspection": 0, "incident": 0}
    dates = []

    for r in reports:
        dates.append(r.created_at)
        r_type = r.type.value if hasattr(r.type, "value") else str(r.type)
        if r_type in reports_by_type:
            reports_by_type[r_type] += 1
        
        site_name = r.site.name if r.site else "General Site"
        if site_name not in issues_by_site:
            issues_by_site[site_name] = {"violations": 0, "reports": 0, "incidents": 0, "latest_text": r.text, "latest_id": str(r.id)}
        issues_by_site[site_name]["reports"] += 1
        if r_type == "incident":
            issues_by_site[site_name]["incidents"] += 1

        for img in (r.images or []):
            total_images += 1
            if img.ai_label == "issue_detected":
                issues_by_site[site_name]["violations"] += 1
                for det in (img.detections or []):
                    if det.class_name in ("no_hardhat", "no_vest"):
                        violations.append({
                            "report_id": str(r.id),
                            "site": site_name,
                            "class": det.class_name,
                            "confidence": det.confidence,
                            "text": r.text,
                            "date": r.created_at.strftime("%b %d, %Y")
                        })
            else:
                compliant_images += 1

    date_span_str = ""
    if dates:
        min_date = min(dates).strftime("%b %d")
        max_date = max(dates).strftime("%b %d, %Y")
        date_span_str = f"{min_date} – {max_date}"

    # Query Type 1: Recurring Issues / Repeated Patterns
    if any(w in q_lower for w in ["repeat", "recur", "frequent", "pattern", "trend", "often"]):
        if not violations:
            return f"### ✅ Recurring Safety Analysis\n\nNo recurring PPE safety violations were detected across the {total_count} reports reviewed. All site visual inspections are currently compliant."
        
        grouped = {}
        for v in violations:
            key = (v["site"], v["class"])
            grouped[key] = grouped.get(key, []) + [v["report_id"]]

        recurring_lines = [
            f"### ⚠️ Recurring Safety Violations & Risk Hotspots\n",
            f"Analysis of **{total_count} project logs** identified **{len(violations)} safety infractions** with repeated patterns:\n"
        ]
        for (site, class_name), r_ids in grouped.items():
            readable_name = "Missing Hardhat Violations" if "hardhat" in class_name else "Missing Safety Vest Violations"
            unique_reports = list(dict.fromkeys(r_ids))
            report_citations = " ".join([f"[Report #{rid}]" for rid in unique_reports])
            severity = "🚨 High Severity" if len(r_ids) >= 3 else "⚠️ Moderate Alert"
            recurring_lines.append(f"- **{readable_name} at {site}** ({severity}): Occurred **{len(r_ids)} times** across {report_citations}.")
        
        recurring_lines.append("\n#### 📋 Recommended Corrective Action:")
        recurring_lines.append("1. Convene mandatory morning safety toolbox talk with trade contractors on high-risk zones.")
        recurring_lines.append("2. Enforce strict PPE checkpoints at elevation access stairs and material hoist gates.")
        return "\n".join(recurring_lines)

    # Query Type 2: Area specific query or safety infractions
    if any(w in q_lower for w in ["safety", "issue", "violation", "incident", "hazard", "ppe", "hardhat", "vest", "danger"]):
        safety_lines = [
            f"### 🛡️ Site Safety & Compliance Intelligence Briefing\n",
            f"- **Period Covered**: {date_span_str} ({total_count} field logs analyzed)",
            f"- **Safety Incidents**: {reports_by_type.get('incident', 0)} formal incidents logged",
            f"- **Visual PPE Audits**: {total_images} site photos analyzed by YOLOv8 ({compliant_images} compliant, {len(violations)} non-compliant flags)\n"
        ]
        
        if violations:
            safety_lines.append("#### 🚨 Flagged Violations & Observations:")
            for v in violations[:6]:
                violation_type = "Missing Hardhat" if "hardhat" in v["class"] else "Missing Safety Vest"
                safety_lines.append(f"- **{violation_type}** at **{v['site']}** ({v['date']}): {v['text']} [Report #{v['report_id']}] *(Confidence: {int(v['confidence']*100)}%)*")
        else:
            safety_lines.append("✅ No critical PPE violations were detected in the queried logs.")

        safety_lines.append("\n#### 📍 Zone Activity & Incident Log:")
        for r in reports[:5]:
            site_name = r.site.name if r.site else "Site"
            safety_lines.append(f"- **{site_name}** ({r.created_at.strftime('%b %d')}): {r.text} [Report #{r.id}]")
        
        return "\n".join(safety_lines)

    # Query Type 3: Report / Summary / Progress / Weekly / Default comprehensive response
    # Matches "give me report of these week", "summarize", "weekly progress report", "status", etc.
    report_lines = [
        f"### 📋 Construction Site Intelligence Report",
        f"**Reporting Period**: {date_span_str} | **Scope**: {total_count} Verified Field Reports\n",
        f"#### 📊 Executive Operations Breakdown:",
        f"- **Daily Work Progress Logs**: {reports_by_type.get('progress', 0)} reports",
        f"- **Safety & Compliance Inspections**: {reports_by_type.get('inspection', 0)} audits",
        f"- **Safety Incident Reports**: {reports_by_type.get('incident', 0)} alerts",
        f"- **Computer Vision PPE Analysis**: {total_images} photos evaluated with **{compliant_images} compliant** and **{len(violations)} violation flags**.\n",
        f"#### 🏗️ Active Zone Status & Key Findings:"
    ]

    for site_name, data in issues_by_site.items():
        status_tag = "⚠️ Attention Needed" if data["violations"] > 0 or data["incidents"] > 0 else "✅ Normal Progress"
        report_lines.append(f"- **{site_name}** ({status_tag}): {data['reports']} logs recorded. Latest finding: {data['latest_text']} [Report #{data['latest_id']}]")

    if violations:
        report_lines.append("\n#### ⚠️ Safety Alerts Identified by AI Vision:")
        for v in violations[:4]:
            readable = "Missing Hardhat" if "hardhat" in v["class"] else "Missing Safety Vest"
            report_lines.append(f"- **{readable}** ({v['site']}, {v['date']}): {v['text']} [Report #{v['report_id']}]")

    report_lines.append("\n#### 🔍 Recent Field Observations & Citations:")
    for r in reports[:6]:
        site_name = r.site.name if r.site else "Site"
        report_lines.append(f"- **{site_name}** ({r.created_at.strftime('%b %d')}): {r.text} [Report #{r.id}]")

    return "\n".join(report_lines)


@router.post("/query", response_model=schemas.AssistantResponse)
async def query_assistant(
    query: schemas.AssistantQuery,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    q_lower = query.question.lower()
    
    # 1. Base query for reports with loaded relationships
    sql_query = select(models.Report).options(
        selectinload(models.Report.site),
        selectinload(models.Report.images).selectinload(models.Image.detections)
    )

    # Filter by explicit site_id if given
    if query.site_id:
        sql_query = sql_query.filter(models.Report.site_id == query.site_id)
    
    # Filter by date heuristics (supports "week", "these week", "this week", "last 7 days", "14 days", "today")
    if any(w in q_lower for w in ["week", "7 days", "these week", "this week"]):
        one_week_ago = datetime.utcnow() - timedelta(days=7)
        sql_query = sql_query.filter(models.Report.created_at >= one_week_ago)
    elif any(w in q_lower for w in ["two weeks", "2 weeks", "14 days"]):
        two_weeks_ago = datetime.utcnow() - timedelta(days=14)
        sql_query = sql_query.filter(models.Report.created_at >= two_weeks_ago)
    elif "today" in q_lower:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0)
        sql_query = sql_query.filter(models.Report.created_at >= today_start)

    # Filter by type heuristics
    if "incident" in q_lower:
        sql_query = sql_query.filter(models.Report.type == models.ReportTypeEnum.incident)
    elif "inspection" in q_lower:
        sql_query = sql_query.filter(models.Report.type == models.ReportTypeEnum.inspection)
    
    # Keyword search if specific topics mentioned
    keywords = ["foundation", "framing", "roof", "scaffold", "crane", "electrical", "concrete", "area b", "area a", "logistics"]
    for kw in keywords:
        if kw in q_lower:
            sql_query = sql_query.filter(
                or_(
                    models.Report.text.ilike(f"%{kw}%"),
                    models.Report.site.has(models.Site.name.ilike(f"%{kw}%"))
                )
            )

    sql_query = sql_query.order_by(models.Report.created_at.desc()).limit(25)
    result = await db.execute(sql_query)
    reports = result.scalars().all()

    # If filter was too narrow and produced 0 results, fall back to recent reports
    if not reports:
        fallback_query = select(models.Report).options(
            selectinload(models.Report.site),
            selectinload(models.Report.images).selectinload(models.Image.detections)
        ).order_by(models.Report.created_at.desc()).limit(20)
        fb_result = await db.execute(fallback_query)
        reports = fb_result.scalars().all()

    referenced_ids = [r.id for r in reports]
    
    # Build sources payload for UI cards
    sources = []
    for r in reports[:8]:
        sources.append({
            "report_id": str(r.id),
            "site_name": r.site.name if r.site else "Site Area",
            "type": r.type.value if hasattr(r.type, "value") else str(r.type),
            "text": r.text,
            "created_at": r.created_at.isoformat(),
            "has_violations": any(img.ai_label == "issue_detected" for img in (r.images or []))
        })

    # Try calling LLM with project grounding
    context_text = "\n".join([
        f"Report ID: {r.id} | Date: {r.created_at.strftime('%Y-%m-%d')} | Site: {r.site.name if r.site else 'Site'} | Type: {r.type.value if hasattr(r.type, 'value') else r.type} | Text: {r.text} | AI Detections: {', '.join([d.class_name for img in (r.images or []) for d in (img.detections or [])]) or 'None'}"
        for r in reports
    ])
    
    prompt = f"""You are the AI Construction Site Intelligence Assistant.
Answer the user's question accurately and concisely using ONLY the following construction site records.
Every factual point or issue mentioned MUST cite the source report ID formatted as [Report #<report_id>].

Project Site Records:
{context_text}

User Question: {query.question}

Answer:"""

    llm_answer = await call_llm_if_available(prompt)
    if not llm_answer:
        llm_answer = generate_grounded_local_response(
            query.question, 
            reports, 
            site_filter_name=reports[0].site.name if reports and reports[0].site else None
        )

    return schemas.AssistantResponse(
        answer=llm_answer,
        referenced_report_ids=referenced_ids,
        sources=sources
    )
