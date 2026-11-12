"""
Resume -> Skill Assessment -> Roadmap learning loop.

Content lives in app/data, one file per field (slug = the bank's file basename, e.g. full_stack):
  assessments/<slug>.json     shared question bank (skill assessment + step gate quizzes)
  learning_paths/<slug>.json  core skills + the 5 roadmap steps with checklist topics
  projects/<slug>.json        Basic / Intermediate / Advanced projects with reference repos
A field without a learning path file has no plan or roadmap yet; adding the files is enough to
switch it on, no code change needed.

Student progress (checklist ticks, quiz attempts, project links) is stored in the database,
never in browser storage.
"""
import datetime
import json
import math
import random
import re
from dataclasses import dataclass, field as dataclass_field
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models import (
    AssessmentLog, ProjectSubmission, ResumeAnalysis, RoadmapTopicCheck, StepQuizAttempt,
    StudentProfile, User,
)
from app.services.assessment_engine import (
    DATA_DIR, DEFAULT_LEVEL, DIFFICULTY_RANK, LEVEL_MIXES, SkillAssessmentEngine, skill_assessment_engine,
)
from app.services.coding_engine import coding_engine

# Step gate quiz: 2 Easy + 2 Intermediate + 1 Advanced from the step, pass with 4/5 (80%)
QUESTIONS_PER_QUIZ = 5
PASS_MARK = 4
QUIZ_MIX = {"Easy": 2, "Intermediate": 2, "Advanced": 1}

# Skill assessment sampling: weak-step questions are 3x as likely, questions from the
# previous attempt a quarter as likely, so retakes see fresh questions on their weak spots.
WEAK_STEP_WEIGHT = 3.0
PREVIOUSLY_SHOWN_FACTOR = 0.25
ASSESSMENT_HISTORY_ATTEMPTS = 3  # wrong answers in the last 3 assessments mark a weak step
QUIZ_HISTORY_ATTEMPTS = 5        # ... and in the last 5 submitted step quizzes

REASON_MISSING = "missing_from_resume"
REASON_WRONG = "answered_wrong"

MAX_CODING_PROBLEMS_PER_STEP = 4
MAX_RECOMMENDATIONS = 5

# Projects score gained the FIRST time each project is submitted. Resubmitting gives nothing.
PROJECT_SCORE_GAIN = {"Basic": 4.0, "Intermediate": 6.0, "Advanced": 8.0}


class FieldNotAvailable(LookupError):
    """Unknown field, or a field whose learning path content has not been written yet."""


def utcnow() -> datetime.datetime:
    # Naive UTC, matching the `datetime.utcnow` column defaults used across the models
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def iso(value: Optional[datetime.datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def level_for_matches(matched_count: Optional[int]) -> str:
    """0-2 core skills on the resume -> Beginner, 3-4 -> Intermediate, 5+ -> Advanced; no resume -> Intermediate."""
    if matched_count is None:
        return DEFAULT_LEVEL
    if matched_count >= 5:
        return "Advanced"
    if matched_count >= 3:
        return "Intermediate"
    return "Beginner"


def pass_mark_for(total: int) -> int:
    """4 of 5; a step with fewer questions in its bank still needs 80%."""
    return math.ceil(total * PASS_MARK / QUESTIONS_PER_QUIZ)


@lru_cache(maxsize=2048)
def _keyword_pattern(keyword: str) -> "re.Pattern[str]":
    # Whole word / phrase: "git" must not match "github", "java" not "javascript".
    # Lowercase keywords match case-insensitively (haystacks are lowercased); a keyword with
    # capitals ("Excel") is case-sensitive, so the verb "excel at" does not count as the tool.
    words = keyword.split() if is_case_sensitive(keyword) else keyword.lower().split()
    body = r"\s+".join(re.escape(w) for w in words)
    return re.compile(rf"(?<![A-Za-z0-9]){body}(?![A-Za-z0-9])")


def is_case_sensitive(keyword: str) -> bool:
    return keyword != keyword.lower()


def keyword_found(keyword: str, haystacks: Iterable[str]) -> bool:
    if not keyword or not keyword.strip():
        return False
    pattern = _keyword_pattern(keyword)
    return any(pattern.search(h) for h in haystacks if h)


# Profile links and e-mail addresses are contact details, not skills: "github.com/aarav" must not
# count as Git. Only well-known profile hosts are stripped, so project URLs (e.g. a Render app) stay.
_PROFILE_LINK = re.compile(
    r"(?:https?://)?(?:www\.)?"
    r"(?:github|gitlab|bitbucket|linkedin|leetcode|kaggle|hackerrank|codechef|codeforces|medium|behance|dribbble)"
    r"\.(?:com|org|io|in)(?:/[^\s,;|)]*)?",
    re.IGNORECASE,
)
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")


def strip_contact_links(text: str) -> str:
    return _EMAIL.sub(" ", _PROFILE_LINK.sub(" ", text))


class LearningPathEngine:
    def __init__(self, data_dir: Path = DATA_DIR, bank: Optional[SkillAssessmentEngine] = None,
                 track_files: Optional[Dict[str, str]] = None, aliases: Optional[Dict[str, str]] = None):
        self.data_dir = Path(data_dir)
        self.bank = bank or SkillAssessmentEngine(self.data_dir / "assessments", track_files, aliases)
        self._cache: Dict[Tuple[str, str], Tuple[Tuple[int, int], Any]] = {}

    # ---------- content loading ----------
    def _load_json(self, kind: str, field: str) -> Optional[Dict[str, Any]]:
        """Reads data/<kind>/<slug>.json, cached until the file changes. None if missing or unreadable."""
        path = self.data_dir / kind / f"{self.bank.slug(field)}.json"
        try:
            stat = path.stat()
            stamp = (stat.st_mtime_ns, stat.st_size)
            cached = self._cache.get((kind, field))
            if cached and cached[0] == stamp:
                return cached[1]
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            self._cache[(kind, field)] = (stamp, data)
            return data
        except FileNotFoundError:
            return None
        except Exception as e:
            # Not cached, so a file that is mid-update is picked up on the next request
            print(f"Warning: Failed to load {kind}/{path.name}: {e}")
            return None

    def clear_cache(self) -> None:
        self._cache.clear()
        self.bank.clear_cache()

    def get_learning_path(self, field: str) -> Optional[Dict[str, Any]]:
        lp = self._load_json("learning_paths", field)
        if not isinstance(lp, dict) or not isinstance(lp.get("steps"), list) or not lp["steps"]:
            return None
        return {
            **lp,
            "core_skills": list(lp.get("core_skills") or []),
            "steps": sorted(lp["steps"], key=lambda s: s["step"]),
        }

    def get_projects(self, field: str) -> List[Dict[str, Any]]:
        data = self._load_json("projects", field)
        projects = data.get("projects") if isinstance(data, dict) else None
        return sorted(projects or [], key=lambda p: p.get("unlock_after_step", 0))

    def resolve_field(self, name: Optional[str]) -> Optional[str]:
        return self.bank.resolve_track(name or "")

    def require_field(self, name: Optional[str]) -> Tuple[str, Dict[str, Any]]:
        """Canonical field + its learning path, or FieldNotAvailable with a message for the 404."""
        field = self.resolve_field(name)
        if field is None:
            raise FieldNotAvailable(
                f"Unknown field '{name}'. Choose one of: {', '.join(self.bank.tracks)}"
            )
        lp = self.get_learning_path(field)
        if lp is None:
            raise FieldNotAvailable(f"Roadmap for {field} is not available yet")
        return field, lp

    @staticmethod
    def step_titles(lp: Dict[str, Any]) -> Dict[int, str]:
        return {s["step"]: s["title"] for s in lp["steps"]}

    def find_topic(self, lp: Dict[str, Any], topic_id: str) -> Optional[Tuple[int, Dict[str, Any]]]:
        for step in lp["steps"]:
            for topic in step.get("topics") or []:
                if topic["id"] == topic_id:
                    return step["step"], topic
        return None

    def find_step(self, lp: Dict[str, Any], step_no: int) -> Optional[Dict[str, Any]]:
        return next((s for s in lp["steps"] if s["step"] == step_no), None)

    def get_project(self, field: str, project_id: str) -> Optional[Dict[str, Any]]:
        return next((p for p in self.get_projects(field) if p.get("id") == project_id), None)

    # ---------- resume -> core skills -> level ----------
    def match_core_skills(
        self, lp: Dict[str, Any], resume_text: Optional[str], extracted_skills: Optional[Iterable[str]]
    ) -> List[Dict[str, Any]]:
        """Each core skill with `matched` = any of its keywords appears as a whole word/phrase in
        the resume text or in the analyzer's extracted skill list. Case-sensitive keywords are
        checked against the original-case resume text only (the extracted list is lowercased)."""
        raw = (resume_text or "").lower()
        text = strip_contact_links(resume_text or "")
        # The analyzer extracted skills from the raw text, so drop any it only saw inside a link
        skills = [
            s.lower() for s in (extracted_skills or []) if isinstance(s, str)
            and not (keyword_found(s, [raw]) and not keyword_found(s, [text.lower()]))
        ]
        lowered = [
            text.lower(),
            # Joined with a separator so a phrase can never span two different skills
            " ; ".join(skills),
        ]

        def found(kw: str) -> bool:
            return keyword_found(kw, [text] if is_case_sensitive(kw) else lowered)

        return [
            {
                "id": skill["id"],
                "name": skill["name"],
                "step": skill["step"],
                "matched": any(found(kw) for kw in skill.get("keywords") or []),
            }
            for skill in lp["core_skills"]
        ]

    def core_skill_summary(
        self, field: str, lp: Dict[str, Any], resume_text: Optional[str], extracted_skills: Optional[Iterable[str]]
    ) -> Dict[str, Any]:
        """`core_skill_match` block returned by the resume analyzer."""
        rows = self.match_core_skills(lp, resume_text, extracted_skills)
        matched = [r["name"] for r in rows if r["matched"]]
        return {
            "field": field,
            "matched": matched,
            "missing": [r["name"] for r in rows if not r["matched"]],
            "matched_count": len(matched),
            "total": len(rows),
            "level": level_for_matches(len(matched)),
        }

    # ---------- weak steps ----------
    def wrong_topics_by_step(
        self,
        field: str,
        assessment_logs: Iterable[AssessmentLog],
        quiz_attempts: Iterable[StepQuizAttempt],
    ) -> Dict[int, List[str]]:
        """Steps (and the topics) the student answered wrong in recent assessments and step quizzes."""
        wrong: Dict[int, List[str]] = {}

        def add(step: Any, topic: Optional[str]) -> None:
            if not isinstance(step, int):
                return
            topics = wrong.setdefault(step, [])
            if topic and topic not in topics:
                topics.append(topic)

        for log in assessment_logs:
            for item in log.questions_data or []:
                if isinstance(item, dict) and item.get("is_correct") is False:
                    add(item.get("step"), item.get("topic"))

        bank = self.bank.get_question_map(field)
        for attempt in quiz_attempts:
            answers = attempt.answers or {}
            for qid in attempt.question_ids or []:
                q = bank.get(qid)
                if q is not None and answers.get(str(qid)) != q["correct"]:
                    add(attempt.step, q["topic"])
        return wrong

    def weak_steps(
        self,
        lp: Dict[str, Any],
        core_skills: Optional[List[Dict[str, Any]]],
        wrong_by_step: Dict[int, List[str]],
    ) -> List[Dict[str, Any]]:
        """Weak steps = steps whose core skills the resume lacks (only when there is a resume,
        `core_skills` is None otherwise) + steps answered wrong recently. Sorted by step."""
        titles = self.step_titles(lp)
        weak: Dict[int, Dict[str, Any]] = {}

        def entry(step: int) -> Dict[str, Any]:
            return weak.setdefault(step, {
                "step": step, "title": titles[step], "reasons": [], "skills": [], "wrong_topics": [],
            })

        for skill in core_skills or []:
            if not skill["matched"] and skill["step"] in titles:
                e = entry(skill["step"])
                if REASON_MISSING not in e["reasons"]:
                    e["reasons"].append(REASON_MISSING)
                e["skills"].append(skill["name"])
        for step, topics in wrong_by_step.items():
            if step in titles:
                e = entry(step)
                e["reasons"].append(REASON_WRONG)
                e["wrong_topics"] = list(topics)
        return [weak[s] for s in sorted(weak)]

    # ---------- adaptive skill assessment ----------
    def draw_assessment(
        self,
        field: str,
        level: str,
        weak_steps: Iterable[int] = (),
        previous_ids: Iterable[int] = (),
        rng: Optional[random.Random] = None,
    ) -> List[Dict[str, Any]]:
        """10 questions in the level's Easy/Intermediate/Advanced mix, weighted towards weak steps
        and away from the questions shown in the previous attempt."""
        weak = set(weak_steps)
        previous = set(previous_ids)

        def weight(q: Dict[str, Any]) -> float:
            w = WEAK_STEP_WEIGHT if q.get("step") in weak else 1.0
            return w * PREVIOUSLY_SHOWN_FACTOR if q["id"] in previous else w

        return self.bank.draw_attempt_questions(field, mix=LEVEL_MIXES[level], weight=weight, rng=rng)

    @staticmethod
    def public_question(q: Dict[str, Any], titles: Optional[Dict[int, str]] = None) -> Dict[str, Any]:
        """Question as sent to the browser: never includes the correct option or explanation."""
        step = q.get("step")
        return {
            "id": q["id"],
            "step": step,
            "step_title": (titles or {}).get(step),
            "topic": q["topic"],
            "difficulty": q["difficulty"],
            "dimension": q["dimension"],
            "question": q["question"],
            "options": q["options"],
        }

    # ---------- roadmap steps & gate quizzes ----------
    @staticmethod
    def step_statuses(lp: Dict[str, Any], passed_steps: Set[int]) -> Dict[int, str]:
        """completed = a passed quiz exists; step N is unlocked when N is the first step or N-1 is
        completed; the first unlocked-but-not-completed step is in_progress, the rest locked."""
        statuses: Dict[int, str] = {}
        in_progress_taken = False
        previous: Optional[int] = None
        for step in (s["step"] for s in lp["steps"]):
            if step in passed_steps:
                statuses[step] = "completed"
            elif not in_progress_taken and (previous is None or statuses[previous] == "completed"):
                statuses[step] = "in_progress"
                in_progress_taken = True
            else:
                statuses[step] = "locked"
            previous = step
        return statuses

    def pick_quiz_questions(
        self,
        field: str,
        step: int,
        shown_history: List[List[int]],
        rng: Optional[random.Random] = None,
    ) -> List[Dict[str, Any]]:
        """2 Easy + 2 Intermediate + 1 Advanced from the step (topped up from its other
        difficulties if short). `shown_history` holds the question ids of this student's earlier
        attempts at the step, oldest first: never-shown questions come first, then the ones shown
        longest ago, so consecutive attempts don't repeat while the bank has enough questions."""
        rng = rng or random
        last_shown: Dict[int, int] = {}
        for index, ids in enumerate(shown_history):
            for qid in ids:
                last_shown[qid] = index

        def freshest_first(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            questions = list(questions)
            rng.shuffle(questions)  # random tie-break; the sort below is stable
            return sorted(questions, key=lambda q: last_shown.get(q["id"], -1))

        pool = [q for q in self.bank.get_assessment_questions(field) if q.get("step") == step]
        picked: List[Dict[str, Any]] = []
        for difficulty, count in QUIZ_MIX.items():
            picked.extend(freshest_first([q for q in pool if q["difficulty"] == difficulty])[:count])
        if len(picked) < QUESTIONS_PER_QUIZ:
            taken = {q["id"] for q in picked}
            rest = freshest_first([q for q in pool if q["id"] not in taken])
            picked.extend(rest[:QUESTIONS_PER_QUIZ - len(picked)])
        picked.sort(key=lambda q: DIFFICULTY_RANK.get(q["difficulty"], len(DIFFICULTY_RANK)))
        return picked

    def score_quiz(self, field: str, question_ids: List[int], answers: Dict[int, int]) -> Dict[str, Any]:
        """Scores only the questions the attempt was issued with."""
        bank = self.bank.get_question_map(field)
        results = []
        for qid in question_ids:
            q = bank.get(qid)
            if q is None:  # removed from the bank since the quiz started
                continue
            chosen = answers.get(qid)
            results.append({
                "id": qid,
                "chosen": chosen,
                "correct_option": q["correct"],
                "is_correct": chosen == q["correct"],
                "explanation": q.get("explanation"),
            })
        total = len(results)
        correct = sum(r["is_correct"] for r in results)
        return {
            "correct": correct,
            "total": total,
            "score": round(correct / total * 100.0, 1) if total else 0.0,
            "passed": total > 0 and correct >= pass_mark_for(total),
            "results": results,
        }

    def coding_problems_for(self, step: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Coding Practice problems on the step's coding topics, easiest first."""
        topics = set(step.get("coding_topics") or [])
        if not topics:
            return []
        problems = [p for p in coding_engine.get_public_problems() if p["topic"] in topics]
        return [
            {"id": p["id"], "title": p["title"], "difficulty": p["difficulty"], "topic": p["topic"]}
            for p in problems[:MAX_CODING_PROBLEMS_PER_STEP]
        ]

    # ---------- projects ----------
    @staticmethod
    def project_payload(
        project: Dict[str, Any], unlocked: bool, submission: Optional[ProjectSubmission]
    ) -> Dict[str, Any]:
        return {
            "id": project["id"],
            "level": project["level"],
            "unlock_after_step": project["unlock_after_step"],
            "unlocked": unlocked,
            "title": project["title"],
            "summary": project.get("summary"),
            "skills": project.get("skills") or [],
            "requirements": project.get("requirements") or [],
            "reference_repo": project.get("reference_repo"),
            "submission": {
                "repo_url": submission.repo_url,
                "notes": submission.notes,
                "submitted_at": iso(submission.submitted_at),
                "updated_at": iso(submission.updated_at),
            } if submission else None,
        }

    # ---------- roadmap payload ----------
    def build_roadmap(
        self,
        field: str,
        lp: Dict[str, Any],
        checked_topic_ids: Set[str],
        attempts: List[StepQuizAttempt],
        submissions: Dict[str, ProjectSubmission],
        weak: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        submitted = [a for a in attempts if a.submitted_at is not None]
        passed_steps = {a.step for a in submitted if a.passed}
        statuses = self.step_statuses(lp, passed_steps)
        weak_by_step = {w["step"]: w for w in weak}

        steps = []
        for st in lp["steps"]:
            n = st["step"]
            topics = [
                {"id": t["id"], "name": t["name"], "checked": t["id"] in checked_topic_ids}
                for t in st.get("topics") or []
            ]
            step_attempts = [a for a in submitted if a.step == n]
            last = max(step_attempts, key=lambda a: (a.submitted_at, a.id)) if step_attempts else None
            steps.append({
                "step": n,
                "title": st["title"],
                "subtitle": st.get("subtitle"),
                "description": st.get("description"),
                "status": statuses[n],
                "is_weak": n in weak_by_step,
                "weak_reasons": weak_by_step[n]["reasons"] if n in weak_by_step else [],
                "topics": topics,
                "checked_count": sum(t["checked"] for t in topics),
                "total_topics": len(topics),
                "quiz": {
                    "attempts": len(step_attempts),
                    "best_correct": max(a.correct or 0 for a in step_attempts) if step_attempts else None,
                    "passed": n in passed_steps,
                    "last_attempt": {
                        "correct": last.correct,
                        "total": last.total,
                        "passed": bool(last.passed),
                        "submitted_at": iso(last.submitted_at),
                    } if last else None,
                },
                "coding_problems": self.coding_problems_for(st),
            })

        projects = [
            self.project_payload(p, statuses.get(p["unlock_after_step"]) == "completed", submissions.get(p["id"]))
            for p in self.get_projects(field)
        ]
        completed = [s for s in steps if s["status"] == "completed"]
        current = next((s for s in steps if s["status"] == "in_progress"), None)
        return {
            "field": field,
            "total_steps": len(steps),
            "completed_steps": len(completed),
            # Once every step is completed the last step stays the current one
            "current_step": current["step"] if current else steps[-1]["step"],
            "questions_per_quiz": QUESTIONS_PER_QUIZ,
            "pass_mark": PASS_MARK,
            "steps": steps,
            "projects": projects,
            "recommended_next_steps": self._recommendations(steps, current, projects, weak),
        }

    @staticmethod
    def _recommendations(
        steps: List[Dict[str, Any]],
        current: Optional[Dict[str, Any]],
        projects: List[Dict[str, Any]],
        weak: List[Dict[str, Any]],
    ) -> List[str]:
        recs: List[str] = []
        if current:
            n, title = current["step"], current["title"]
            unchecked = [t["name"] for t in current["topics"] if not t["checked"]]
            for name in unchecked[:2]:
                recs.append(f"Step {n} ({title}): study {name}")
            target = f"unlock Step {n + 1}" if n < steps[-1]["step"] else "complete the roadmap"
            recs.append(f"Pass the Step {n} quiz ({PASS_MARK}/{QUESTIONS_PER_QUIZ}) to {target}")
            if current["coding_problems"]:
                problem = current["coding_problems"][0]
                recs.append(f"Practice '{problem['title']}' ({problem['topic']}) in Coding Practice")
        for p in projects:
            if p["unlocked"] and not p["submission"]:
                recs.append(f"Build the {p['level']} project '{p['title']}' and submit your GitHub repo")
        for w in weak:
            if not current or w["step"] != current["step"]:
                why = "missing from your resume" if REASON_MISSING in w["reasons"] else "answered wrong recently"
                recs.append(f"Revise Step {w['step']} ({w['title']}): {why}")
        if not recs:
            recs.append("All steps completed: keep your project repos polished and practice mock interviews")
        return recs[:MAX_RECOMMENDATIONS]


learning_path_engine = LearningPathEngine(bank=skill_assessment_engine)


def get_learning_path_engine() -> LearningPathEngine:
    """FastAPI dependency; tests override it to point the loop at fixture content."""
    return learning_path_engine


# ---------- database access for the loop ----------

@dataclass
class LearnerContext:
    resume: Optional[ResumeAnalysis]
    core_skills: List[Dict[str, Any]]
    matched_count: int
    level: str
    weak_steps: List[Dict[str, Any]]
    previous_assessment_ids: Set[int] = dataclass_field(default_factory=set)


async def get_target_role(db: AsyncSession, user: User) -> str:
    res = await db.execute(select(StudentProfile.target_role).where(StudentProfile.user_id == user.id))
    return res.scalars().first() or user.target_role


async def latest_resume(db: AsyncSession, user_id: int) -> Optional[ResumeAnalysis]:
    res = await db.execute(
        select(ResumeAnalysis)
        .where(ResumeAnalysis.user_id == user_id)
        .order_by(ResumeAnalysis.created_at.desc(), ResumeAnalysis.id.desc())
        .limit(1)
    )
    return res.scalars().first()


async def recent_assessment_logs(db: AsyncSession, user_id: int, field: str, limit: int) -> List[AssessmentLog]:
    res = await db.execute(
        select(AssessmentLog)
        .where(AssessmentLog.user_id == user_id, AssessmentLog.track == field)
        .order_by(AssessmentLog.completed_at.desc(), AssessmentLog.id.desc())
        .limit(limit)
    )
    return list(res.scalars().all())


async def quiz_attempts(
    db: AsyncSession, user_id: int, field: str, step: Optional[int] = None
) -> List[StepQuizAttempt]:
    """All of the student's quiz attempts for the field (or one step), oldest first."""
    stmt = select(StepQuizAttempt).where(StepQuizAttempt.user_id == user_id, StepQuizAttempt.field == field)
    if step is not None:
        stmt = stmt.where(StepQuizAttempt.step == step)
    res = await db.execute(stmt.order_by(StepQuizAttempt.started_at.asc(), StepQuizAttempt.id.asc()))
    return list(res.scalars().all())


async def passed_steps(db: AsyncSession, user_id: int, field: str) -> Set[int]:
    res = await db.execute(
        select(StepQuizAttempt.step).where(
            StepQuizAttempt.user_id == user_id,
            StepQuizAttempt.field == field,
            StepQuizAttempt.passed.is_(True),
            StepQuizAttempt.submitted_at.is_not(None),
        ).distinct()
    )
    return set(res.scalars().all())


async def checked_topic_ids(db: AsyncSession, user_id: int, field: str) -> Set[str]:
    res = await db.execute(
        select(RoadmapTopicCheck.topic_id).where(RoadmapTopicCheck.user_id == user_id, RoadmapTopicCheck.field == field)
    )
    return set(res.scalars().all())


async def project_submissions(db: AsyncSession, user_id: int, field: str) -> Dict[str, ProjectSubmission]:
    res = await db.execute(
        select(ProjectSubmission).where(ProjectSubmission.user_id == user_id, ProjectSubmission.field == field)
    )
    return {s.project_id: s for s in res.scalars().all()}


async def load_learner_context(
    engine: LearningPathEngine,
    db: AsyncSession,
    user_id: int,
    field: str,
    lp: Dict[str, Any],
    attempts: Optional[List[StepQuizAttempt]] = None,
) -> LearnerContext:
    """Resume core-skill match, level and weak steps for one student and field."""
    resume = await latest_resume(db, user_id)
    if resume:
        core = engine.match_core_skills(lp, resume.parsed_text, resume.extracted_skills)
        matched_count = sum(s["matched"] for s in core)
        level = level_for_matches(matched_count)
    else:
        core = [{"id": s["id"], "name": s["name"], "step": s["step"], "matched": False} for s in lp["core_skills"]]
        matched_count = 0
        level = level_for_matches(None)

    logs = await recent_assessment_logs(db, user_id, field, ASSESSMENT_HISTORY_ATTEMPTS)
    if attempts is None:
        attempts = await quiz_attempts(db, user_id, field)
    recent_quizzes = sorted(
        (a for a in attempts if a.submitted_at is not None),
        key=lambda a: (a.submitted_at, a.id),
        reverse=True,
    )[:QUIZ_HISTORY_ATTEMPTS]
    wrong = engine.wrong_topics_by_step(field, logs, recent_quizzes)
    weak = engine.weak_steps(lp, core if resume else None, wrong)

    previous_ids = {
        item["id"] for item in (logs[0].questions_data or [])
        if isinstance(item, dict) and "id" in item
    } if logs else set()
    return LearnerContext(resume, core, matched_count, level, weak, previous_ids)


async def build_roadmap_for_user(
    engine: LearningPathEngine, db: AsyncSession, user_id: int, field: str, lp: Dict[str, Any]
) -> Dict[str, Any]:
    attempts = await quiz_attempts(db, user_id, field)
    ctx = await load_learner_context(engine, db, user_id, field, lp, attempts)
    return engine.build_roadmap(
        field,
        lp,
        await checked_topic_ids(db, user_id, field),
        attempts,
        await project_submissions(db, user_id, field),
        ctx.weak_steps,
    )
