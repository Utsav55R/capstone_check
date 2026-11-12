from typing import Dict, List, Any, Tuple
from app.config import settings

def get_skill_grade(score: float) -> Dict[str, str]:
    """
    Global helper function mapping numerical scores (0-100) to strict 6-tier categorical grades and hex color codes:
      0-30   : Grade = "Very Poor", Color = "#8B0000" (Dark Red)
      30-50  : Grade = "Poor",      Color = "#FF4D4D" (Light Red)
      50-60  : Grade = "Moderate",  Color = "#FFA500" (Orange)
      60-75  : Grade = "Good",      Color = "#90EE90" (Light Green)
      75-90  : Grade = "Very Good", Color = "#008000" (Dark Green)
      90-100 : Grade = "Excellent", Color = "#00BFFF" (Sky Blue)
    """
    s = round(float(score), 1)
    if s < 30.0:
        return {
            "grade": "Very Poor",
            "color": "#8B0000",
            "bg_color": "#FDEAE5",
            "badge_bg": "bg-[#8B0000] text-white",
            "bar_bg": "bg-[#8B0000]"
        }
    elif s < 50.0:
        return {
            "grade": "Poor",
            "color": "#FF4D4D",
            "bg_color": "#FFE6E6",
            "badge_bg": "bg-[#FF4D4D] text-white",
            "bar_bg": "bg-[#FF4D4D]"
        }
    elif s < 60.0:
        return {
            "grade": "Moderate",
            "color": "#FFA500",
            "bg_color": "#FFF5E6",
            "badge_bg": "bg-[#FFA500] text-white",
            "bar_bg": "bg-[#FFA500]"
        }
    elif s < 75.0:
        return {
            "grade": "Good",
            "color": "#90EE90",
            "bg_color": "#F0FFF0",
            "badge_bg": "bg-[#90EE90] text-[#1C4A57]",
            "bar_bg": "bg-[#90EE90]"
        }
    elif s < 90.0:
        return {
            "grade": "Very Good",
            "color": "#008000",
            "bg_color": "#E6F4E6",
            "badge_bg": "bg-[#008000] text-white",
            "bar_bg": "bg-[#008000]"
        }
    else:
        return {
            "grade": "Excellent",
            "color": "#00BFFF",
            "bg_color": "#E0F7FF",
            "badge_bg": "bg-[#00BFFF] text-[#1C4A57]",
            "bar_bg": "bg-[#00BFFF]"
        }


ROLE_COMPETENCY_TAXONOMY: Dict[str, List[Dict[str, Any]]] = {
    "AI / ML Engineer": [
        {"key": "python", "label": "Python", "score_key": "python", "target": 80},
        {"key": "ml", "label": "Machine Learning", "score_key": "ml", "target": 75},
        {"key": "deep_learning", "label": "Deep Learning", "score_key": "deep_learning", "target": 70},
        {"key": "dsa", "label": "DSA / Algorithms", "score_key": "dsa", "target": 75},
        {"key": "projects", "label": "ML Projects", "score_key": "projects", "target": 75},
        {"key": "resume_quality", "label": "Resume Quality", "score_key": "resume_quality", "target": 80},
        {"key": "interview_readiness", "label": "Interview Readiness", "score_key": "interview_readiness", "target": 70},
        {"key": "sql", "label": "SQL & Data Storage", "score_key": "sql", "target": 70},
        {"key": "comm_readiness", "label": "Communication Readiness", "score_key": "comm_readiness", "target": 70},
    ],
    "Full Stack Developer": [
        {"key": "react_frontend", "label": "React & Frontend", "score_key": "python", "target": 80},
        {"key": "node_fastapi", "label": "FastAPI / Node Backend", "score_key": "ml", "target": 75},
        {"key": "sql_db", "label": "SQL & PostgreSQL", "score_key": "sql", "target": 70},
        {"key": "dsa", "label": "DSA & Problem Solving", "score_key": "dsa", "target": 75},
        {"key": "docker_devops", "label": "Docker & Web APIs", "score_key": "projects", "target": 70},
        {"key": "resume_quality", "label": "Resume Quality", "score_key": "resume_quality", "target": 80},
        {"key": "interview_readiness", "label": "Interview Readiness", "score_key": "interview_readiness", "target": 70},
        {"key": "comm_readiness", "label": "Communication Readiness", "score_key": "comm_readiness", "target": 70},
    ],
    "Cloud / DevOps Engineer": [
        {"key": "linux_bash", "label": "Linux & Shell Scripting", "score_key": "python", "target": 85},
        {"key": "docker_k8s", "label": "Docker & Kubernetes", "score_key": "deep_learning", "target": 75},
        {"key": "aws_cloud", "label": "AWS & Cloud Platforms", "score_key": "ml", "target": 70},
        {"key": "terraform_iac", "label": "Terraform & IaC", "score_key": "dsa", "target": 65},
        {"key": "cicd_git", "label": "CI/CD & Git Pipelines", "score_key": "sql", "target": 75},
        {"key": "python_auto", "label": "Python Automation", "score_key": "projects", "target": 80},
        {"key": "resume_quality", "label": "Resume Quality", "score_key": "resume_quality", "target": 80},
        {"key": "interview_readiness", "label": "Interview Readiness", "score_key": "interview_readiness", "target": 70},
        {"key": "comm_readiness", "label": "Communication Readiness", "score_key": "comm_readiness", "target": 70},
    ],
    "Game Developer": [
        {"key": "cpp_csharp", "label": "C++ & C# Programming", "score_key": "python", "target": 85},
        {"key": "unity_engine", "label": "Unity Engine", "score_key": "ml", "target": 75},
        {"key": "unreal_engine", "label": "Unreal Engine", "score_key": "deep_learning", "target": 40},
        {"key": "math_3d", "label": "3D Mathematics & Vectors", "score_key": "dsa", "target": 75},
        {"key": "physics_shaders", "label": "Physics Engine & Shaders", "score_key": "sql", "target": 60},
        {"key": "opengl_directx", "label": "OpenGL / DirectX APIs", "score_key": "projects", "target": 50},
        {"key": "resume_quality", "label": "Resume Quality", "score_key": "resume_quality", "target": 80},
        {"key": "interview_readiness", "label": "Interview Readiness", "score_key": "interview_readiness", "target": 70},
        {"key": "comm_readiness", "label": "Communication Readiness", "score_key": "comm_readiness", "target": 70},
    ],
    "Data Engineer": [
        {"key": "python", "label": "Python Pipelines", "score_key": "python", "target": 85},
        {"key": "sql_db", "label": "SQL & Relational DBs", "score_key": "sql", "target": 85},
        {"key": "spark_kafka", "label": "Apache Spark & Kafka", "score_key": "ml", "target": 65},
        {"key": "etl_pipelines", "label": "ETL & Data Warehousing", "score_key": "deep_learning", "target": 55},
        {"key": "snowflake_bq", "label": "Snowflake & BigQuery", "score_key": "dsa", "target": 60},
        {"key": "docker_airflow", "label": "Docker & Airflow", "score_key": "projects", "target": 70},
        {"key": "resume_quality", "label": "Resume Quality", "score_key": "resume_quality", "target": 80},
        {"key": "interview_readiness", "label": "Interview Readiness", "score_key": "interview_readiness", "target": 70},
        {"key": "comm_readiness", "label": "Communication Readiness", "score_key": "comm_readiness", "target": 70},
    ],
    "Data Analyst": [
        {"key": "sql", "label": "SQL Querying & JOINs", "score_key": "sql", "target": 85},
        {"key": "excel", "label": "Advanced Excel", "score_key": "python", "target": 85},
        {"key": "power_bi_tableau", "label": "Power BI & Tableau", "score_key": "deep_learning", "target": 25},
        {"key": "python_pandas", "label": "Python & Pandas", "score_key": "ml", "target": 75},
        {"key": "statistics_ab", "label": "Statistics & A/B Testing", "score_key": "dsa", "target": 65},
        {"key": "data_viz", "label": "Data Visualization", "score_key": "projects", "target": 70},
        {"key": "resume_quality", "label": "Resume Quality", "score_key": "resume_quality", "target": 80},
        {"key": "interview_readiness", "label": "Interview Readiness", "score_key": "interview_readiness", "target": 70},
        {"key": "comm_readiness", "label": "Communication Readiness", "score_key": "comm_readiness", "target": 70},
    ],
}


class PlacementReadinessEngine:
    def __init__(self):
        self.role_weights = settings.ROLE_DIMENSION_WEIGHTS

    def get_role_competencies(
        self,
        target_role: str,
        dimension_scores: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """
        Filters and returns ONLY domain-relevant skills for the selected target_role,
        attaching 6-tier categorical grade labels and color hex codes.
        """
        tax_list = ROLE_COMPETENCY_TAXONOMY.get(
            target_role,
            ROLE_COMPETENCY_TAXONOMY["AI / ML Engineer"]
        )

        competencies = []
        for item in tax_list:
            raw_score = float(dimension_scores.get(item["score_key"], 50.0))
            grade_info = get_skill_grade(raw_score)

            competencies.append({
                "key": item["key"],
                "label": item["label"],
                "score": round(raw_score, 1),
                "target": item["target"],
                "grade": grade_info["grade"],
                "color": grade_info["color"],
                "bg_color": grade_info["bg_color"],
                "badge_bg": grade_info["badge_bg"],
                "bar_bg": grade_info["bar_bg"]
            })

        return competencies

    def calculate_readiness(
        self,
        target_role: str,
        dimension_scores: Dict[str, float]
    ) -> Tuple[float, str, List[Dict[str, Any]], Dict[str, str]]:
        """
        Calculates the Dynamic Placement Readiness Score (0-100), readiness tier,
        ranked AI Priority Actions (P1-P5), and diagnostic explanation.
        """
        weights = self.role_weights.get(target_role, self.role_weights["AI / ML Engineer"])

        raw_weighted = sum(weights.get(dim, 0.1) * dimension_scores.get(dim, 50.0) for dim in weights.keys())

        synergy_bonus = 0.0
        if dimension_scores.get("python", 0) >= 80.0 and dimension_scores.get("ml", 0) >= 70.0:
            synergy_bonus = 3.5

        overall_score = round(raw_weighted + synergy_bonus)
        overall_score = max(0.0, min(100.0, float(overall_score)))

        if overall_score <= 40:
            tier = "Beginner"
        elif overall_score <= 60:
            tier = "Intermediate"
        elif overall_score <= 80:
            tier = "Advanced"
        else:
            tier = "Expert"

        urgency_multipliers = {
            "deep_learning": 1.2,
            "dsa": 1.1,
            "projects": 1.0,
            "resume_quality": 2.2,
            "interview_readiness": 0.9,
            "sql": 0.8,
            "ml": 0.7,
            "comm_readiness": 0.6,
            "python": 0.5
        }

        deficits = []
        for dim, w in weights.items():
            curr_score = dimension_scores.get(dim, 50.0)
            urgency = urgency_multipliers.get(dim, 1.0)
            deficit = w * (100.0 - curr_score) * urgency
            deficits.append({
                "dimension": dim,
                "current_score": curr_score,
                "weight": w,
                "deficit": deficit
            })

        deficits.sort(key=lambda x: x["deficit"], reverse=True)

        priority_actions = []
        priority_labels = ["P1", "P2", "P3", "P4", "P5"]

        action_mapping = {
            "deep_learning": {
                "title": "Improve weakest technical competency",
                "recommended": "Deep Learning ({score}%) -> targeted module + practice set",
                "action_type": "course"
            },
            "dsa": {
                "title": "Strengthen coding / problem solving",
                "recommended": "DSA ({score}%) -> timed practice, evaluated",
                "action_type": "practice"
            },
            "projects": {
                "title": "Build a relevant project",
                "recommended": "End-to-end project aligned to {role}",
                "action_type": "project"
            },
            "resume_quality": {
                "title": "Improve resume gaps",
                "recommended": "Add project evidence and missing role keywords",
                "action_type": "resume"
            },
            "interview_readiness": {
                "title": "Practice targeted technical interviews",
                "recommended": "Questions weighted toward technical gaps",
                "action_type": "interview"
            },
            "sql": {
                "title": "Sharpen database querying",
                "recommended": "SQL ({score}%) -> Window functions, indexing and query optimization drill",
                "action_type": "practice"
            },
            "ml": {
                "title": "Advance Machine Learning pipelines",
                "recommended": "ML ({score}%) -> Feature engineering & cross-validation metrics",
                "action_type": "course"
            },
            "comm_readiness": {
                "title": "Refine technical communication",
                "recommended": "Practice structured STAR method explanations for technical trade-offs",
                "action_type": "interview"
            },
            "python": {
                "title": "Master advanced Python paradigms",
                "recommended": "Python ({score}%) -> AsyncIO, generators, and type annotations",
                "action_type": "practice"
            }
        }

        for idx, item in enumerate(deficits[:5]):
            dim = item["dimension"]
            score = item["current_score"]
            template = action_mapping.get(dim, {
                "title": f"Strengthen {dim.replace('_', ' ').title()}",
                "recommended": f"Targeted study and practice for {dim}",
                "action_type": "practice"
            })

            p_label = priority_labels[idx]
            priority_actions.append({
                "priority": p_label,
                "title": template["title"],
                "description": f"Target role deficit weight: {round(item['deficit'], 1)} pts",
                "dimension": dim,
                "current_score": score,
                "recommended_action": template["recommended"].format(score=int(score), role=target_role),
                "action_type": template["action_type"]
            })

        diagnostics = {
            "why_is_it_low": f"Competencies are evaluated strictly against target requirements for {target_role}.",
            "what_next": "A ranked action list, refreshed after every activity.",
            "score_philosophy": "The score is a diagnosis, not a verdict — the explanation and the next action matter more than the number."
        }

        return overall_score, tier, priority_actions, diagnostics


readiness_engine = PlacementReadinessEngine()
