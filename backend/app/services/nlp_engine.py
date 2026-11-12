import re
import io
from typing import Dict, List, Any, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ---------------------------------------------------------------------------
# ESCO-aligned Skill Taxonomy
# Covers: AI/ML, Data Engineering, Data Analytics, Game Development,
#         DevOps/Cloud, DSA, Frontend/Full-Stack
# ---------------------------------------------------------------------------
ESCO_TAXONOMY: Dict[str, List[str]] = {
    "Programming Languages": [
        "python", "java", "c++", "c", "c#", "javascript", "typescript",
        "go", "rust", "r", "scala", "sql", "html", "css", "bash", "excel"
    ],
    "Machine Learning & Data Science": [
        "machine learning", "scikit-learn", "deep learning", "neural networks",
        "pytorch", "tensorflow", "keras", "nlp", "natural language processing",
        "computer vision", "transformers", "hugging face", "bert", "gpt",
        "llm", "large language models", "rag", "retrieval augmented generation",
        "embeddings", "pandas", "numpy", "matplotlib", "seaborn", "opencv",
        "feature engineering", "model evaluation", "cross validation", "xgboost",
        "lightgbm", "random forest", "logistic regression", "clustering", "pca",
        "hyperparameter tuning", "statistics", "a/b testing"
    ],
    "Data Engineering & Databases": [
        "sql", "postgresql", "mysql", "mongodb", "sqlite", "redis",
        "elasticsearch", "neo4j", "cassandra", "etl", "data warehousing",
        "snowflake", "bigquery", "spark", "kafka", "pandas", "dbt",
        "airflow", "nosql"
    ],
    "Data Analytics & Visualization": [
        "power bi", "tableau", "data visualization", "excel", "pandas",
        "numpy", "seaborn", "matplotlib", "statistics", "a/b testing",
        "r", "dashboard reporting", "postgresql"
    ],
    "DevOps, Cloud & MLOps": [
        "docker", "kubernetes", "mlflow", "dvc", "airflow", "aws", "azure",
        "gcp", "git", "github", "gitlab", "ci/cd", "github actions", "linux",
        "fastapi", "flask", "django", "rest api", "microservices", "terraform"
    ],
    "DSA & Problem Solving": [
        "data structures", "algorithms", "dynamic programming", "graphs",
        "trees", "arrays", "binary search", "recursion", "sorting",
        "hash tables", "linked lists", "greedy algorithms", "time complexity",
        "space complexity"
    ],
    "Frontend & Full Stack": [
        "react", "vue", "angular", "node.js", "express", "next.js",
        "tailwind css", "bootstrap", "redux", "html5", "css3",
        "state management", "restful apis", "oauth", "jwt"
    ],
    "Game Development": [
        "unity", "unreal engine", "c++", "c#", "shader graph", "3d math",
        "physics engines", "opengl", "directx", "blender", "game development",
        "real-time graphics", "performance optimization"
    ],
}

# Mapping skills to the 5 core technical domains
SKILL_TO_DOMAIN_MAP: Dict[str, str] = {
    # ML & AI / Data Science
    "machine learning": "ml_ai_analytics", "scikit-learn": "ml_ai_analytics",
    "deep learning": "ml_ai_analytics", "neural networks": "ml_ai_analytics",
    "pytorch": "ml_ai_analytics", "tensorflow": "ml_ai_analytics", "keras": "ml_ai_analytics",
    "nlp": "ml_ai_analytics", "natural language processing": "ml_ai_analytics",
    "computer vision": "ml_ai_analytics", "transformers": "ml_ai_analytics",
    "hugging face": "ml_ai_analytics", "bert": "ml_ai_analytics", "gpt": "ml_ai_analytics",
    "llm": "ml_ai_analytics", "large language models": "ml_ai_analytics",
    "rag": "ml_ai_analytics", "retrieval augmented generation": "ml_ai_analytics",
    "embeddings": "ml_ai_analytics", "pandas": "ml_ai_analytics", "numpy": "ml_ai_analytics",
    "matplotlib": "ml_ai_analytics", "seaborn": "ml_ai_analytics", "opencv": "ml_ai_analytics",
    "feature engineering": "ml_ai_analytics", "model evaluation": "ml_ai_analytics",
    "cross validation": "ml_ai_analytics", "xgboost": "ml_ai_analytics",
    "lightgbm": "ml_ai_analytics", "random forest": "ml_ai_analytics",
    "logistic regression": "ml_ai_analytics", "clustering": "ml_ai_analytics",
    "pca": "ml_ai_analytics", "hyperparameter tuning": "ml_ai_analytics",
    "statistics": "ml_ai_analytics", "a/b testing": "ml_ai_analytics",
    "r": "ml_ai_analytics", "data visualization": "ml_ai_analytics",
    "power bi": "ml_ai_analytics", "tableau": "ml_ai_analytics",

    # Full Stack & Web / Game Engineering
    "react": "fullstack_frontend", "vue": "fullstack_frontend", "angular": "fullstack_frontend",
    "node.js": "fullstack_frontend", "express": "fullstack_frontend", "next.js": "fullstack_frontend",
    "tailwind css": "fullstack_frontend", "bootstrap": "fullstack_frontend", "redux": "fullstack_frontend",
    "html5": "fullstack_frontend", "css3": "fullstack_frontend", "html": "fullstack_frontend",
    "css": "fullstack_frontend", "javascript": "fullstack_frontend", "typescript": "fullstack_frontend",
    "state management": "fullstack_frontend", "restful apis": "fullstack_frontend", "oauth": "fullstack_frontend",
    "jwt": "fullstack_frontend", "unity": "fullstack_frontend", "unreal engine": "fullstack_frontend",
    "shader graph": "fullstack_frontend", "physics engines": "fullstack_frontend",
    "opengl": "fullstack_frontend", "directx": "fullstack_frontend", "blender": "fullstack_frontend",
    "game development": "fullstack_frontend", "real-time graphics": "fullstack_frontend",

    # Data Engineering, Databases & Analytics
    "sql": "data_engineering_databases", "postgresql": "data_engineering_databases",
    "mysql": "data_engineering_databases", "mongodb": "data_engineering_databases",
    "sqlite": "data_engineering_databases", "redis": "data_engineering_databases",
    "elasticsearch": "data_engineering_databases", "neo4j": "data_engineering_databases",
    "cassandra": "data_engineering_databases", "etl": "data_engineering_databases",
    "data warehousing": "data_engineering_databases", "snowflake": "data_engineering_databases",
    "bigquery": "data_engineering_databases", "spark": "data_engineering_databases",
    "kafka": "data_engineering_databases", "dbt": "data_engineering_databases",
    "nosql": "data_engineering_databases", "excel": "data_engineering_databases",
    "dashboard reporting": "data_engineering_databases",

    # Cloud, DevOps & Systems
    "docker": "cloud_devops", "kubernetes": "cloud_devops", "mlflow": "cloud_devops",
    "dvc": "cloud_devops", "airflow": "cloud_devops", "aws": "cloud_devops",
    "azure": "cloud_devops", "gcp": "cloud_devops", "git": "cloud_devops",
    "github": "cloud_devops", "gitlab": "cloud_devops", "ci/cd": "cloud_devops",
    "github actions": "cloud_devops", "linux": "cloud_devops", "fastapi": "cloud_devops",
    "flask": "cloud_devops", "django": "cloud_devops", "rest api": "cloud_devops",
    "microservices": "cloud_devops", "terraform": "cloud_devops", "bash": "cloud_devops",

    # DSA, Problem Solving & Software Fundamentals
    "data structures": "dsa_core", "algorithms": "dsa_core", "dynamic programming": "dsa_core",
    "graphs": "dsa_core", "trees": "dsa_core", "arrays": "dsa_core", "binary search": "dsa_core",
    "recursion": "dsa_core", "sorting": "dsa_core", "hash tables": "dsa_core",
    "linked lists": "dsa_core", "greedy algorithms": "dsa_core", "time complexity": "dsa_core",
    "space complexity": "dsa_core", "python": "dsa_core", "c++": "dsa_core", "c#": "dsa_core",
    "c": "dsa_core", "java": "dsa_core", "go": "dsa_core", "rust": "dsa_core", "3d math": "dsa_core"
}

# ---------------------------------------------------------------------------
# Role Benchmarks — multi-domain expectation matrices for all supported roles
# ---------------------------------------------------------------------------
ROLE_BENCHMARKS: Dict[str, Dict[str, Any]] = {
    "AI / ML Engineer": {
        "essential_skills": [
            "python", "machine learning", "deep learning", "pytorch", "tensorflow",
            "scikit-learn", "docker", "mlflow", "fastapi", "sql",
            "dynamic programming", "transformers", "rag", "git"
        ],
        "important_skills": [
            "numpy", "pandas", "data structures", "algorithms", "rest api",
            "linux", "feature engineering", "model evaluation"
        ],
        "domain_requirements": {
            "ml_ai_analytics": ["python", "machine learning", "deep learning", "pytorch", "tensorflow", "scikit-learn", "transformers", "rag", "feature engineering", "model evaluation", "pandas", "numpy"],
            "fullstack_frontend": ["fastapi", "rest api"],
            "data_engineering_databases": ["sql", "pandas"],
            "cloud_devops": ["docker", "mlflow", "git", "linux", "fastapi"],
            "dsa_core": ["data structures", "algorithms", "dynamic programming", "python"]
        },
        "jd_description": (
            "We are seeking an AI / ML Engineer proficient in Python, Scikit-learn, "
            "PyTorch or TensorFlow, and Deep Learning architectures. The ideal candidate "
            "has experience building end-to-end ML pipelines, deploying models via FastAPI "
            "and Docker, tracking experiments with MLflow, and strong foundations in "
            "Data Structures, Algorithms (especially dynamic programming), SQL, and "
            "Transformer embeddings."
        )
    },
    "Full Stack Developer": {
        "essential_skills": [
            "javascript", "typescript", "react", "node.js", "python", "fastapi",
            "sql", "postgresql", "docker", "git", "restful apis",
            "data structures", "algorithms", "tailwind css"
        ],
        "important_skills": [
            "html5", "css3", "redux", "jwt", "ci/cd", "microservices", "mongodb"
        ],
        "domain_requirements": {
            "ml_ai_analytics": ["python"],
            "fullstack_frontend": ["javascript", "typescript", "react", "node.js", "fastapi", "tailwind css", "html5", "css3", "redux", "jwt", "restful apis"],
            "data_engineering_databases": ["sql", "postgresql", "mongodb"],
            "cloud_devops": ["docker", "git", "ci/cd", "microservices", "fastapi"],
            "dsa_core": ["data structures", "algorithms", "javascript", "python"]
        },
        "jd_description": (
            "Looking for a Full Stack Developer with strong expertise in React, modern "
            "JavaScript/TypeScript, backend development using Python FastAPI or Node.js, "
            "relational databases like PostgreSQL, RESTful API design, authentication using "
            "JWT, Docker containerization, and robust problem-solving DSA skills."
        )
    },
    "Cloud / DevOps Engineer": {
        "essential_skills": [
            "linux", "docker", "kubernetes", "aws", "terraform", "ci/cd",
            "git", "python", "bash", "networking", "monitoring", "sql"
        ],
        "important_skills": [
            "github actions", "microservices", "security", "cloud architecture",
            "gcp", "azure"
        ],
        "domain_requirements": {
            "ml_ai_analytics": ["python"],
            "fullstack_frontend": ["bash", "python"],
            "data_engineering_databases": ["sql"],
            "cloud_devops": ["linux", "docker", "kubernetes", "aws", "terraform", "ci/cd", "git", "github actions", "microservices", "gcp", "azure"],
            "dsa_core": ["linux", "python", "bash", "algorithms"]
        },
        "jd_description": (
            "Seeking a Cloud & DevOps Engineer experienced in Docker containerization, "
            "Kubernetes orchestration, cloud platforms (AWS/GCP), CI/CD pipelines, "
            "Infrastructure as Code with Terraform, Linux shell scripting, Python "
            "automation, and system reliability monitoring."
        )
    },
    "Game Developer": {
        "essential_skills": [
            "c++", "c#", "unity", "unreal engine", "3d math", "git"
        ],
        "important_skills": [
            "shader graph", "physics engines", "opengl", "directx", "blender",
            "data structures"
        ],
        "domain_requirements": {
            "ml_ai_analytics": ["3d math"],
            "fullstack_frontend": ["unity", "unreal engine", "shader graph", "physics engines", "opengl", "directx", "blender"],
            "data_engineering_databases": ["c++", "c#"],
            "cloud_devops": ["git"],
            "dsa_core": ["c++", "c#", "data structures", "algorithms", "3d math"]
        },
        "jd_description": (
            "Seeking a Game Developer proficient in C++, C#, Unity, and Unreal Engine. "
            "Experience with 3D mathematics, physics engines, graphics rendering APIs like "
            "OpenGL/DirectX, and performance optimization for interactive real-time graphics."
        )
    },
    "Data Engineer": {
        "essential_skills": [
            "python", "sql", "postgresql", "spark", "kafka", "etl",
            "data warehousing", "docker"
        ],
        "important_skills": [
            "aws", "bigquery", "snowflake", "airflow", "dbt", "nosql", "pandas"
        ],
        "domain_requirements": {
            "ml_ai_analytics": ["python", "pandas"],
            "fullstack_frontend": ["python"],
            "data_engineering_databases": ["sql", "postgresql", "spark", "kafka", "etl", "data warehousing", "bigquery", "snowflake", "dbt", "nosql"],
            "cloud_devops": ["docker", "aws", "airflow"],
            "dsa_core": ["data structures", "algorithms", "python", "sql"]
        },
        "jd_description": (
            "We are hiring a Data Engineer to design, build, and maintain scalable data "
            "pipelines and ETL workflows. Proficient in Python, SQL, Apache Spark, Kafka, "
            "data warehousing solutions (Snowflake/BigQuery), and database optimization."
        )
    },
    "Data Analyst": {
        "essential_skills": [
            "python", "sql", "excel", "power bi", "tableau", "pandas", "numpy"
        ],
        "important_skills": [
            "statistics", "data visualization", "a/b testing", "r",
            "postgresql", "seaborn"
        ],
        "domain_requirements": {
            "ml_ai_analytics": ["python", "pandas", "numpy", "statistics", "data visualization", "a/b testing", "r", "seaborn"],
            "fullstack_frontend": ["excel", "power bi", "tableau"],
            "data_engineering_databases": ["sql", "postgresql", "excel", "dashboard reporting"],
            "cloud_devops": ["sql"],
            "dsa_core": ["python", "sql", "statistics"]
        },
        "jd_description": (
            "Looking for a Data Analyst to transform complex datasets into actionable "
            "business insights. Strong experience in SQL, Python, Pandas, data visualization "
            "tools (Power BI, Tableau), statistical modeling, and dashboard reporting."
        )
    },
}


class ResumeNLPAnalyzer:
    def __init__(self):
        self.all_canonical_skills: Dict[str, str] = {}
        for category, skills in ESCO_TAXONOMY.items():
            for skill in skills:
                self.all_canonical_skills[skill.lower()] = category

    def extract_text_from_file(self, filename: str, content_bytes: bytes) -> str:
        text = ""
        filename_lower = filename.lower()
        if filename_lower.endswith(".pdf"):
            try:
                import pypdf
                pdf_reader = pypdf.PdfReader(io.BytesIO(content_bytes))
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            except Exception:
                try:
                    import pdfplumber
                    with pdfplumber.open(io.BytesIO(content_bytes)) as pdf:
                        for page in pdf.pages:
                            page_text = page.extract_text()
                            if page_text:
                                text += page_text + "\n"
                except Exception:
                    pass
        elif filename_lower.endswith(".docx"):
            try:
                import docx
                doc = docx.Document(io.BytesIO(content_bytes))
                for para in doc.paragraphs:
                    text += para.text + "\n"
            except Exception:
                pass
        else:
            try:
                text = content_bytes.decode("utf-8", errors="ignore")
            except Exception:
                text = str(content_bytes)

        return text.strip()

    def extract_skills(self, text: str) -> List[str]:
        text_lower = " " + text.lower() + " "
        normalized = re.sub(r'[/,();:]', ' ', text_lower)

        extracted = set()
        for skill in self.all_canonical_skills.keys():
            pattern = r'(?:\b|_)' + re.escape(skill) + r'(?:\b|_)'
            if re.search(pattern, normalized):
                extracted.add(skill)

        return sorted(list(extracted))

    def evaluate_role_domain_breakdown(
        self,
        resume_text: str,
        target_role: str,
        custom_jd: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates real-time, role-specific diagnostic feedback across ALL 5 Core Technical Domains:
          1. ml_ai_analytics (Machine Learning & AI / Data Science)
          2. fullstack_frontend (Full Stack & Web Engineering)
          3. data_engineering_databases (Data Engineering, Databases & Analytics)
          4. cloud_devops (Cloud, DevOps & Systems)
          5. dsa_core (DSA, Problem Solving & Software Fundamentals)
        """
        extracted_skills = set(self.extract_skills(resume_text))
        using_custom_jd = bool(custom_jd and custom_jd.strip())

        role_info = ROLE_BENCHMARKS.get(target_role, ROLE_BENCHMARKS["AI / ML Engineer"])
        fallback_domains = role_info.get("domain_requirements", {})

        domain_keys = [
            ("ml_ai_analytics", "Machine Learning & AI / Data Science"),
            ("fullstack_frontend", "Full Stack & Web Engineering"),
            ("data_engineering_databases", "Data Engineering, Databases & Analytics"),
            ("cloud_devops", "Cloud, DevOps & Systems"),
            ("dsa_core", "DSA, Problem Solving & Software Fundamentals"),
        ]

        # Determine target requirements per domain
        target_domain_skills: Dict[str, List[str]] = {k: [] for k, _ in domain_keys}

        if using_custom_jd:
            jd_skills = self.extract_skills(custom_jd)
            for s in jd_skills:
                dom = SKILL_TO_DOMAIN_MAP.get(s)
                if dom and dom in target_domain_skills:
                    if s not in target_domain_skills[dom]:
                        target_domain_skills[dom].append(s)

            # Fallback for any empty domain in custom_jd to the benchmark role domain requirements
            for d_key, _ in domain_keys:
                if not target_domain_skills[d_key]:
                    target_domain_skills[d_key] = fallback_domains.get(d_key, [])
        else:
            for d_key, _ in domain_keys:
                target_domain_skills[d_key] = fallback_domains.get(d_key, [])

        domain_diagnostics = {}

        for d_key, d_name in domain_keys:
            req_skills = target_domain_skills[d_key]
            matched = [s for s in req_skills if s in extracted_skills]
            missing = [s for s in req_skills if s not in extracted_skills]

            if not req_skills:
                health_score = 100.0
            else:
                health_score = round((len(matched) / len(req_skills)) * 100, 1)

            strong_points = [s.title() for s in matched]
            gaps = [s.title() for s in missing]

            # Generate actionable recommendation fill-in-the-blank bullet template
            recommendation = self._generate_domain_recommendation(d_key, target_role, missing, matched)

            domain_diagnostics[d_key] = {
                "domain_name": d_name,
                "health_score": health_score,
                "strong_points": strong_points,
                "gaps": gaps,
                "recommendation": recommendation,
                "actionable_recommendation": recommendation
            }

        return domain_diagnostics

    def _generate_domain_recommendation(
        self,
        domain_key: str,
        target_role: str,
        missing_skills: List[str],
        matched_skills: List[str]
    ) -> str:
        if not missing_skills:
            return f"Strong coverage demonstrated in {target_role} requirements for this domain! Quantify impact metrics in project bullet points."

        top_missing = [s.title() for s in missing_skills[:3]]
        top_missing_str = ", ".join(top_missing)

        if domain_key == "ml_ai_analytics":
            if any(s in missing_skills for s in ["pytorch", "tensorflow", "deep learning"]):
                return "Build and evaluate a PyTorch / TensorFlow deep learning pipeline (e.g. Transformers / CNN) quantifying model precision, recall, and inference latency."
            return f"Incorporate hands-on evidence of {top_missing_str} by detailing model validation, feature engineering, and cross-validation accuracy."

        elif domain_key == "fullstack_frontend":
            if any(s in missing_skills for s in ["unity", "unreal engine", "c++", "shader graph"]):
                return "Architect an interactive real-time graphics scene in Unity / C++ showcasing physics interaction and custom shaders."
            if any(s in missing_skills for s in ["react", "node.js", "fastapi", "typescript"]):
                return "Develop a responsive full-stack web interface in React integrated with RESTful API backend endpoints and JWT authentication."
            return f"Add bullet points showcasing modern full-stack development using {top_missing_str}."

        elif domain_key == "data_engineering_databases":
            if any(s in missing_skills for s in ["etl", "spark", "kafka", "snowflake"]):
                return f"Build an automated SQL/ETL workflow in PostgreSQL using {top_missing_str} to transform raw transactional data into structured reporting views."
            return f"Design a normalized relational schema in PostgreSQL using {top_missing_str} for scalable query execution."

        elif domain_key == "cloud_devops":
            if any(s in missing_skills for s in ["docker", "kubernetes"]):
                return "Containerize application microservices using Docker and orchestrate automated deployments via Kubernetes & CI/CD."
            return f"Deploy infrastructure on AWS / Cloud using Terraform and automated GitHub Actions CI/CD workflows for {top_missing_str}."

        elif domain_key == "dsa_core":
            return f"Optimize algorithmic complexity using Dynamic Programming and efficient Data Structures ({top_missing_str}), documenting time/space complexity improvements."

        return f"Add measurable project accomplishments demonstrating proficiency in {top_missing_str}."

    def evaluate_ats(
        self,
        text: str,
        target_role: str,
        custom_jd: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate a resume against a target role benchmark.
        """
        text_lower = text.lower()
        using_custom_jd = bool(custom_jd and custom_jd.strip())

        # 1. Section Presence (25 pts)
        sections = {
            "Contact Info": bool(re.search(
                r'(@|phone|email|linkedin|github|\+91|\+1)', text_lower)),
            "Education": bool(re.search(
                r'(education|bachelor|b\.tech|degree|university|institute|gpa|cgpa)', text_lower)),
            "Experience / Projects": bool(re.search(
                r'(experience|projects|work experience|internship|academic projects)', text_lower)),
            "Technical Skills": bool(re.search(
                r'(skills|technical skills|technologies|tools|competencies)', text_lower)),
        }
        section_score = (sum(sections.values()) / len(sections)) * 25.0

        # 2. Quantifiable Impact & Metrics (25 pts)
        metric_matches = re.findall(
            r'(\d+[\d\.,]*%|\$\d+|\d+\s*x|\b\d+\s*(?:ms|users|requests|queries|'
            r'accuracy|precision|recall|retention|reduction|increase|improvement)\b)',
            text_lower
        )
        metric_score = min(25.0, len(metric_matches) * 6.5)

        # 3. Target Role Keyword Matching (35 pts)
        role_info = ROLE_BENCHMARKS.get(target_role, ROLE_BENCHMARKS["AI / ML Engineer"])
        essential = list(role_info["essential_skills"])
        important = list(role_info["important_skills"])

        # Merge skills extracted from custom JD into keyword pools
        if using_custom_jd:
            jd_skills = self.extract_skills(custom_jd)
            for s in jd_skills:
                if s not in essential and s not in important:
                    important.append(s)

        extracted_skills = self.extract_skills(text)
        matched_essential = [s for s in essential if s in extracted_skills]
        matched_important = [s for s in important if s in extracted_skills]
        missing_essential = [s for s in essential if s not in extracted_skills]

        essential_coverage = len(matched_essential) / max(1, len(essential))
        important_coverage = len(matched_important) / max(1, len(important))
        keyword_score = (essential_coverage * 25.0) + (important_coverage * 10.0)

        # 4. Action Verbs & Structural Formatting (15 pts)
        action_verbs = [
            "developed", "built", "implemented", "optimized", "engineered",
            "designed", "deployed", "trained", "architected", "served", "collaborated"
        ]
        verb_matches = [v for v in action_verbs if v in text_lower]
        formatting_score = min(15.0, 5.0 + len(verb_matches) * 2.0)

        total_ats_score = round(
            min(100.0, section_score + metric_score + keyword_score + formatting_score), 1
        )

        suggestions = []
        if len(metric_matches) < 3:
            suggestions.append(
                "Add quantifiable metric gaps: Include measurable impact percentages "
                "(e.g. 'Optimized inference latency by 35%' or 'Achieved 92% F1-score')."
            )
        if missing_essential:
            top_missing = [s.title() for s in missing_essential[:4]]
            suggestions.append(
                f"Missing core keywords for {target_role}: "
                f"Add evidence of {', '.join(top_missing)}."
            )
        if not sections["Contact Info"]:
            suggestions.append("Add clear GitHub and LinkedIn portfolio links in header.")

        tech_stack_gaps = [s.title() for s in missing_essential[:5]]
        if not tech_stack_gaps and "docker" not in extracted_skills:
            tech_stack_gaps.append("Docker")

        # 5. Semantic Similarity — cosine similarity against JD vector
        jd_text = custom_jd.strip() if using_custom_jd else role_info["jd_description"]
        vectorizer = TfidfVectorizer(stop_words='english')
        try:
            tfidf_matrix = vectorizer.fit_transform([text, jd_text])
            similarity_score = float(
                cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            )
            vector_match_pct = round(similarity_score * 100, 1)
        except Exception:
            vector_match_pct = 78.0

        # Multi-domain diagnostics evaluation
        domain_diagnostics = self.evaluate_role_domain_breakdown(
            resume_text=text,
            target_role=target_role,
            custom_jd=custom_jd
        )

        return {
            "ats_score": total_ats_score,
            "overall_ats_score": total_ats_score,
            "formatting_score": round(
                min(100.0, (section_score + formatting_score) / 40.0 * 100), 1
            ),
            "keyword_score": round(min(100.0, keyword_score / 35.0 * 100), 1),
            "vector_match_pct": vector_match_pct,
            "extracted_skills": [s.title() for s in extracted_skills],
            "matched_skills": [s.title() for s in matched_essential + matched_important],
            "missing_skills": [s.title() for s in missing_essential],
            "tech_stack_gaps": tech_stack_gaps,
            "achievement_metric_gaps": metric_matches[:5],
            "suggestions": suggestions,
            "target_role": target_role,
            "used_custom_jd": using_custom_jd,
            "domain_diagnostics": domain_diagnostics,
        }


nlp_analyzer = ResumeNLPAnalyzer()
