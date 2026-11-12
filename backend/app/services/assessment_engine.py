import json
import random
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

# Shared question bank, one JSON file per field. The SAME bank feeds the resume-adaptive skill
# assessment and the roadmap step gate quizzes, so every question is tagged with its field,
# roadmap `step` (1-5), `difficulty` (Easy / Intermediate / Advanced), topic and one of the
# 5 evaluation dimensions (SVG specification).
# Correct answers live only in these files and never leave the backend before submission.
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
QUESTION_BANK_DIR = DATA_DIR / "assessments"

TRACK_FILES = {
    "AI / ML Engineer": "ai_ml.json",
    "Full Stack Developer": "full_stack.json",
    "Cloud / DevOps Engineer": "cloud_devops.json",
    "Game Developer": "game_development.json",
    "Data Analyst": "data_analyst.json",
    "Data Engineer": "data_engineer.json",
}

# Alternate names the frontend, older clients and the source documents use for each track
TRACK_ALIASES = {
    "ai / ml": "AI / ML Engineer",
    "ai-ml engineer": "AI / ML Engineer",
    "ai/ml engineer": "AI / ML Engineer",
    "full stack": "Full Stack Developer",
    "full stack engineer": "Full Stack Developer",
    "cloud": "Cloud / DevOps Engineer",
    "cloud & devops engineer": "Cloud / DevOps Engineer",
    "cloud and devops engineer": "Cloud / DevOps Engineer",
    "game development": "Game Developer",
}

DIMENSIONS = [
    "Concept Understanding",
    "Problem Solving",
    "Practical Knowledge",
    "System Design",
    "Technical Communication",
]

DIFFICULTIES = ("Easy", "Intermediate", "Advanced")
DIFFICULTY_RANK = {d: i for i, d in enumerate(DIFFICULTIES)}
# Banks written before the 5-step roadmap used "Beginner" for the easiest questions
LEGACY_DIFFICULTIES = {"Beginner": "Easy"}

# Every attempt shows 10 questions. The mix depends on the student's level (how many of the
# field's core skills their resume shows) but always spans all three difficulties, so a
# student with a basic resume can still show advanced knowledge.
QUESTIONS_PER_ATTEMPT = 10
LEVEL_MIXES = {
    "Beginner": {"Easy": 5, "Intermediate": 4, "Advanced": 1},
    "Intermediate": {"Easy": 3, "Intermediate": 4, "Advanced": 3},
    "Advanced": {"Easy": 2, "Intermediate": 3, "Advanced": 5},
}
DEFAULT_LEVEL = "Intermediate"  # no resume, and the legacy unauthenticated endpoint
DIFFICULTY_MIX = LEVEL_MIXES[DEFAULT_LEVEL]

# Fallback default questions if a bank file is unreadable or missing
FALLBACK_QUESTIONS = [
    {
        "id": 1,
        "topic": "Core Fundamentals",
        "difficulty": "Easy",
        "dimension": "Concept Understanding",
        "question": "What is the primary function of data validation in production software systems?",
        "options": [
            "To ensure input data conforms to expected formats and constraints before processing",
            "To speed up CSS rendering performance",
            "To encrypt data at rest",
            "To replace SQL queries"
        ],
        "correct": 0
    },
    {
        "id": 2,
        "topic": "Problem Solving",
        "difficulty": "Intermediate",
        "dimension": "Problem Solving",
        "question": "Which algorithm design paradigm breaks a problem into smaller subproblems and stores their results to avoid redundant computation?",
        "options": [
            "Greedy Algorithm",
            "Dynamic Programming",
            "Divide and Conquer",
            "Backtracking"
        ],
        "correct": 1
    }
]

Weight = Callable[[Dict[str, Any]], float]


def normalise_question(q: Dict[str, Any]) -> Dict[str, Any]:
    """Copies a bank entry with the difficulty mapped onto Easy / Intermediate / Advanced."""
    q = dict(q)
    q["difficulty"] = LEGACY_DIFFICULTIES.get(q.get("difficulty"), q.get("difficulty"))
    return q


def weighted_sample(
    items: Iterable[Dict[str, Any]], weight: Weight, k: int, rng: Any = random
) -> List[Dict[str, Any]]:
    """Draws up to k items without replacement, each draw proportional to its weight."""
    pool: List[Tuple[Dict[str, Any], float]] = [(item, max(float(weight(item)), 0.0)) for item in items]
    chosen: List[Dict[str, Any]] = []
    while pool and len(chosen) < k:
        total = sum(w for _, w in pool)
        if total <= 0:
            idx = int(rng.random() * len(pool)) % len(pool)
        else:
            target = rng.random() * total
            idx, acc = len(pool) - 1, 0.0
            for i, (_, w) in enumerate(pool):
                acc += w
                if target < acc:
                    idx = i
                    break
        chosen.append(pool.pop(idx)[0])
    return chosen


class SkillAssessmentEngine:
    """Question bank access + scoring. Banks load lazily and reload when their file changes,
    so content can be updated without a restart and tests can point `bank_dir` at fixtures."""

    def __init__(
        self,
        bank_dir: Path = QUESTION_BANK_DIR,
        track_files: Optional[Dict[str, str]] = None,
        aliases: Optional[Dict[str, str]] = None,
    ):
        self.bank_dir = Path(bank_dir)
        self.track_files = dict(track_files if track_files is not None else TRACK_FILES)
        self.aliases = {k.lower(): v for k, v in (aliases if aliases is not None else TRACK_ALIASES).items()}
        self._cache: Dict[str, Tuple[Tuple[int, int], List[Dict[str, Any]]]] = {}

    # ---------- tracks ----------
    @property
    def tracks(self) -> List[str]:
        return list(self.track_files)

    def slug(self, track: str) -> str:
        """File basename shared by a field's bank, learning path and projects (e.g. full_stack)."""
        return Path(self.track_files[track]).stem

    def resolve_track(self, track: str) -> Optional[str]:
        """Maps a role or track name to its canonical track, or None if there is no bank for it."""
        name = (track or "").strip()
        if name in self.track_files:
            return name
        lowered = name.lower()
        for canonical in self.track_files:
            if canonical.lower() == lowered:
                return canonical
        alias = self.aliases.get(lowered)
        return alias if alias in self.track_files else None

    # ---------- bank loading ----------
    def _load_bank(self, track: str) -> List[Dict[str, Any]]:
        path = self.bank_dir / self.track_files[track]
        try:
            stat = path.stat()
            stamp = (stat.st_mtime_ns, stat.st_size)
            cached = self._cache.get(track)
            if cached and cached[0] == stamp:
                return cached[1]
            with open(path, encoding="utf-8") as f:
                questions = [normalise_question(q) for q in json.load(f)["questions"]]
            self._cache[track] = (stamp, questions)
            return questions
        except FileNotFoundError:
            pass
        except Exception as e:
            # Not cached, so a file that is mid-update is picked up on the next request
            print(f"Warning: Failed to load assessment bank {path.name}: {e}")
        return [normalise_question(q) for q in FALLBACK_QUESTIONS]

    def clear_cache(self) -> None:
        self._cache.clear()

    def get_assessment_questions(self, track: str = "AI / ML Engineer") -> List[Dict[str, Any]]:
        canonical = self.resolve_track(track)
        if canonical is None:
            raise KeyError(f"No assessment question bank for track '{track}'")
        return self._load_bank(canonical)

    def get_question_map(self, track: str) -> Dict[int, Dict[str, Any]]:
        return {q["id"]: q for q in self.get_assessment_questions(track)}

    # ---------- drawing ----------
    def draw_attempt_questions(
        self,
        track: str,
        mix: Optional[Dict[str, int]] = None,
        weight: Optional[Weight] = None,
        rng: Any = None,
    ) -> List[Dict[str, Any]]:
        """Picks `mix[level]` questions per difficulty (default: the Intermediate 3/4/3 mix) by
        weighted sampling without replacement, topping up from the other difficulties only if a
        pool is short. Returned Easy -> Intermediate -> Advanced, roadmap step order within each."""
        bank = self.get_assessment_questions(track)
        mix = mix or DIFFICULTY_MIX
        weight = weight or (lambda q: 1.0)
        rng = rng or random
        picked: List[Dict[str, Any]] = []
        for level, count in mix.items():
            pool = [q for q in bank if q["difficulty"] == level]
            picked.extend(weighted_sample(pool, weight, count, rng))
        short = sum(mix.values()) - len(picked)
        if short > 0:
            taken = {q["id"] for q in picked}
            rest = [q for q in bank if q["id"] not in taken]
            picked.extend(weighted_sample(rest, weight, short, rng))
        picked.sort(key=lambda q: (DIFFICULTY_RANK.get(q["difficulty"], len(DIFFICULTIES)), q.get("step") or 0))
        return picked

    # ---------- scoring ----------
    def evaluate_answers(
        self, track: str, answers: Dict[int, int], question_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates assessment and scores across the 5 dimensions:
        1. Concept Understanding
        2. Problem Solving
        3. Practical Knowledge
        4. System Design
        5. Technical Communication
        """
        questions = self.get_assessment_questions(track)
        if question_ids is not None:
            # Score only the questions this attempt showed, in the order they were shown
            by_id = {q["id"]: q for q in questions}
            questions = [by_id[qid] for qid in dict.fromkeys(question_ids) if qid in by_id]
            if not questions:
                raise ValueError("None of the submitted question ids belong to this track")
        dim_scores: Dict[str, List[int]] = {dim: [] for dim in DIMENSIONS}

        weak_topics = []
        strong_topics = []
        total_correct = 0
        results = []       # per-question feedback, revealed only after submission
        question_log = []  # stored in AssessmentLog.questions_data for later adaptive plans

        for q in questions:
            qid = q["id"]
            user_choice = answers.get(qid)
            is_correct = (user_choice == q["correct"])

            dim = q["dimension"]
            dim_scores.setdefault(dim, []).append(1 if is_correct else 0)

            if is_correct:
                total_correct += 1
                strong_topics.append(q["topic"])
            else:
                weak_topics.append(q["topic"])

            results.append({
                "id": qid,
                "chosen": user_choice,
                "correct_option": q["correct"],
                "is_correct": is_correct,
                "explanation": q.get("explanation"),
            })
            question_log.append({
                "id": qid,
                "step": q.get("step"),
                "topic": q["topic"],
                "difficulty": q["difficulty"],
                "is_correct": is_correct,
            })

        # Calculate composite score (0-100) over the questions of this attempt
        overall_score = round((total_correct / len(questions)) * 100.0, 1)

        # Calculate per-dimension percentages (only dimensions this track's bank covers)
        dimension_results = {}
        for dim, dim_results in dim_scores.items():
            if dim_results:
                dimension_results[dim] = round((sum(dim_results) / len(dim_results)) * 100.0, 1)

        # Map to proficiency band (Slide 12: 0-40 Beginner, 41-60 Intermediate, 61-80 Advanced, 81-100 Expert)
        if overall_score <= 40:
            tier = "Beginner"
        elif overall_score <= 60:
            tier = "Intermediate"
        elif overall_score <= 80:
            tier = "Advanced"
        else:
            tier = "Expert"

        return {
            "overall_score": overall_score,
            "dimension_scores": dimension_results,
            "proficiency_tier": tier,
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "total_questions": len(questions),
            "correct_answers": total_correct,
            "results": results,
            "question_log": question_log,
        }

skill_assessment_engine = SkillAssessmentEngine()
