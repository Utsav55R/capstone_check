import json
import re
import datetime
from typing import Dict, List, Any, Optional
import httpx
from app.config import settings

class AdaptiveInterviewEngine:
    def __init__(self):
        self.gemini_api_key = settings.GEMINI_API_KEY
        self.openai_api_key = settings.OPENAI_API_KEY

    def get_initial_greeting(self, target_role: str, user_name: Optional[str] = None) -> str:
        name_str = f" {user_name}" if user_name else ""
        return (
            f"Hello{name_str}! I'm Saraswati, Senior Technical Recruiter & Talent Acquisition Lead. "
            f"Welcome to your technical interview for the {target_role} position. "
            f"Let's begin! Please introduce yourself and give me a brief overview of your background "
            f"and why you are interested in pursuing a career as a {target_role}."
        )

    def determine_categorical_grade(self, score_0_to_100: float) -> Dict[str, str]:
        """
        Maps score strictly into our Dashboard's 6-Tier Grading Model:
          0-30   : Very Poor  (#8B0000 - Dark Red)
          30-50  : Poor       (#FF4D4D - Light Red)
          50-60  : Moderate   (#FFA500 - Orange)
          60-75  : Good       (#90EE90 - Light Green)
          75-90  : Very Good  (#008000 - Dark Green)
          90-100 : Excellent  (#00BFFF - Sky Blue)
        """
        s = round(score_0_to_100, 1)
        if s >= 90:
            return {"grade": "Excellent", "color": "#00BFFF", "bg": "#E0F7FF"}
        elif s >= 75:
            return {"grade": "Very Good", "color": "#008000", "bg": "#E6F4E6"}
        elif s >= 60:
            return {"grade": "Good", "color": "#90EE90", "bg": "#F0FFF0"}
        elif s >= 50:
            return {"grade": "Moderate", "color": "#FFA500", "bg": "#FFF5E6"}
        elif s >= 30:
            return {"grade": "Poor", "color": "#FF4D4D", "bg": "#FFE6E6"}
        else:
            return {"grade": "Very Poor", "color": "#8B0000", "bg": "#F9E6E6"}

    def generate_next_saraswati_turn(
        self,
        current_stage: int,
        turn_count: int,
        target_role: str,
        difficulty_level: str,
        last_turn_score: float,
        candidate_response: str,
    ) -> Dict[str, Any]:
        """
        Determines the next stage, difficulty scaling, and Saraswati's next conversational question.
        """
        next_stage = current_stage
        next_difficulty = difficulty_level
        hint_or_feedback = ""

        # Difficulty Scaling based on last turn score (0-10 scale)
        if last_turn_score >= 7.0: # >= 70%
            if difficulty_level == "basic":
                next_difficulty = "intermediate"
            elif difficulty_level == "intermediate":
                next_difficulty = "advanced"
            hint_or_feedback = "Great explanation! You demonstrated solid understanding."
        elif last_turn_score < 5.0: # < 50%
            if difficulty_level == "advanced":
                next_difficulty = "intermediate"
            elif difficulty_level == "intermediate":
                next_difficulty = "basic"
            hint_or_feedback = "Good attempt. Here is a subtle hint: focus on the core trade-offs and underlying principles."

        # Stage Progression Logic based on turns
        if turn_count == 1:
            next_stage = 2 # Move to Stage 2: Resume & Projects
        elif turn_count in [2, 3]:
            next_stage = 2
        elif turn_count in [4, 5, 6]:
            next_stage = 3 # Stage 3: Technical Assessment
        elif turn_count >= 7:
            next_stage = 4 # Stage 4: Conclusion

        # Stage 2: Resume, Projects & Past Experience Questions
        if next_stage == 2:
            if turn_count == 1 or turn_count == 2:
                q_text = (
                    f"Thank you for that introduction. Looking at your resume and experience for {target_role}, "
                    f"could you walk me through the most technically challenging project you have worked on? "
                    f"Please highlight your specific contributions using the STAR method (Situation, Task, Action, Result)."
                )
            else:
                q_text = (
                    f"That's insightful. When working on projects for {target_role}, how do you handle unexpected technical "
                    f"roadblocks, API breaks, or tight timelines? Give me a concrete example of a trade-off you had to make."
                )

        # Stage 3: Adaptive Technical Questions tailored to target_role & difficulty
        elif next_stage == 3:
            q_text = self._get_role_technical_question(target_role, next_difficulty, turn_count)
            if hint_or_feedback:
                q_text = f"{hint_or_feedback}\n\n{q_text}"

        # Stage 4: Conclusion
        else:
            q_text = (
                f"Thank you so much for answering all my questions! You have successfully completed "
                f"the interview session for the {target_role} role. I have recorded all your responses. "
                f"Click the 'Generate Complete Analysis & Report' button below to view your executive performance report!"
            )

        return {
            "next_stage": next_stage,
            "next_difficulty": next_difficulty,
            "saraswati_text": q_text,
            "is_conclusion": (next_stage == 4)
        }

    def _get_role_technical_question(self, target_role: str, difficulty: str, turn_count: int) -> str:
        role_questions = {
            "AI / ML Engineer": {
                "basic": "Explain how you address class imbalance in machine learning datasets. What metrics would you choose over accuracy?",
                "intermediate": "How do Transformer architectures utilize Multi-Head Attention mechanisms? What is the role of positional encodings?",
                "advanced": "Design an end-to-end real-time ML inference pipeline handling 10k requests/sec. How do you mitigate model latency and feature store drift?"
            },
            "Full Stack Developer": {
                "basic": "Explain how React handles state updates and re-rendering using the Virtual DOM compared to direct DOM manipulation.",
                "intermediate": "How do you implement secure user authentication using JWT tokens and HTTP-only cookies in a FastAPI / Node.js app?",
                "advanced": "How would you architect a scalable full-stack application supporting real-time WebSocket updates, server-side rendering, and database caching?"
            },
            "Cloud / DevOps Engineer": {
                "basic": "What is the difference between Docker images and containers? How do you optimize Dockerfile layer caching?",
                "intermediate": "Explain how Kubernetes orchestrates pod scaling and ingress routing. How do you implement zero-downtime rolling updates?",
                "advanced": "Design a multi-region Infrastructure as Code architecture using Terraform with automated GitHub Actions CI/CD pipelines and Prometheus monitoring."
            },
            "Game Developer": {
                "basic": "Explain the Game Loop in Unity or Unreal Engine. How do Update() and FixedUpdate() differ in handling physics?",
                "intermediate": "How do you optimize 3D math rendering and draw calls using Shader Graph and Level of Detail (LOD) techniques?",
                "advanced": "Architect a multiplayer real-time physics synchronization system in C++ / Unreal Engine. How do you handle client prediction and server reconciliation?"
            },
            "Data Engineer": {
                "basic": "What is the difference between OLTP and OLAP database schemas? Explain normalized vs star schema design.",
                "intermediate": "How do you design scalable ETL workflows using Apache Spark and Kafka for streaming data processing?",
                "advanced": "Architect an enterprise Data Lakehouse in Snowflake / BigQuery handling petabyte-scale data pipelines with dbt data validation and automated recovery."
            },
            "Data Analyst": {
                "basic": "Explain how SQL JOIN operations (INNER, LEFT, RIGHT, FULL) differ, and how you write subqueries for aggregated metrics.",
                "intermediate": "How do you perform A/B testing hypothesis evaluation using statistical confidence intervals and p-values in Python / Pandas?",
                "advanced": "How do you build executive business intelligence dashboards in Power BI / Tableau to track churn rate, cohort retention, and customer lifetime value?"
            }
        }

        role_dict = role_questions.get(target_role, role_questions["AI / ML Engineer"])
        return role_dict.get(difficulty, role_dict["basic"])

    def generate_question(
        self,
        interview_type: str,
        target_role: str,
        resume_summary: Optional[str] = None,
        weak_topics: Optional[List[str]] = None
    ) -> Dict[str, str]:
        """
        Backwards-compatible initial question generator.
        """
        greeting = self.get_initial_greeting(target_role)
        return {
            "question": greeting,
            "context_source": "Saraswati AI Recruiter"
        }

    async def evaluate_response(
        self,
        question: str,
        student_response: str,
        target_role: str
    ) -> Dict[str, Any]:
        """
        Turn-by-turn text response evaluation across 4 parameters:
          1. Relevance (0-10)
          2. Structure / STAR Method (0-10)
          3. Technical Correctness (0-10)
          4. Depth & Trade-offs (0-10)
        """
        if self.gemini_api_key:
            try:
                eval_result = await self._call_gemini_evaluation(question, student_response, target_role)
                if eval_result:
                    return eval_result
            except Exception:
                pass

        return self._evaluate_with_rubric(question, student_response, target_role)

    def _evaluate_with_rubric(self, question: str, response: str, target_role: str) -> Dict[str, Any]:
        response_clean = response.strip().lower()
        word_count = len(response_clean.split())

        # 1. Relevance (0-10)
        rel_keywords = [
            "python", "sql", "model", "react", "data", "docker", "project",
            "experience", "pipeline", "api", "system", "team", "learned", "metric",
            "accuracy", "f1", "precision", "join", "scale", "performance", "unity", "c++",
            "imbalance", "smote", "auc", "focal", "loss", "sampling", "evaluation", "metrics"
        ]
        matched_rel = [k for k in rel_keywords if k in response_clean]
        relevance_score = min(10.0, max(5.0, len(matched_rel) * 2.0 + (word_count > 15) * 2.0))

        # 2. Structure / STAR Method (0-10)
        structure_markers = [
            "first", "second", "specifically", "situation", "task", "action", "result",
            "approach", "because", "furthermore", "finally", "handled", "led", "built", "implemented", "used", "address"
        ]
        matched_struct = [m for m in structure_markers if m in response_clean]
        structure_score = min(10.0, max(5.0, len(matched_struct) * 1.5 + (word_count > 15) * 2.0))

        # 3. Technical Correctness (0-10)
        tech_terms = [
            "smote", "overfitting", "latency", "postgres", "fastapi", "jwt", "spark",
            "transformer", "shader", "dataframe", "indexing", "container", "kubernetes",
            "validation", "hypothesis", "virtual dom", "convolution", "gradient", "focal loss",
            "oversampling", "undersampling", "pr-auc", "f1-score"
        ]
        matched_tech = [t for t in tech_terms if t in response_clean]
        correctness_score = min(10.0, max(5.0, 5.0 + len(matched_tech) * 2.0))

        # 4. Depth & Trade-offs (0-10)
        tradeoff_words = [
            "trade-off", "latency", "scale", "bottleneck", "cost", "throughput",
            "optimization", "security", "cache", "fallback", "consistency", "isolation"
        ]
        matched_tradeoff = [w for w in tradeoff_words if w in response_clean]
        depth_score = min(10.0, max(3.0, len(matched_tradeoff) * 2.5 + (word_count > 50) * 2.5))

        # Composite score out of 10
        overall_turn_score = round(
            (relevance_score * 0.25 + structure_score * 0.25 + correctness_score * 0.30 + depth_score * 0.20),
            1
        )

        strengths = []
        if matched_tech:
            strengths.append(f"Clear mention of core technical concepts ({', '.join(matched_tech[:3])}).")
        if structure_score >= 6.5:
            strengths.append("Structured response adhering to logical breakdown / STAR method.")
        if not strengths:
            strengths.append("Direct response addressing the interviewer prompt.")

        improvements = []
        if depth_score < 7.0:
            improvements.append("Quantify measurable project outcomes (e.g. latency reduction, throughput, accuracy %).")
        if correctness_score < 7.0:
            improvements.append("Incorporate specific domain terminology and architectural trade-offs.")

        model_answer = (
            f"Exemplar Answer for {target_role}: 'When approaching this problem, I structured my workflow "
            f"around three core principles: 1) System Architecture & Trade-offs, 2) Technical Execution using "
            f"domain best practices, and 3) Quantitative Validation. Specifically, I measured the baseline performance, "
            f"optimized bottlenecks, and achieved measurable improvements while maintaining high reliability.'"
        )

        return {
            "score": overall_turn_score,
            "relevance_score": round(relevance_score, 1),
            "structure_score": round(structure_score, 1),
            "correctness_score": round(correctness_score, 1),
            "depth_score": round(depth_score, 1),
            "strengths": " • ".join(strengths),
            "improvements": " • ".join(improvements) if improvements else "Excellent depth and technical rigor demonstrated.",
            "model_answer": model_answer,
            "missing_concepts": [t.title() for t in ["Architectural Trade-offs", "Quantitative Impact Metrics"] if t not in response_clean]
        }

    async def _call_gemini_evaluation(self, question: str, response: str, target_role: str) -> Optional[Dict[str, Any]]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_api_key}"
        prompt = f"""
You are Saraswati, Senior Technical Recruiter & Talent Acquisition Lead evaluating a candidate's text response for a {target_role} role.
Question: {question}
Candidate Response: {response}

Evaluate strictly according to this rubric and return ONLY valid JSON matching this schema:
{{
  "score": float (0-10),
  "relevance_score": float (0-10),
  "structure_score": float (0-10),
  "correctness_score": float (0-10),
  "depth_score": float (0-10),
  "strengths": string,
  "improvements": string,
  "model_answer": string,
  "missing_concepts": array of strings
}}
"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group(0))
        return None

    def generate_final_report_matrix(
        self,
        target_role: str,
        messages: List[Dict[str, Any]],
        turn_evaluations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generates executive composite scores, 6-Tier categorical grade,
        weak technical topics, and 7-Day Improvement Checklist.
        """
        if not turn_evaluations:
            avg_rel = 7.0
            avg_struct = 6.5
            avg_corr = 6.8
            avg_depth = 6.0
        else:
            avg_rel = sum(e.get("relevance_score", 6.0) for e in turn_evaluations) / len(turn_evaluations)
            avg_struct = sum(e.get("structure_score", 6.0) for e in turn_evaluations) / len(turn_evaluations)
            avg_corr = sum(e.get("correctness_score", 6.0) for e in turn_evaluations) / len(turn_evaluations)
            avg_depth = sum(e.get("depth_score", 6.0) for e in turn_evaluations) / len(turn_evaluations)

        # Composite score out of 100
        overall_composite_pct = round(
            min(100.0, (avg_rel * 0.25 + avg_struct * 0.25 + avg_corr * 0.30 + avg_depth * 0.20) * 10.0),
            1
        )

        grade_info = self.determine_categorical_grade(overall_composite_pct)

        # Role-specific weak topics & 7-Day Actionable Checklist
        role_strategy = {
            "AI / ML Engineer": {
                "weak_topics": ["Class Imbalance Handling & SMOTE", "Transformer Multi-Head Attention", "Model Latency & Real-Time Inference"],
                "checklist": [
                    "Day 1-2: Revisit PyTorch & Scikit-learn evaluation metrics (PR-AUC vs ROC-AUC).",
                    "Day 3-4: Build a mini RAG pipeline using LangChain and vector embeddings.",
                    "Day 5-6: Quantify model inference metrics and add latency numbers to resume bullets.",
                    "Day 7: Run a mock AI interview on Saraswati to benchmark improvement."
                ]
            },
            "Full Stack Developer": {
                "weak_topics": ["State Management & Virtual DOM Optimization", "JWT & HTTP-Only Cookie Security", "WebSocket Real-Time Subscriptions"],
                "checklist": [
                    "Day 1-2: Practice React custom hooks and Redux Toolkit state slice management.",
                    "Day 3-4: Implement OAuth2 / JWT authentication flow with FastAPI and PostgreSQL.",
                    "Day 5-6: Refactor API endpoints to return structured error payloads and latency metrics.",
                    "Day 7: Conduct mock interview session focusing on full-stack system design."
                ]
            },
            "Cloud / DevOps Engineer": {
                "weak_topics": ["Docker Layer Caching & Multi-Stage Builds", "Kubernetes Ingress & Pod Lifecycle", "Terraform Multi-Region State Management"],
                "checklist": [
                    "Day 1-2: Write multi-stage Dockerfiles reducing image size by >= 50%.",
                    "Day 3-4: Configure Kubernetes HPA (Horizontal Pod Autoscaler) and Ingress controllers.",
                    "Day 5-6: Automate a GitHub Actions CI/CD pipeline deploying to AWS EKS.",
                    "Day 7: Re-evaluate system reliability concepts in a mock interview turn."
                ]
            },
            "Game Developer": {
                "weak_topics": ["FixedUpdate vs Update Physics Lifecycle", "Shader Graph & Draw Call Optimization", "Client Prediction & Server Reconciliation"],
                "checklist": [
                    "Day 1-2: Optimize Unity/Unreal mesh LODs and batch draw calls.",
                    "Day 3-4: Write custom Shader Graph nodes for real-time lighting.",
                    "Day 5-6: Implement C++ memory management and smart pointer logic.",
                    "Day 7: Run a mock interview focusing on 3D Math & Game Engine mechanics."
                ]
            },
            "Data Engineer": {
                "weak_topics": ["OLTP vs OLAP Schema Normalization", "Apache Spark Streaming & Window Operations", "Snowflake / BigQuery Data Warehouse Partitioning"],
                "checklist": [
                    "Day 1-2: Write complex SQL window functions (ROW_NUMBER, LEAD/LAG, PARTITION BY).",
                    "Day 3-4: Build a PySpark ETL script processing streaming JSON telemetry.",
                    "Day 5-6: Configure dbt data testing models and data lineage graphs.",
                    "Day 7: Complete a mock interview on Data Pipeline & Architecture."
                ]
            },
            "Data Analyst": {
                "weak_topics": ["SQL Subqueries & Window Aggregations", "A/B Testing Hypothesis Evaluation & P-Values", "Executive Dashboard Cohort Retention Charts"],
                "checklist": [
                    "Day 1-2: Master SQL CTEs, window functions, and multi-table JOINs.",
                    "Day 3-4: Perform hypothesis testing & confidence interval calculations in Python.",
                    "Day 5-6: Build an interactive Power BI / Tableau dashboard showing retention cohorts.",
                    "Day 7: Practice structured STAR responses in Saraswati interview mode."
                ]
            }
        }

        strat = role_strategy.get(target_role, role_strategy["AI / ML Engineer"])

        return {
            "overall_composite_score": overall_composite_pct,
            "categorical_grade": grade_info["grade"],
            "grade_color": grade_info["color"],
            "grade_bg": grade_info["bg"],
            "parameter_breakdown": {
                "relevance_score": round(avg_rel * 10, 1),
                "structure_score": round(avg_struct * 10, 1),
                "correctness_score": round(avg_corr * 10, 1),
                "depth_score": round(avg_depth * 10, 1),
            },
            "weak_topics": strat["weak_topics"],
            "actionable_checklist": strat["checklist"]
        }


interview_engine = AdaptiveInterviewEngine()
