import re
from typing import Dict, List, Literal, Optional, Any
from pydantic import AliasChoices, BaseModel, EmailStr, Field, field_validator, model_validator
import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    target_role: Optional[str] = "AI / ML Engineer"

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    target_role: str
    is_first_time: Optional[bool] = True
    auth_provider: Optional[str] = "email"

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Dimension & Readiness Schemas ---
class DimensionScores(BaseModel):
    python: float = Field(..., ge=0, le=100)
    sql: float = Field(..., ge=0, le=100)
    ml: float = Field(..., ge=0, le=100)
    deep_learning: float = Field(..., ge=0, le=100)
    dsa: float = Field(..., ge=0, le=100)
    projects: float = Field(..., ge=0, le=100)
    resume_quality: float = Field(..., ge=0, le=100)
    interview_readiness: float = Field(..., ge=0, le=100)
    comm_readiness: float = Field(..., ge=0, le=100)

class PriorityAction(BaseModel):
    priority: str # P1, P2, P3, P4, P5
    title: str
    description: str
    dimension: str
    current_score: float
    recommended_action: str
    action_type: str # "course", "practice", "project", "resume", "interview"

class DashboardOverview(BaseModel):
    user_id: int
    full_name: str
    target_role: str
    overall_readiness: float
    readiness_tier: str
    dimension_scores: DimensionScores
    priority_actions: List[PriorityAction]
    readiness_history: List[Dict[str, Any]]
    leetcode_stats: Dict[str, Any]
    quick_stats: Dict[str, Any]

# --- Resume Schemas ---
class ResumeAnalysisResponse(BaseModel):
    id: int
    original_filename: str
    ats_score: float
    overall_ats_score: Optional[float] = None
    vector_match_pct: Optional[float] = None
    formatting_score: float
    keyword_score: float
    extracted_skills: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    tech_stack_gaps: List[str]
    achievement_metric_gaps: List[str]
    suggestions: List[str]
    target_role: str
    domain_diagnostics: Optional[Dict[str, Any]] = None

# --- Assessment Schemas ---
AssessmentLevel = Literal["Beginner", "Intermediate", "Advanced"]

class AssessmentSubmitRequest(BaseModel):
    track: str = "AI / ML Engineer"
    answers: Dict[int, int] = Field(default_factory=dict) # question_id -> chosen option index
    attempt_id: Optional[int] = None # from GET /assessment/plan; only the questions it issued are scored
    question_ids: Optional[List[int]] = Field(None, max_length=100) # the plan's questions; identify its attempt when attempt_id is absent
    level: Optional[AssessmentLevel] = None # question mix the plan used; the level stored with the attempt wins

# --- Interview Schemas ---
class InterviewQuestionRequest(BaseModel):
    interview_type: str = "technical" # technical or hr
    target_role: Optional[str] = None
    focus_topic: Optional[str] = None

class InterviewQuestionResponse(BaseModel):
    session_id: int
    interview_type: str
    target_role: str
    question: str
    context_source: str

class InterviewEvaluateRequest(BaseModel):
    session_id: int
    student_response: str

class InterviewEvaluationResponse(BaseModel):
    session_id: int
    score: float # 0 - 10
    relevance_score: float
    structure_score: float
    correctness_score: float
    depth_score: float
    strengths: str
    improvements: str
    model_answer: str
    updated_interview_readiness: float
    updated_overall_readiness: float

# --- Coding Practice Schemas ---
class CodingProblem(BaseModel):
    id: str
    title: str
    difficulty: str
    topic: str
    description: str
    starter_code: str
    test_cases: List[Dict[str, Any]]

class CodingSubmitRequest(BaseModel):
    problem_id: str
    code: str

class CodingSubmitResponse(BaseModel):
    problem_id: str
    status: str
    passed_tests: int
    total_tests: int
    score: float
    feedback: str
    updated_dsa_readiness: float
    updated_overall_readiness: float

# --- 5-Step Roadmap Schemas (checklist, gate quiz, projects) ---
# `field` defaults to the student's target role when omitted.
GITHUB_REPO_URL_RE = re.compile(r"^https://github\.com/[A-Za-z0-9-]+/[A-Za-z0-9._-]+/?$")
PROJECT_NOTES_MAX_CHARS = 1000


def normalise_github_repo_url(value: Any) -> str:
    """Accepts only https://github.com/<owner>/<repo>; drops a trailing slash and `.git`."""
    if not isinstance(value, str):
        raise ValueError("Repository link must be a string.")
    url = value.strip()
    if not GITHUB_REPO_URL_RE.match(url):
        raise ValueError("Enter your public GitHub repository link, e.g. https://github.com/your-name/your-project")
    url = url.rstrip("/")
    if url.lower().endswith(".git"):
        url = url[:-4]
    repo = url.rsplit("/", 1)[-1]
    if repo in ("", ".", ".."):
        raise ValueError("Enter your public GitHub repository link, e.g. https://github.com/your-name/your-project")
    return url


class TopicCheckRequest(BaseModel):
    field: Optional[str] = None
    checked: bool


class StepQuizStartRequest(BaseModel):
    field: Optional[str] = None


class StepQuizSubmitRequest(BaseModel):
    answers: Dict[int, int] = Field(default_factory=dict) # question_id -> chosen option index


class ProjectSubmissionRequest(BaseModel):
    field: Optional[str] = None
    repo_url: str
    notes: Optional[str] = Field(None, max_length=PROJECT_NOTES_MAX_CHARS)

    @field_validator("repo_url", mode="before")
    @classmethod
    def check_repo_url(cls, v):
        return normalise_github_repo_url(v)

    @field_validator("notes", mode="before")
    @classmethod
    def strip_notes(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

# --- Candidate Profile Schemas ---
SUPPORTED_THEMES = ("light", "dark", "system")
SUPPORTED_LANGUAGES = ("en", "hi", "es", "fr", "de")
AVATAR_MAX_CHARS = 1_500_000  # ~1.1 MB of base64 image data
AVATAR_PREFIXES = tuple(f"data:image/{fmt};base64," for fmt in ("png", "jpeg", "jpg", "webp", "gif"))


def _parse_score(value: Any) -> Any:
    """Accept numbers or friendly strings such as "92.5%", "8.6 CGPA" or ""."""
    if value is None or isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        cleaned = value.strip().lower().replace("%", "").replace("cgpa", "").strip()
        if not cleaned or cleaned in ("n/a", "na", "-"):
            return None
        return cleaned
    return value


def _validate_avatar(value: Optional[str]) -> Optional[str]:
    if value is None or value == "":
        return None
    if not value.startswith(AVATAR_PREFIXES):
        raise ValueError("Profile photo must be a PNG, JPEG, WEBP or GIF image.")
    if len(value) > AVATAR_MAX_CHARS:
        raise ValueError("Profile photo is too large. Please use an image under 1 MB.")
    return value


class ProfileDetailsUpdate(BaseModel):
    """Editable personal & academic details. Every field is optional so the
    Edit Profile dialog can send partial updates."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    age: Optional[int] = Field(None, ge=14, le=80)
    college_name: Optional[str] = Field(None, max_length=255)
    course_and_branch: Optional[str] = Field(None, max_length=255)
    cgpa: Optional[float] = Field(None, ge=0, le=10)
    tenth_percentage: Optional[float] = Field(
        None, ge=0, le=100, validation_alias=AliasChoices("tenth_percentage", "tenth_marks")
    )
    twelfth_percentage: Optional[float] = Field(
        None, ge=0, le=100, validation_alias=AliasChoices("twelfth_percentage", "twelfth_marks")
    )
    ug_cgpa: Optional[float] = Field(None, ge=0, le=10)
    work_experience: Optional[str] = Field(None, max_length=4000)
    avatar_url: Optional[str] = None

    @field_validator("cgpa", "tenth_percentage", "twelfth_percentage", "ug_cgpa", mode="before")
    @classmethod
    def parse_scores(cls, v):
        return _parse_score(v)

    @field_validator("full_name", "college_name", "course_and_branch", "work_experience", mode="before")
    @classmethod
    def strip_text(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("avatar_url")
    @classmethod
    def check_avatar(cls, v):
        return _validate_avatar(v)


class OnboardingRequest(ProfileDetailsUpdate):
    """First-time registration form: core fields are mandatory, UG CGPA and
    work experience are optional."""
    full_name: str = Field(..., min_length=1, max_length=255)
    age: int = Field(..., ge=14, le=80)
    college_name: str = Field(..., min_length=1, max_length=255)
    tenth_percentage: float = Field(
        ..., ge=0, le=100, validation_alias=AliasChoices("tenth_percentage", "tenth_marks")
    )
    twelfth_percentage: float = Field(
        ..., ge=0, le=100, validation_alias=AliasChoices("twelfth_percentage", "twelfth_marks")
    )

    @model_validator(mode="after")
    def require_cgpa(self):
        # Older clients only sent `ug_cgpa`; treat it as the current CGPA in that case.
        if self.cgpa is None:
            self.cgpa = self.ug_cgpa
        if self.cgpa is None:
            raise ValueError("CGPA is required.")
        return self


class AvatarUpdate(BaseModel):
    avatar_url: Optional[str] = None

    @field_validator("avatar_url")
    @classmethod
    def check_avatar(cls, v):
        return _validate_avatar(v)


class PreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None

    @field_validator("theme")
    @classmethod
    def check_theme(cls, v):
        if v is not None and v not in SUPPORTED_THEMES:
            raise ValueError(f"Theme must be one of {SUPPORTED_THEMES}")
        return v

    @field_validator("language")
    @classmethod
    def check_language(cls, v):
        if v is not None and v not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Language must be one of {SUPPORTED_LANGUAGES}")
        return v
