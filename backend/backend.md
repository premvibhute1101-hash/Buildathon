# Antigravity Prompt — PS1 Construction Site Intelligence Backend

Copy everything below the line into Antigravity as your task prompt.

---

You are building the **backend** for a Construction Site Intelligence Platform MVP for a 24-hour buildathon. Prioritize a working, demoable system over completeness. Follow this spec exactly; where something is ambiguous, choose the simplest option that still satisfies the requirement.

## Tech Stack
- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL, accessed via SQLAlchemy (async) + Alembic for migrations
- **File storage:** Local disk under `/uploads`, served via a static route (no S3/cloud storage needed for MVP)
- **ML integration:** A separate `/detect` endpoint that wraps a YOLOv8 (Ultralytics) inference call
- **GenAI integration:** An `/assistant/query` endpoint that calls an LLM API (Anthropic or OpenAI — use environment variable `LLM_API_KEY` and make the provider swappable via a `LLM_PROVIDER` env var)
- **Auth:** Simple JWT-based auth, two roles only: `admin`, `site_user`
- **Docs:** Rely on FastAPI's auto-generated OpenAPI/Swagger docs at `/docs` — don't hand-write separate API documentation

## Database Schema

Implement exactly these tables (SQLAlchemy models + Alembic migration):

```
users
  id (PK, uuid)
  name (str)
  email (str, unique)
  password_hash (str)
  role (enum: admin, site_user)
  created_at (timestamp)

projects
  id (PK, uuid)
  name (str)
  status (enum: active, completed, on_hold)
  created_by (FK -> users.id)
  created_at (timestamp)

sites
  id (PK, uuid)
  project_id (FK -> projects.id)
  name (str)
  created_at (timestamp)

reports
  id (PK, uuid)
  site_id (FK -> sites.id)
  user_id (FK -> users.id)
  type (enum: progress, inspection, incident)
  text (text)
  created_at (timestamp)

images
  id (PK, uuid)
  report_id (FK -> reports.id)
  url (str)
  ai_label (str, nullable)       -- e.g. "issue_detected" / "compliant"
  ai_confidence (float, nullable)
  created_at (timestamp)

detections
  id (PK, uuid)
  image_id (FK -> images.id)
  class_name (str)               -- hardhat | no_hardhat | vest | no_vest
  confidence (float)
  bbox_x (float)
  bbox_y (float)
  bbox_w (float)
  bbox_h (float)
```

Add appropriate indexes on all foreign keys and on `reports.created_at` (used for dashboard/date filtering).

## Required Endpoints

### Auth
- `POST /auth/register` — create user (name, email, password, role)
- `POST /auth/login` — return JWT

### Projects & Sites
- `POST /projects` — create project (admin only)
- `GET /projects` — list projects
- `POST /projects/{project_id}/sites` — create site under a project
- `GET /projects/{project_id}/sites` — list sites for a project

### Reports & Images
- `POST /sites/{site_id}/reports` — create a report (type, text). Accepts optional image file(s) in the same multipart request.
- `GET /sites/{site_id}/reports` — list reports for a site, with query params: `type`, `date_from`, `date_to`, `keyword` (simple `ILIKE` search on `text`)
- `GET /reports/{report_id}` — full report detail including linked images and their detections

### Image Upload + Detection Pipeline
- When an image is uploaded as part of a report:
  1. Save the file to `/uploads`, create an `images` row
  2. Synchronously call the internal `/detect` inference function with the saved file path
  3. Store each returned detection as a row in `detections`
  4. If any detection has `class_name` in (`no_hardhat`, `no_vest`) and `confidence > 0.5`, set `images.ai_label = "issue_detected"`; otherwise `"compliant"`
  5. Return the report object including image + detection results in the response

### Dashboard
- `GET /dashboard/summary` — returns:
  ```json
  {
    "total_reports": int,
    "total_issues": int,
    "issues_this_week": int,
    "recent_activity": [ {report summary, last 10} ],
    "issues_by_site": [ {site_name, issue_count} ]
  }
  ```

### GenAI Assistant
- `POST /assistant/query` — body: `{ "question": str, "site_id": optional str }`
  - Implementation: run a simple filtered query against `reports` (and joined `images`/`detections`) — filter by `site_id` if provided, and by any date/keyword hints naively extracted from the question (don't build NLP entity extraction — basic heuristics are fine, e.g. look for "this week," "today," a site name match)
  - Pull the most relevant ~15–20 rows, format them as a compact text block with their `report_id`s
  - Send to the LLM with a system prompt instructing it to answer **only** using the provided data and to cite `report_id`s in its answer
  - Return `{ "answer": str, "referenced_report_ids": [str] }`

## Non-Functional Requirements
- CORS enabled for the frontend's dev and deployed origin
- Environment config via `.env` (DB URL, JWT secret, LLM API key/provider, upload dir)
- Seed script (`seed.py`) that creates: 1 admin user, 1 project, 3 sites, ~15 reports spread across the past 2 weeks with realistic construction-safety text, and a mix of compliant/non-compliant demo images if sample images are available in `/seed_images`
- Dockerfile + `docker-compose.yml` (app + Postgres) so the whole backend can be started with `docker compose up`
- Basic error handling: return proper 4xx with clear messages for validation errors, 404 for missing resources, 401/403 for auth failures

## Explicitly Out of Scope — Do Not Build
- Multi-level site hierarchy (floors/buildings)
- Granular permissions beyond the two roles
- OCR, voice-to-text, geospatial features
- WebSockets / real-time updates
- Vector database / embeddings — the keyword+SQL filtering above is intentional and sufficient
- Notification system (email/SMS)
- Risk scoring or delay prediction models

## Deliverable Checklist
- [ ] Runs via `docker compose up` with no manual DB setup steps
- [ ] `/docs` shows complete, working Swagger UI for all endpoints above
- [ ] Seed script populates realistic demo data on first run
- [ ] `/detect` correctly stores detection rows and flags images
- [ ] `/assistant/query` returns answers that cite real `report_id`s from the DB, not hallucinated ones
- [ ] README with setup steps (env vars needed, how to run, how to re-seed)

Build this incrementally: schema + migrations first, then CRUD endpoints, then the image/detection pipeline, then the dashboard aggregation query, then the GenAI endpoint last (it depends on everything else existing). After each stage, confirm it works against the seed data before moving on.

---

**Note before you run this:** swap in your actual LLM provider/model name and confirm your YOLO inference function's expected input/output shape matches the `/detect` call above — adjust the detection class names if your trained model uses different labels.
