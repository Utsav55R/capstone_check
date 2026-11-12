import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    target_role = Column(String(100), default="AI / ML Engineer")
    is_first_time = Column(Boolean, default=True)
    auth_provider = Column(String(50), default="email")
    is_active = Column(Boolean, default=True)

    # Account preferences (Profile → Settings)
    theme_preference = Column(String(20), default="light") # light, dark, system
    language_preference = Column(String(10), default="en") # en, hi, es, fr, de
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    profile = relationship("StudentProfile", back_populates="user", uselist=False)
    resumes = relationship("ResumeAnalysis", back_populates="user")
    assessments = relationship("AssessmentLog", back_populates="user")
    assessment_attempts = relationship("AssessmentAttempt", back_populates="user")
    interviews = relationship("InterviewSession", back_populates="user")
    coding_submissions = relationship("CodingSubmission", back_populates="user")
    readiness_history = relationship("ReadinessHistory", back_populates="user")
    topic_checks = relationship("RoadmapTopicCheck", back_populates="user")
    step_quiz_attempts = relationship("StepQuizAttempt", back_populates="user")
    project_submissions = relationship("ProjectSubmission", back_populates="user")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    target_role = Column(String(100), default="AI / ML Engineer")

    # Personal & academic details captured by the first-time registration form
    age = Column(Integer, nullable=True)
    college_name = Column(String(255), nullable=True)
    course_and_branch = Column(String(255), nullable=True)
    cgpa = Column(Float, nullable=True)                 # Current CGPA (0-10)
    tenth_percentage = Column(Float, nullable=True)     # 0-100
    twelfth_percentage = Column(Float, nullable=True)   # 0-100
    ug_cgpa = Column(Float, nullable=True)              # Undergraduate CGPA (0-10), if different
    work_experience = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)            # Base64 data URL of the profile photo
    
    # The Nine Tracked Dimensions (0-100) (Slide 07)
    python_score = Column(Float, default=85.0)
    sql_score = Column(Float, default=60.0)
    ml_score = Column(Float, default=75.0)
    deep_learning_score = Column(Float, default=45.0)
    dsa_score = Column(Float, default=55.0)
    projects_score = Column(Float, default=60.0)
    resume_quality_score = Column(Float, default=80.0)
    interview_readiness_score = Column(Float, default=50.0)
    comm_readiness_score = Column(Float, default=65.0)

    # Dynamic Placement Readiness Score (0-100)
    overall_readiness = Column(Float, default=68.0)
    readiness_tier = Column(String(50), default="Advanced") # Beginner, Intermediate, Advanced, Expert
    
    # External Integrations (Slide 05, Slide 11)
    leetcode_url = Column(String(255), default="https://leetcode.com/u/student_prototype")
    leetcode_total_solved = Column(Integer, default=142)
    leetcode_medium_solved = Column(Integer, default=68)
    leetcode_weak_topics = Column(JSON, default=lambda: ["Dynamic Programming", "Graphs", "Trie"])
    
    github_url = Column(String(255), default="https://github.com/student_prototype")
    linkedin_url = Column(String(255), default="https://linkedin.com/in/student_prototype")
    
    # Validated self-assessed skills
    self_assessed_skills = Column(JSON, default=lambda: {
        "Python": "Advanced",
        "FastAPI": "Intermediate",
        "SQL": "Intermediate",
        "PyTorch": "Beginner",
        "Docker": "Beginner"
    })
    
    # Generated Priority Actions & Next Best Action
    priority_actions = Column(JSON, default=list)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="profile")


class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_filename = Column(String(255), default="resume.pdf")
    parsed_text = Column(Text, nullable=True)
    ats_score = Column(Float, default=78.0) # 0-100 visual gauge
    formatting_score = Column(Float, default=85.0)
    keyword_score = Column(Float, default=72.0)
    extracted_skills = Column(JSON, default=list)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    tech_stack_gaps = Column(JSON, default=list) # e.g. ["Docker", "MLflow"]
    suggestions = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="resumes")


class AssessmentLog(Base):
    __tablename__ = "assessment_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    track = Column(String(100), default="AI / ML") # Cloud, Full Stack, AI / ML
    level = Column(String(20), nullable=True) # Beginner / Intermediate / Advanced question mix used
    # [{id, step, topic, difficulty, is_correct}] for every question shown in this attempt
    questions_data = Column(JSON, default=list)
    answers_data = Column(JSON, default=dict)
    overall_score = Column(Float, default=0.0)
    
    # 5 Evaluation Dimensions (from SVG diagram)
    concept_understanding = Column(Float, default=0.0)
    problem_solving = Column(Float, default=0.0)
    practical_knowledge = Column(Float, default=0.0)
    system_design = Column(Float, default=0.0)
    tech_communication = Column(Float, default=0.0)
    
    weak_topics = Column(JSON, default=list)
    strong_topics = Column(JSON, default=list)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="assessments")


class AssessmentAttempt(Base):
    """A skill assessment issued by GET /assessment/plan. Stored server-side so a submission can
    only score (and reveal the answers of) the questions it was issued with, once;
    `submitted_at` is NULL until submission."""
    __tablename__ = "assessment_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    track = Column(String(100), nullable=False)
    level = Column(String(20), nullable=True)  # Beginner / Intermediate / Advanced question mix used
    question_ids = Column(JSON, default=list)
    issued_at = Column(DateTime, default=datetime.datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="assessment_attempts")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    interview_type = Column(String(50), default="technical") # "technical" or "hr"
    target_role = Column(String(100), default="AI / ML Engineer")
    question = Column(Text, nullable=True, default="Saraswati Conversational Technical Interview")
    context_source = Column(String(255), default="Saraswati AI Recruiter")
    student_response = Column(Text, nullable=True)

    # Multi-Stage Stateful Chat Properties
    current_stage = Column(Integer, default=1) # 1: Warm-up/Intro, 2: Resume/Projects, 3: Adaptive Tech, 4: Conclusion
    difficulty_level = Column(String(50), default="basic") # basic -> intermediate -> advanced
    is_completed = Column(Boolean, default=False)
    messages = Column(JSON, default=list) # Full timestamped chat history list

    # Composite Evaluation & 6-Tier Grading (0-100)
    score = Column(Float, default=0.0) # Overall Composite score 0-100
    overall_score = Column(Float, default=0.0)
    relevance_score = Column(Float, default=0.0)
    structure_score = Column(Float, default=0.0)
    correctness_score = Column(Float, default=0.0)
    depth_score = Column(Float, default=0.0)
    categorical_grade = Column(String(50), default="Moderate")

    strengths = Column(Text, nullable=True)
    improvements = Column(Text, nullable=True)
    model_answer = Column(Text, nullable=True)
    weak_topics = Column(JSON, default=list)
    improvement_roadmap = Column(JSON, default=list)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="interviews")


class CodingSubmission(Base):
    __tablename__ = "coding_submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    problem_id = Column(String(100), nullable=False)
    problem_title = Column(String(255), nullable=False)
    topic = Column(String(100), default="Dynamic Programming")
    code = Column(Text, nullable=False)
    passed_tests = Column(Integer, default=0)
    total_tests = Column(Integer, default=0)
    status = Column(String(50), default="Accepted") # Accepted, Wrong Answer, Runtime Error
    score = Column(Float, default=100.0)
    language = Column(String(20), default="python")  # python, java or cpp (older rows: NULL = python)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="coding_submissions")


class ReadinessHistory(Base):
    __tablename__ = "readiness_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    overall_readiness = Column(Float, nullable=False)
    dimension_scores = Column(JSON, nullable=False)
    trigger_event = Column(String(100), default="initial_assessment")
    score_change = Column(Float, default=0.0)

    user = relationship("User", back_populates="readiness_history")


# --- 5-step roadmap: checklist ticks, step gate quizzes and project proof (Resume -> Assessment -> Roadmap loop) ---

class RoadmapTopicCheck(Base):
    """One ticked checklist topic of a roadmap step. Unticking deletes the row."""
    __tablename__ = "roadmap_topic_checks"
    __table_args__ = (UniqueConstraint("user_id", "field", "topic_id", name="uq_topic_check_user_field_topic"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    field = Column(String(100), nullable=False)
    step = Column(Integer, nullable=False)
    topic_id = Column(String(100), nullable=False)
    checked_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="topic_checks")


class StepQuizAttempt(Base):
    """A gate quiz for one roadmap step. Created server-side when the quiz starts, so only
    the questions it was issued with can be scored; `submitted_at` is NULL until submission."""
    __tablename__ = "step_quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    field = Column(String(100), nullable=False)
    step = Column(Integer, nullable=False)
    question_ids = Column(JSON, default=list)
    answers = Column(JSON, nullable=True)  # {question_id: chosen option index}
    correct = Column(Integer, nullable=True)
    total = Column(Integer, nullable=False, default=0)
    score = Column(Float, nullable=True)   # 0-100
    passed = Column(Boolean, default=False)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="step_quiz_attempts")


class ProjectSubmission(Base):
    """The student's own GitHub repo for a roadmap project (proof of skill)."""
    __tablename__ = "project_submissions"
    __table_args__ = (UniqueConstraint("user_id", "field", "project_id", name="uq_project_submission_user_field_project"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    field = Column(String(100), nullable=False)
    project_id = Column(String(100), nullable=False)
    repo_url = Column(String(500), nullable=False)
    notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="project_submissions")
