# SMART PLACED AI

**Assess. Learn. Practice. Improve. Get Placed.**  
*An AI-Powered Career Intelligence, Placement Readiness & Adaptive Interview Preparation Platform*  
**VIT Bhopal University · Course DSN4091 · Capstone Project Phase 1 · Review 1**

---

## 1. Project Overview & Scope Boundary

**SMART PLACED AI** replaces fragmented career preparation tools with a continuous, closed-loop placement intelligence ecosystem. Rather than offering a generic chatbot or disconnected quizzes, it tracks a student's competencies across **Nine Normalized Dimensions**, generates an objective **0–100 Placement Readiness Score**, and refreshes a prioritized list of **AI Next Actions (P1–P5)** after every practice activity.

### Strict Scope Boundary: Phase 1 Core (MVP)
Per Slide 12, this MVP prototype implements:
- ✅ Student profile & authentication (JWT-secured)
- ✅ Target-role selection (*AI / ML Engineer*, *Full Stack Developer*, *Cloud / DevOps Engineer*)
- ✅ Resume-based AI skill assessment: 10 questions whose Easy / Intermediate / Advanced mix follows how many of the field's core skills the resume shows (0–2 → 5/4/1, 3–4 → 3/4/3, 5+ → 2/3/5; no resume → 3/4/3), with extra questions on missing skills and topics answered wrong before; scored across 5 dimensions
- ✅ Resume analyzer (NLP text extraction, ESCO-informed taxonomy skill extraction, ATS formatting checks, metric detection, role gap identification)
- ✅ Skill-gap engine (Candidate profile vs. Target Role JD matrix difference)
- ✅ Dynamic Placement Readiness Engine (innovative weighted 9-dimension composite score)
- ✅ 5-step learning roadmap per field: study checklists, a gate quiz per step (5 questions, pass with 4/5, retakes get new questions) that unlocks the next step, links to Coding Practice problems, and 3 portfolio projects (Basic / Intermediate / Advanced) with verified reference repos and GitHub-link submission — all progress stored in the database
- ✅ One shared question bank per field (~60 questions tagged by field, roadmap step and difficulty) used by both the assessment and the gate quizzes, for all 6 fields
- ✅ Project & coding recommendations tied to detected gaps
- ✅ Text-based adaptive HR & technical mock interviews with rubric-anchored scoring
- ✅ Basic coding practice & evaluation sandbox runner
- ✅ Student Dashboard (The "Udemy/Scalar" Hub)
- ✅ First-time registration form after sign-in (name, age, college, CGPA, 10th/12th %, UG CGPA, work experience, photo)
- ✅ Candidate Profile dashboard with editable details, profile photo and profile-strength tracking
- ✅ Settings: light / dark / system theme and interface language (English, हिन्दी, Español, Français, Deutsch)

*Extended modules (voice analysis, certificate OCR, multi-tenant admin portals) are explicitly excluded from Phase 1 per university specification.*

---

## 2. Design Language & Visual Identity (Strict Adherence)

Directly matching Slides 07, 11, and 12:
- **Background**: `#F1EEE3` (Warm Off-white / Cream)
- **Main Accent & Text**: `#1C4A57` (Deep Teal / Navy Slate)
- **Interactive Cards / Highlights**: `#CFE3E0` (Light Slate Teal) and `#EAE5D6` (Cream-Yellow)
- **Low Score / Critical Gap Alert**: `#D95D39` (Coral / Rust)
- **High Proficiency / Verified Skill**: `#2E7D68` (Deep Sage / Emerald)
- **Layout Influences**: **Udemy** (clarity of card modules and progress tracking) and **Scalar** (structured multi-stage prerequisite roadmaps with connected step nodes).

---

## 3. Technology Stack (Diagram in Slide 11)

- **Frontend**: React.js 18 + Tailwind CSS (customized palette) + Lucide Icons + Vite
- **Backend API**: FastAPI (Python 3.13) + Uvicorn + JWT (HS256) + Pydantic v2
- **Database**: SQLAlchemy ORM with PostgreSQL support (`DATABASE_URL`) and automatic SQLite fallback (`smart_placed_ai.db`) for instant standalone demonstration.
- **AI/ML & NLP Layer**:
  - Scikit-learn (TF-IDF vectorizer, cosine similarity matching)
  - Custom ESCO-informed canonical technical taxonomy (200+ skills)
  - Rubric-anchored structured JSON LLM evaluator with Gemini/OpenAI integration and deterministic fallback engine

---

## 4. The 9 Tracked Dimensions & Algorithmic Core

The prototype dynamically tracks:
1. **Python** ($d_1$)
2. **SQL** ($d_2$)
3. **Machine Learning** ($d_3$)
4. **Deep Learning** ($d_4$)
5. **DSA / Coding** ($d_5$)
6. **Projects** ($d_6$)
7. **Resume Quality** ($d_7$)
8. **Interview Readiness** ($d_8$)
9. **Communication Readiness** ($d_9$)

### Dynamic Placement Readiness Score Formula
$$\text{PRS} = \mathrm{round}\left(\sum_{i=1}^{9} w_i^{(R)} \cdot d_i + \text{Synergy}\right)$$
For the **AI / ML Engineer** prototype baseline from Slide 07:
- Python 85%, SQL 60%, ML 75%, Deep Learning 45% (coral), DSA 55%, Projects 60%, Resume Quality 80%, Interview Readiness 50%, Communication Readiness 65%.
- Calculated Score = **68 / 100** (Advanced Tier).

### AI Priority Deficit & Action Ranking (P1–P5)
$$\Delta_i = w_i^{(R)} \cdot (100 - d_i) \cdot u_i$$
- **P1**: Improve weakest technical competency $\to$ Deep Learning (45%) $\to$ targeted module + practice set
- **P2**: Strengthen coding / problem solving $\to$ DSA (55%) $\to$ timed practice, evaluated
- **P3**: Build a relevant project $\to$ End-to-end ML project aligned to the role
- **P4**: Improve resume gaps $\to$ Add project evidence and missing role keywords
- **P5**: Practice targeted technical interviews $\to$ Questions weighted toward DL and DSA gaps

---

## 5. Quick Start & Execution

### Pre-requisites
- Python 3.10+
- Node.js 18+

### Step 1: Run the Unified Server
Run the FastAPI backend server (which automatically serves the compiled React frontend at the root):
```powershell
cd C:\Users\VICTUS\.gemini\antigravity\scratch\smart_placed_ai\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser!

### Step 2 (Optional): Development Mode with Hot Reloading
If you want to run Vite dev server separately:
```powershell
# In terminal 1 (Backend):
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# In terminal 2 (Frontend):
cd frontend
& "C:\Program Files\nodejs\npm.cmd" run dev
```
Access Vite dev server at **http://localhost:5173**.

### Pre-configured Seed User
- **Email**: `alex.chen@university.edu`
- **Password**: `password123`
*(Auto-logs in on first browser launch!)*

---

## 6. Running Automated Verification Suites

To verify all 8 intelligence engines:
```powershell
cd backend
python test_suite.py
```
To verify the closed-loop feedback lifecycle:
```powershell
cd backend
python test_closed_loop.py
```

---

## 7. Capstone Project Team (VIT Bhopal University)
- **Ritwik Singh** (23BCE11204) — AI/ML · Skill Assessment · Placement Readiness Engine
- **Deep Talreja** (23BCE11003) — AI/NLP · Resume Intelligence · Interview Evaluation
- **Shaurya Bhadoria** (23BCE10918) — Frontend · Student Dashboard · Interview UI
- **Saral Saxena** (23BCE10040) — Backend · APIs · Authentication · Database
- **Utsav Raj** (23BCE10920) — Recommendation Engine · Roadmap · Analytics · Integration
- **Faculty Supervisor**: Dr. Buvaneswari PR
- **Review Panel**: Dr. Sharmila Joseph, Dr. Sandeep Moonga
