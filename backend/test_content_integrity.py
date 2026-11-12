"""
Integrity checks for the REAL learning-loop content in app/data (question banks, learning
paths, projects). A field is checked once its learning path file exists; fields still waiting
for content are skipped, so adding a field's files is all it takes to bring it under test.

Run:  cd backend  ->  python -m pytest test_content_integrity.py -v
"""
import json
import random
import re
from collections import Counter
from pathlib import Path

import pytest

from app.services.assessment_engine import DATA_DIR, DIMENSIONS, LEVEL_MIXES, TRACK_FILES
from app.services.learning_path_engine import QUIZ_MIX, LearningPathEngine

DIFFICULTIES = ("Easy", "Intermediate", "Advanced")
MIN_PER_STEP = {"Easy": 4, "Intermediate": 4, "Advanced": 3}
PROJECT_LEVELS = [("Basic", 2), ("Intermediate", 4), ("Advanced", 5)]
GITHUB_REPO = re.compile(r"^https://github\.com/([A-Za-z0-9-]+/[A-Za-z0-9._-]+)$")
CODING_TOPICS = {p["topic"] for p in json.loads((DATA_DIR / "coding_problems.json").read_text(encoding="utf-8"))["problems"]}

FIELDS = [(field, Path(filename).stem) for field, filename in TRACK_FILES.items()]


def _load(kind, slug):
    path = DATA_DIR / kind / f"{slug}.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(params=FIELDS, ids=[slug for _, slug in FIELDS])
def content(request):
    field, slug = request.param
    if not (DATA_DIR / "learning_paths" / f"{slug}.json").exists():
        pytest.skip(f"{field}: no learning path content yet")
    return {
        "field": field,
        "slug": slug,
        "path": _load("learning_paths", slug),
        "bank": _load("assessments", slug),
        "projects": _load("projects", slug),
    }


def test_learning_path_has_five_steps_with_topics(content):
    lp = content["path"]
    assert lp["field"] == content["field"]
    assert [s["step"] for s in lp["steps"]] == [1, 2, 3, 4, 5]
    topic_ids = [t["id"] for s in lp["steps"] for t in s["topics"]]
    assert len(topic_ids) == len(set(topic_ids)), "topic ids must be unique across the field"
    for step in lp["steps"]:
        assert step["title"].strip() and step["subtitle"].strip() and step["description"].strip()
        assert 5 <= len(step["topics"]) <= 7, f"step {step['step']} has {len(step['topics'])} topics"
        assert all(t["name"].strip() for t in step["topics"])


def test_core_skills_cover_every_step(content):
    skills = content["path"]["core_skills"]
    assert 6 <= len(skills) <= 8
    assert len({s["id"] for s in skills}) == len(skills)
    assert {s["step"] for s in skills} == {1, 2, 3, 4, 5}
    for s in skills:
        assert s["name"].strip() and s["keywords"], s["id"]
        # Lowercase keywords match case-insensitively; ones with capitals ("Excel") are case-sensitive on purpose
        assert all(isinstance(k, str) and k.strip() == k and k for k in s["keywords"]), s["id"]


def test_coding_topics_exist_in_coding_practice(content):
    for step in content["path"]["steps"]:
        topics = step.get("coding_topics", [])
        assert len(topics) <= 3
        assert set(topics) <= CODING_TOPICS, f"step {step['step']}: unknown coding topics {set(topics) - CODING_TOPICS}"


def test_question_bank_is_tagged_and_covers_every_step(content):
    bank = content["bank"]
    questions = bank["questions"]
    assert bank.get("schema_version") == 2
    ids = [q["id"] for q in questions]
    assert all(isinstance(i, int) and i > 0 for i in ids)
    assert len(ids) == len(set(ids)), f"duplicate ids: {[i for i, c in Counter(ids).items() if c > 1]}"
    steps_with_topics = {s["step"] for s in content["path"]["steps"] if s["topics"]}
    cells = Counter()
    for q in questions:
        assert q["field"] == content["field"], q["id"]
        assert q["step"] in steps_with_topics, f"q{q['id']}: step {q.get('step')} has no checklist topics"
        assert q["difficulty"] in DIFFICULTIES, q["id"]
        assert q["dimension"] in DIMENSIONS, q["id"]
        assert len(q["options"]) == 4 and len({o.strip().lower() for o in q["options"]}) == 4, q["id"]
        assert isinstance(q["correct"], int) and 0 <= q["correct"] <= 3, q["id"]
        assert q["topic"].strip() and q["question"].strip() and q["explanation"].strip(), q["id"]
        cells[(q["step"], q["difficulty"])] += 1
    for step in range(1, 6):
        for difficulty, minimum in MIN_PER_STEP.items():
            assert cells[(step, difficulty)] >= minimum, f"step {step}: {cells[(step, difficulty)]} {difficulty}, need {minimum}"
    assert 55 <= len(questions) <= 64


def test_projects_unlock_after_steps_two_four_five(content):
    projects = content["projects"]
    assert projects["field"] == content["field"]
    assert [(p["level"], p["unlock_after_step"]) for p in projects["projects"]] == PROJECT_LEVELS
    assert len({p["id"] for p in projects["projects"]}) == 3
    for p in projects["projects"]:
        assert p["title"].strip() and p["summary"].strip() and p["skills"] and p["requirements"]
        repo = p["reference_repo"]
        match = GITHUB_REPO.match(repo["url"])
        assert match and match.group(1) == repo["full_name"], repo["url"]
        assert isinstance(repo["stars"], int) and repo["stars"] >= 500
        assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", repo["last_commit"])


def test_engine_can_build_assessments_quizzes_and_roadmap(content):
    """The real content supports every draw the backend makes."""
    engine = LearningPathEngine(DATA_DIR)
    field = content["field"]
    rng = random.Random(42)
    for level, mix in LEVEL_MIXES.items():
        drawn = engine.draw_assessment(field, level, weak_steps={1}, rng=rng)
        assert [q["difficulty"] for q in drawn] == [d for d in DIFFICULTIES for _ in range(mix[d])], f"{level} mix"
    expected_quiz = [d for d in DIFFICULTIES for _ in range(QUIZ_MIX[d])]
    for step in range(1, 6):
        first = engine.pick_quiz_questions(field, step, [], rng=rng)
        second = engine.pick_quiz_questions(field, step, [[q["id"] for q in first]], rng=rng)
        assert [q["difficulty"] for q in first] == expected_quiz, f"step {step} gate quiz mix"
        repeated = {q["id"] for q in first if q["difficulty"] != "Advanced"} & {q["id"] for q in second}
        assert not repeated, f"step {step}: consecutive gate quizzes repeat {repeated}"
    lp = engine.get_learning_path(field)
    roadmap = engine.build_roadmap(field, lp, set(), [], {}, [])
    assert roadmap["total_steps"] == 5 and len(roadmap["projects"]) == 3
    assert all(len(s["coding_problems"]) <= 4 for s in roadmap["steps"])
