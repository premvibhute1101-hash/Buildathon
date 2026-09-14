# PS1 — Construction Site Intelligence Platform
## MVP Roadmap (24-Hour Buildathon, 2–3 Person Team)

---

## 1. Ruthless Scoping — What's In, What's Out

With 24 hours and 2-3 people, you cannot build all 6 mandatory sections in full. Pick a **thin, working slice** of every mandatory category so nothing is missing from the rubric, and go deep on **one strong AI/ML capability** (PPE detection — you already have datasets for this).

### IN (MVP scope)
| Requirement | Scope |
|---|---|
| A. Project/Site Management | 1 project → multiple sites/areas (flat list, no nested floors) |
| B. Site Data Collection | Image upload + text observation form only (skip material records) |
| C. Database | Postgres, 6–7 tables, simple FKs |
| D. AI/ML | **PPE detection** (hard hat / vest presence) via pretrained YOLOv8 fine-tuned or used as-is |
| E. Dashboard | 4–5 stat cards + recent activity feed + issue list |
| F. Search | Basic filter by site/area/date/keyword (skip NLP search) |
| G. GenAI Assistant | Single chat endpoint, RAG-lite over stored reports/incidents |

### OUT (cut without guilt)
- Multi-level org hierarchy (floors/buildings)
- Role-based permission granularity (just 2 roles: Admin, Site User)
- OCR, voice-to-text, before/after image comparison
- Real-time dashboards / websockets
- Geospatial mapping
- Progress-analysis-from-images
- Automated notifications
- Risk scoring / delay prediction (mention as "future work" in your pitch, don't build it)

**Golden rule:** every cut item should still get a line in your README under "Future Roadmap" — judges reward awareness of scope, not just what you built.

---

## 2. Team Split (2–3 people)

### If 3 people:
- **Person A — Backend + DB:** API, schema, auth, file storage
- **Person B — Frontend:** upload flow, dashboard, chat UI
- **Person C — AI/ML + GenAI:** PPE detection pipeline, GenAI assistant, demo data seeding

### If 2 people:
- **Person A:** Backend + DB + AI/ML integration (the detection model is mostly "call an API/script," not novel research — one person can own backend + ML glue)
- **Person B:** Frontend + GenAI assistant UI + demo prep

Whoever finishes their core piece first floats to help polish the demo — don't let anyone sit idle after hour 16.

---

## 3. Tech Stack (optimized for speed, not scale)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + Tailwind | Fast scaffolding, SSR not needed, one deploy target |
| Backend | FastAPI (Python) | Same language as your ML code — no context switching, auto-generated docs |
| Database | PostgreSQL (Supabase or Neon free tier) | Managed, instant, gives you auth + storage for free if using Supabase |
| File storage | Supabase Storage or local disk + static serving | Skip S3 setup overhead |
| AI/ML (PPE) | **Ultralytics YOLOv8** pretrained on your Hard Hat Workers Dataset | Don't train from scratch — fine-tune for 15–30 min max, or use a pretrained checkpoint straight from Roboflow Universe if one exists for hard-hat/vest detection |
| GenAI | Claude API or OpenAI API, simple RAG: pull matching rows from Postgres by keyword/site/date, stuff into prompt context | Skip a vector DB — for MVP scale (dozens of reports), keyword + SQL filtering is faster to build than embeddings and just as effective for the demo |
| Deployment | Vercel (frontend) + Render/Railway (backend) | Free tier, deploy-on-push, no DevOps time sunk |

---

## 4. Database Schema (minimal but relationship-correct)

```
users        (id, name, email, role)
projects     (id, name, status, created_by)
sites        (id, project_id, name)          -- "site" doubles as area/zone
reports      (id, site_id, user_id, type[progress|inspection|incident], text, created_at)
images       (id, report_id, url, ai_label, ai_confidence)
detections   (id, image_id, class[hardhat|no_hardhat|vest|no_vest], bbox, confidence)
```

This satisfies the "appropriate relationships" requirement (Projects → Sites → Reports → Images → Detections) without over-engineering.

---

## 5. AI/ML Component — PPE Detection (your core differentiator)

1. Use the **Hard Hat Workers Dataset** (Northeastern) or the **Mendeley PPE Detection Dataset** — check which is already in YOLO format; that saves conversion time.
2. If a pretrained hard-hat-detection model exists on Roboflow Universe, **start from it** and fine-tune briefly on your dataset rather than training from scratch. This is the single biggest time-saver in the whole build.
3. Wrap inference in a small FastAPI endpoint: `POST /detect` → image in, JSON out (`{class, confidence, bbox}` per detection).
4. On every image upload, call this endpoint synchronously and store results in `detections`. Auto-flag images with `no_hardhat` or `no_vest` as an "issue" that shows up on the dashboard and issue list.
5. Be ready to explain: model architecture (YOLOv8n is fine), dataset size/split, training time, mAP if you have it, and why detection (not classification) was chosen — judges will ask.

**Time-box:** 3–4 hours max for training/fine-tuning. If it's not converging well by then, fall back to the pretrained checkpoint as-is and spend saved time on integration polish — a working demo with an off-the-shelf model beats a half-trained custom one.

---

## 6. GenAI Assistant — Keep It Grounded, Not Generic

Minimum viable version:
1. User types a question in a chat box (e.g., "What safety issues were found this week?").
2. Backend does a simple SQL query filtered by keywords/date extracted from the question (or just pass the last N reports for the relevant site as context — don't overthink extraction).
3. Stuff those rows into an LLM prompt: *"Here is site data: [reports]. Answer the user's question using only this data. Cite report IDs."*
4. Return the answer, referencing report/incident IDs so it's clearly "grounded," not a generic chatbot — this directly satisfies the rubric requirement.

Skip: vector embeddings, LangChain, agentic tool-calling. A well-crafted single prompt is enough for MVP and is much faster to get working reliably.

---

## 7. 24-Hour Hour-by-Hour Timeline

| Hours | Milestone |
|---|---|
| 0–1 | Finalize scope (this doc), split tasks, set up repo, deploy skeletons (empty frontend + backend talking to each other) |
| 1–3 | DB schema live, seed script with dummy projects/sites/reports for demo fallback |
| 1–4 | ML: get dataset loaded, start fine-tuning / verify pretrained model works on sample images |
| 3–6 | Backend: CRUD APIs for projects/sites/reports/images |
| 4–8 | ML: finish training, wrap in inference endpoint, integrate into upload flow |
| 6–10 | Frontend: upload flow, site/report list views |
| 8–12 | Frontend: dashboard (stat cards, issue feed) |
| 10–14 | GenAI: build prompt-and-query pipeline, wire to chat UI |
| 14–16 | Integration pass — full flow works end-to-end once, uninterrupted |
| 16–18 | Seed realistic demo data (good + bad PPE images, varied reports) so the demo tells a story |
| 18–20 | Bug bash — only fix what's visible in the demo path |
| 20–22 | Architecture diagram, README, prep slides |
| 22–23 | Full demo dry run, timed |
| 23–24 | Buffer / sleep-deprived contingency |

**Checkpoint discipline:** at hour 14, if the AI/ML or GenAI piece isn't integrated yet, cut something else (search, filters) rather than the AI components — those are graded most heavily.

---

## 8. Demo Script (what judges will actually see)

1. Show project/site setup (30 sec, don't dwell)
2. Upload a site photo missing PPE → detection fires → issue auto-appears on dashboard
3. Upload a compliant photo → contrast the result
4. Show dashboard with a few days of seeded data — trends look real, not empty
5. Ask GenAI assistant a grounded question, show it citing actual report IDs
6. Close with "Future Roadmap" slide: risk scoring, recurring-issue detection, geospatial mapping — shows you understood the full spec even though you scoped down

---

## 9. Deliverables Checklist (map to what's graded)

- [ ] Working app (deployed link, not just localhost)
- [ ] Source code (clean repo, README with setup steps)
- [ ] Schema diagram (even a quick dbdiagram.io export is fine)
- [ ] Architecture diagram (frontend → backend → DB → ML endpoint → LLM API, one box diagram)
- [ ] AI/ML write-up: dataset used, model, training approach, sample output
- [ ] GenAI write-up: how grounding works, example query/response
- [ ] Demo walkthrough rehearsed and timed under 5 minutes

---

## 10. Biggest Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Model training doesn't converge in time | Fall back to pretrained checkpoint from Roboflow Universe, use as-is |
| Frontend/backend integration eats hours | Agree on API contract (endpoints + JSON shapes) in hour 0, build against mocks in parallel |
| Demo data looks empty/fake | Dedicate hour 16–18 explicitly to seeding — a populated dashboard reads as "real product" |
| Running out of time on GenAI | The SQL-filter-then-prompt approach is deliberately low-effort; don't upgrade to real RAG under time pressure |

Good luck — the dataset head start on PPE detection is your biggest edge here, lean into it as the centerpiece of the demo.
