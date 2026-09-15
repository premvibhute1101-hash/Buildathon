import os
import re
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, func

from app import schemas, models, deps, database
from app.config import settings

router = APIRouter(prefix="/assistant", tags=["assistant"])

async def call_llm_if_available(prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
    """
    Attempts to call Gemini or OpenAI if API keys are provided in environment or settings.
    """
    sys_instruction = system_prompt or (
        "You are the AI Construction Site Intelligence Copilot. "
        "You have direct access to the live construction project database and computer vision inspection logs. "
        "Answer the user's question accurately, helpfully, and conversationally based on the project records. "
        "Whenever referring to specific events, progress notes, inspections, or safety issues, cite the Report ID formatted as [Report #<id>]. "
        "If answering a greeting, question about capabilities, or general question, answer warmly and reference active site operations."
    )

    # 1. Check Gemini
    gemini_key = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
    if gemini_key and gemini_key.strip() and gemini_key != "dummy_key":
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key.strip())
            full_prompt = f"{sys_instruction}\n\n{prompt}"
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=full_prompt
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
                    {"role": "system", "content": sys_instruction},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
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
    safety detections, and site status to generate a grounded, structured answer
    for ANY user query (preset or manual freeform text).
    """
    q_lower = question.strip().lower()
    total_count = len(reports)
    
    if total_count == 0:
        target = f" in {site_filter_name}" if site_filter_name else " across active site records"
        return f"No reports or site logs were found{target} matching your query."

    # Parse and index project entities
    violations = []
    compliant_images = 0
    total_images = 0
    issues_by_site: Dict[str, Dict[str, Any]] = {}
    reports_by_type = {"progress": 0, "inspection": 0, "incident": 0}
    reports_by_author: Dict[str, List[models.Report]] = {}
    dates = []

    for r in reports:
        dates.append(r.created_at)
        r_type = r.type.value if hasattr(r.type, "value") else str(r.type)
        if r_type in reports_by_type:
            reports_by_type[r_type] += 1
        
        site_name = r.site.name if r.site else "General Site"
        if site_name not in issues_by_site:
            issues_by_site[site_name] = {
                "violations": 0,
                "reports": 0,
                "incidents": 0,
                "progress_count": 0,
                "inspection_count": 0,
                "latest_text": r.text,
                "latest_id": str(r.id),
                "items": []
            }
        issues_by_site[site_name]["reports"] += 1
        issues_by_site[site_name]["items"].append(r)
        if r_type == "incident":
            issues_by_site[site_name]["incidents"] += 1
        elif r_type == "progress":
            issues_by_site[site_name]["progress_count"] += 1
        elif r_type == "inspection":
            issues_by_site[site_name]["inspection_count"] += 1

        author_name = r.user.name if getattr(r, "user", None) else "Field Staff"
        if author_name not in reports_by_author:
            reports_by_author[author_name] = []
        reports_by_author[author_name].append(r)

        for img in (r.images or []):
            total_images += 1
            if img.ai_label == "issue_detected":
                issues_by_site[site_name]["violations"] += 1
                for det in (img.detections or []):
                    violations.append({
                        "report_id": str(r.id),
                        "site": site_name,
                        "class": det.class_name,
                        "confidence": det.confidence,
                        "text": r.text,
                        "date": r.created_at.strftime("%b %d, %Y"),
                        "author": author_name
                    })
            else:
                compliant_images += 1

    date_span_str = ""
    if dates:
        min_date = min(dates).strftime("%b %d")
        max_date = max(dates).strftime("%b %d, %Y")
        date_span_str = f"{min_date} – {max_date}"

    # Category 1: Greetings / Capability inquiries
    if any(q_lower.startswith(g) for g in ["hi", "hello", "hey", "who are you", "what can you do", "help"]):
        lines = [
            "### 👋 Hello! I am your AI Construction Site Intelligence Copilot\n",
            f"I have direct real-time access to **{total_count} project records** across **{len(issues_by_site)} active zones**.",
            f"- **Reporting Period**: {date_span_str}",
            f"- **Verified Detections**: {total_images} photos analyzed by YOLOv8 vision AI ({len(violations)} safety alerts, {compliant_images} compliant)\n",
            "**You can ask me any question about the project, such as:**",
            "- *\"What is the status of the Foundation & Basement?\"*",
            "- *\"Summarize all safety incidents and PPE violations.\"*",
            "- *\"What reports were submitted by Marcus Holloway or Elena?\"*",
            "- *\"Tell me about the HVAC chiller crane lift or concrete pours.\"*",
            "- *\"Which issues have occurred repeatedly?\"*"
        ]
        return "\n".join(lines)

    # Category 2: Author / Inspector / User specific query
    for author_name, author_reports in reports_by_author.items():
        first_name = author_name.split()[0].lower()
        if first_name in q_lower or author_name.lower() in q_lower:
            lines = [
                f"### 👷 Field Reports by **{author_name}**\n",
                f"Found **{len(author_reports)} recorded logs** submitted by {author_name}:\n"
            ]
            for r in author_reports:
                site_name = r.site.name if r.site else "Site"
                r_type = r.type.value if hasattr(r.type, "value") else str(r.type)
                lines.append(f"- **{site_name}** ({r.created_at.strftime('%b %d, %Y')} | *{r_type.upper()}*): {r.text} [Report #{r.id}]")
            return "\n".join(lines)

    # Category 3: Specific Zone / Site Area search
    for site_name, s_data in issues_by_site.items():
        # Match e.g. "area b", "basement", "roof", "warehouse", "electrical", "switchgear", "foundation"
        site_keywords = [w.lower() for w in re.split(r'[\s\-_&]+', site_name) if len(w) > 2]
        if any(kw in q_lower for kw in site_keywords) or site_name.lower() in q_lower:
            lines = [
                f"### 📍 Site Status: **{site_name}**\n",
                f"- **Total Records**: {s_data['reports']} logs ({s_data['progress_count']} progress, {s_data['inspection_count']} inspections, {s_data['incidents']} incidents)",
                f"- **Safety Alerts / Violations**: {s_data['violations']} flagged\n",
                "#### 📝 Zone Log Entries:"
            ]
            for r in s_data["items"][:6]:
                r_type = r.type.value if hasattr(r.type, "value") else str(r.type)
                author = r.user.name if getattr(r, "user", None) else "Field Staff"
                lines.append(f"- **{r.created_at.strftime('%b %d')}** (*{r_type.title()}* by {author}): {r.text} [Report #{r.id}]")
            
            site_violations = [v for v in violations if v["site"] == site_name]
            if site_violations:
                lines.append("\n#### 🚨 Flagged Safety Issues:")
                for v in site_violations[:4]:
                    v_name = "Missing Hardhat" if "hardhat" in v["class"] else "Missing Safety Vest"
                    lines.append(f"- **{v_name}** ({v['date']}): {v['text']} [Report #{v['report_id']}] *(Confidence: {int(v['confidence']*100)}%)*")
            return "\n".join(lines)

    # Category 4: Recurring Issues / Repeated Patterns
    if any(w in q_lower for w in ["repeat", "recur", "frequent", "pattern", "trend", "often"]):
        if not violations:
            return f"### ✅ Recurring Safety Analysis\n\nNo recurring PPE safety violations were detected across the {total_count} reports reviewed. All site visual inspections are currently compliant."
        
        grouped: Dict[tuple, List[str]] = {}
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

    # Category 5: Metrics & Counts
    if any(w in q_lower for w in ["how many", "total count", "statistics", "metric", "compliance rate"]):
        compliance_pct = round((compliant_images / total_images * 100), 1) if total_images > 0 else 100.0
        return f"""### 📊 Project Intelligence & Compliance Metrics

- **Total Field Reports**: {total_count} records
- **Active Zones Monitored**: {len(issues_by_site)} site areas
- **Progress Updates**: {reports_by_type.get('progress', 0)} logs
- **Safety Inspections**: {reports_by_type.get('inspection', 0)} audits
- **Incident Reports**: {reports_by_type.get('incident', 0)} incidents
- **Computer Vision PPE Compliance**: **{compliance_pct}%** ({compliant_images} compliant / {total_images} photos analyzed)
- **Flagged Safety Violations**: {len(violations)} infractions
"""

    # Category 6: Specific Topic / Keyword Search (e.g. "concrete", "chiller", "crane", "drainage", "scaffold", "sprinkler", etc.)
    matching_reports = []
    stop_words = {"the", "what", "where", "when", "which", "how", "who", "are", "is", "was", "were", "there", "any", "tell", "about", "give", "show", "me", "find", "and", "for", "with", "from", "this", "that", "these", "those", "have", "been", "done"}
    query_tokens = [w for w in re.findall(r'\b[a-zA-Z0-9_-]+\b', q_lower) if w not in stop_words and len(w) >= 3]

    if query_tokens:
        for r in reports:
            r_text_lower = r.text.lower()
            site_name_lower = r.site.name.lower() if r.site else ""
            matches = sum(1 for t in query_tokens if t in r_text_lower or t in site_name_lower)
            if matches > 0:
                matching_reports.append((matches, r))

    if matching_reports:
        matching_reports.sort(key=lambda x: (x[0], x[1].created_at), reverse=True)
        top_matches = [r for _, r in matching_reports[:5]]
        lines = [
            f"### 🔍 Search Findings for: *\"{question}\"*\n",
            f"Found **{len(matching_reports)} relevant records** across active site logs:\n"
        ]
        for r in top_matches:
            site_name = r.site.name if r.site else "Site"
            r_type = r.type.value if hasattr(r.type, "value") else str(r.type)
            author = r.user.name if getattr(r, "user", None) else "Staff"
            lines.append(f"- **{site_name}** ({r.created_at.strftime('%b %d, %Y')} | *{r_type.title()}* by {author}): {r.text} [Report #{r.id}]")
        return "\n".join(lines)

    # Category 7: Safety & Infractions
    if any(w in q_lower for w in ["safety", "issue", "violation", "incident", "hazard", "ppe", "hardhat", "vest", "danger", "problem"]):
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

    # Category 8: Progress / Weekly / Default Comprehensive Response
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
    q_lower = query.question.strip().lower()
    
    # 1. Base query for reports with loaded relationships
    sql_query = select(models.Report).options(
        selectinload(models.Report.site),
        selectinload(models.Report.user),
        selectinload(models.Report.images).selectinload(models.Image.detections)
    )

    # Filter by explicit site_id if given
    if query.site_id:
        sql_query = sql_query.filter(models.Report.site_id == query.site_id)
    
    # Fetch recent reports up to 40
    sql_query = sql_query.order_by(models.Report.created_at.desc()).limit(40)
    result = await db.execute(sql_query)
    all_reports = result.scalars().all()

    # If no reports at all, return empty response
    if not all_reports:
        return schemas.AssistantResponse(
            answer="No project reports or site logs are currently recorded in the system. Create a report or inspect a site to begin.",
            referenced_report_ids=[],
            sources=[]
        )

    # 2. Score and rank reports based on the user's manual text
    stop_words = {"the", "what", "where", "when", "which", "how", "who", "are", "is", "was", "were", "there", "any", "tell", "about", "give", "show", "me", "find", "and", "for", "with", "from", "this", "that", "these", "those", "have", "been", "done", "please"}
    query_tokens = [w for w in re.findall(r'\b[a-zA-Z0-9_-]+\b', q_lower) if w not in stop_words and len(w) >= 3]

    scored_reports = []
    for r in all_reports:
        score = 0
        r_text_l = r.text.lower()
        site_name_l = r.site.name.lower() if r.site else ""
        user_name_l = r.user.name.lower() if getattr(r, "user", None) else ""
        r_type_l = r.type.value.lower() if hasattr(r.type, "value") else str(r.type).lower()

        for t in query_tokens:
            if t in r_text_l:
                score += 3
            if t in site_name_l:
                score += 4
            if t in user_name_l:
                score += 4
            if t in r_type_l:
                score += 2
            for img in (r.images or []):
                for det in (img.detections or []):
                    if t in det.class_name.lower():
                        score += 3

        scored_reports.append((score, r))

    # If we found matches with positive score, prioritize them; else use all recent
    scored_reports.sort(key=lambda x: (x[0], x[1].created_at), reverse=True)
    
    # Select top relevant reports for LLM grounding
    if any(s > 0 for s, _ in scored_reports):
        relevant_reports = [r for s, r in scored_reports if s > 0]
        # Include a few extra context reports
        for _, r in scored_reports:
            if r not in relevant_reports and len(relevant_reports) < 15:
                relevant_reports.append(r)
    else:
        relevant_reports = all_reports[:20]

    referenced_ids = [r.id for r in relevant_reports]

    # Build sources payload for UI cards
    sources = []
    for r in relevant_reports[:8]:
        sources.append({
            "report_id": str(r.id),
            "site_name": r.site.name if r.site else "Site Area",
            "type": r.type.value if hasattr(r.type, "value") else str(r.type),
            "text": r.text,
            "created_at": r.created_at.isoformat(),
            "has_violations": any(img.ai_label == "issue_detected" for img in (r.images or []))
        })

    # Prepare grounded context for GenAI LLM
    context_blocks = []
    for r in relevant_reports:
        author = r.user.name if getattr(r, "user", None) else "Field Staff"
        detections_list = []
        for img in (r.images or []):
            for d in (img.detections or []):
                detections_list.append(f"{d.class_name} (conf: {int(d.confidence*100)}%)")
        det_str = ", ".join(detections_list) if detections_list else "None (Compliant)"
        
        context_blocks.append(
            f"Report ID: {r.id}\n"
            f"Date: {r.created_at.strftime('%Y-%m-%d %H:%M')}\n"
            f"Site/Area: {r.site.name if r.site else 'Site'}\n"
            f"Author/Role: {author}\n"
            f"Type: {r.type.value if hasattr(r.type, 'value') else r.type}\n"
            f"Content: {r.text}\n"
            f"AI Vision Detections: {det_str}\n"
        )
    
    context_text = "\n---\n".join(context_blocks)
    
    prompt = f"""You are the AI Construction Site Intelligence Copilot.
Answer the user's question accurately and concisely using the provided live construction site database records.
Ground all your facts in these records. Whenever you mention a specific finding, progress milestone, incident, or inspection note, cite its Report ID formatted as [Report #<report_id>].

Project Site Records:
{context_text}

User Question: {query.question}

Answer:"""

    llm_answer = await call_llm_if_available(prompt)
    if not llm_answer:
        llm_answer = generate_grounded_local_response(
            query.question, 
            relevant_reports, 
            site_filter_name=relevant_reports[0].site.name if relevant_reports and relevant_reports[0].site else None
        )

    return schemas.AssistantResponse(
        answer=llm_answer,
        referenced_report_ids=referenced_ids,
        sources=sources
    )
