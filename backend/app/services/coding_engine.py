"""
Coding practice engine.

- Problems live in app/data/coding_problems.json (5 Easy, 5 Medium, 5 Hard).
  To add a problem, add an entry there (see README_CODING.md for the format).
- Students can solve problems in Python, Java or C++.
  Python runs in a separate process (sandbox_runner.py); Java and C++ are compiled and
  run by compiled_runner.py. Both use time limits, so a crash or infinite loop can never
  take down the API server, and both report results in the same format.
- "run" mode uses only the visible examples and shows full details.
  "submit" mode also runs hidden tests, whose inputs are never sent to the browser.
"""
import json
import os
import subprocess
import sys
from typing import Any, Dict, List, Optional

from app.services import compiled_runner

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "coding_problems.json")
RUNNER_PATH = os.path.join(os.path.dirname(__file__), "sandbox_runner.py")

TIME_LIMIT_SECONDS = 4.0          # whole submission, all tests together
MAX_CODE_CHARS = 20_000
FLOAT_TOLERANCE = 1e-5
DIFFICULTY_ORDER = {"Easy": 0, "Medium": 1, "Hard": 2}
SUPPORTED_LANGUAGES = ("python", "java", "cpp")


def _expand(value: Any) -> Any:
    """Expand compact test-data specs used in the JSON file."""
    if isinstance(value, dict) and "$range" in value:
        return list(range(*value["$range"]))
    if isinstance(value, dict) and "$repeat" in value:
        base, times = value["$repeat"]
        return base * times
    return value


def _expand_input(inp: Dict[str, Any]) -> Dict[str, Any]:
    return {k: _expand(v) for k, v in inp.items()}


def _preview(value: Any, limit: int = 120) -> str:
    text = repr(value)
    return text if len(text) <= limit else text[:limit] + "…"


def _outputs_match(actual: Any, expected: Any, mode: str) -> bool:
    if mode == "float":
        try:
            return abs(float(actual) - float(expected)) <= FLOAT_TOLERANCE
        except (TypeError, ValueError):
            return False
    if mode == "sorted":
        return isinstance(actual, list) and sorted(actual) == sorted(expected)
    if isinstance(expected, bool):
        return isinstance(actual, bool) and actual == expected
    return actual == expected


class CodingEngine:
    def __init__(self) -> None:
        with open(DATA_PATH, encoding="utf-8") as f:
            data = json.load(f)
        self._problems: List[Dict[str, Any]] = sorted(
            data["problems"], key=lambda p: DIFFICULTY_ORDER.get(p["difficulty"], 9)
        )
        self._by_id = {p["id"]: p for p in self._problems}

    # ---------- problem access ----------
    def get_problem_by_id(self, problem_id: str) -> Optional[Dict[str, Any]]:
        return self._by_id.get(problem_id)

    def get_public_problems(self) -> List[Dict[str, Any]]:
        """Problem data that is safe to send to the browser: no hidden tests, no solutions."""
        return [self.public_view(p) for p in self._problems]

    @staticmethod
    def public_view(p: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": p["id"],
            "title": p["title"],
            "difficulty": p["difficulty"],
            "topic": p["topic"],
            "points": p["points"],
            "function_name": p["function_name"],
            "description": p["description"],
            "constraints": p["constraints"],
            "hints": p["hints"],
            "starter_code": p["starter_code"],
            "starter_codes": p.get("starter_codes") or {"python": p["starter_code"]},
            "examples": [
                {"input": e["input"], "output": e["expected"], "explanation": e.get("explanation")}
                for e in p["examples"]
            ],
            "total_tests": len(p["examples"]) + len(p["hidden_tests"]),
        }

    # Kept for backward compatibility with older callers
    def get_problems(self) -> List[Dict[str, Any]]:
        return self.get_public_problems()

    @staticmethod
    def get_solution(problem: Dict[str, Any], language: str = "python") -> Optional[str]:
        """Reference solution in the requested language (None if this problem has none)."""
        solutions = problem.get("solutions") or {"python": problem["solution"]}
        return solutions.get(language)

    @staticmethod
    def languages() -> List[Dict[str, Any]]:
        return compiled_runner.available_languages()

    # ---------- execution ----------
    def _run_in_sandbox(self, code: str, function_name: str, inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
        payload = json.dumps({"code": code, "function_name": function_name, "inputs": inputs})
        timed_out = False
        try:
            proc = subprocess.run(
                [sys.executable, "-I", RUNNER_PATH],
                input=payload,
                capture_output=True,
                text=True,
                timeout=TIME_LIMIT_SECONDS,
            )
            raw_out = proc.stdout
        except subprocess.TimeoutExpired as exc:
            timed_out = True
            raw_out = exc.stdout or ""
            if isinstance(raw_out, bytes):
                raw_out = raw_out.decode("utf-8", errors="replace")

        events = []
        for line in raw_out.splitlines():
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return {"events": events, "timed_out": timed_out}

    def evaluate_code(self, problem_id: str, code_str: str, mode: str = "submit",
                      language: str = "python") -> Dict[str, Any]:
        """
        mode="run"    -> visible examples only, full details (input, expected, output, prints)
        mode="submit" -> examples + hidden tests; hidden test inputs/outputs are never revealed
        language      -> "python", "java" or "cpp"
        """
        problem = self.get_problem_by_id(problem_id)
        if problem is None:
            raise KeyError(f"Unknown problem '{problem_id}'")
        if language not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported language '{language}'")
        if language != "python" and "signature" not in problem:
            raise ValueError(f"'{problem['title']}' is only available in Python")

        tests = [dict(t, hidden=False) for t in problem["examples"]]
        if mode == "submit":
            tests += [dict(t, hidden=True) for t in problem["hidden_tests"]]
        total = len(tests)

        base = {"problem_id": problem_id, "mode": mode, "language": language, "total_tests": total}

        if len(code_str) > MAX_CODE_CHARS:
            return {**base, "status": "Compile Error", "passed_tests": 0, "score": 0.0,
                    "error": f"Code is too long (limit {MAX_CODE_CHARS} characters).", "test_results": [],
                    "feedback": "Code is too long."}

        inputs = [_expand_input(t["input"]) for t in tests]
        if language == "python":
            run = self._run_in_sandbox(code_str, problem["function_name"], inputs)
        else:
            run = compiled_runner.run_compiled(language, code_str, problem["function_name"],
                                               problem["signature"], inputs)
        events = run["events"]
        crash = run.get("crash")

        compile_error = next((e for e in events if e.get("event") == "compile_error"), None)
        if compile_error:
            return {**base, "status": "Compile Error", "passed_tests": 0, "score": 0.0,
                    "error": compile_error["error"], "test_results": [], "feedback": compile_error["error"]}
        if not any(e.get("event") == "compiled" for e in events):
            msg = ("Time Limit Exceeded while loading your code." if run["timed_out"]
                   else crash or "The sandbox stopped unexpectedly (possibly out of memory).")
            return {**base, "status": "Time Limit Exceeded" if run["timed_out"] else "Runtime Error",
                    "passed_tests": 0, "score": 0.0, "error": msg, "test_results": [], "feedback": msg}

        results_by_index = {e["i"]: e for e in events if e.get("event") == "result"}
        test_results = []
        passed = 0
        first_failure = None
        crash_reported = False

        for i, t in enumerate(tests):
            expected = _expand(t["expected"])
            r = results_by_index.get(i)
            entry: Dict[str, Any] = {"index": i + 1, "hidden": t["hidden"]}

            if r is None:
                if run["timed_out"]:
                    entry.update(passed=False, verdict="Time Limit Exceeded")
                elif crash and not crash_reported:
                    # The program crashed while running this test (e.g. segmentation fault)
                    entry.update(passed=False, verdict="Runtime Error", error=crash)
                    crash_reported = True
                else:
                    entry.update(passed=False, verdict="Not Run")
            elif not r["ok"]:
                entry.update(passed=False, verdict="Runtime Error", error=r["error"], ms=r["ms"])
            elif _outputs_match(r["output"], expected, problem.get("compare", "exact")):
                entry.update(passed=True, verdict="Passed", ms=r["ms"])
                passed += 1
            else:
                entry.update(passed=False, verdict="Wrong Answer", ms=r["ms"])

            if not t["hidden"]:
                entry["input"] = t["input"]
                entry["expected"] = expected
                if r is not None:
                    entry["output"] = r.get("output") if r["ok"] else None
                    entry["stdout"] = r.get("stdout", "")

            if not entry["passed"] and first_failure is None:
                first_failure = entry
            test_results.append(entry)

        # Output a C++ program wrote with printf() cannot be split per test; show it with the first example
        program_output = run.get("program_output") or ""
        if program_output and test_results and not test_results[0]["hidden"]:
            test_results[0]["stdout"] = program_output + test_results[0].get("stdout", "")

        if passed == total:
            status = "Accepted"
        elif first_failure["verdict"] in ("Time Limit Exceeded", "Runtime Error"):
            status = first_failure["verdict"]
        else:
            status = "Wrong Answer"

        return {
            **base,
            "status": status,
            "passed_tests": passed,
            "score": round(passed / total * 100.0, 1),
            "test_results": test_results,
            "feedback": self._feedback(status, first_failure),
        }

    @staticmethod
    def _feedback(status: str, failure: Optional[Dict[str, Any]]) -> str:
        if status == "Accepted":
            return "All test cases passed."
        where = f"{'Hidden test' if failure['hidden'] else 'Example'} {failure['index']}"
        if failure["verdict"] == "Time Limit Exceeded":
            return f"{where} took too long. Look for a more efficient approach (check the constraints)."
        if failure["verdict"] == "Runtime Error":
            return f"{where} crashed: {failure.get('error', '')}"
        if failure["hidden"]:
            return f"{where} gave a wrong answer. Think about edge cases: empty inputs, single elements, duplicates, negatives."
        return (f"{where} gave a wrong answer. Expected {_preview(failure['expected'])}, "
                f"got {_preview(failure.get('output'))}.")


coding_engine = CodingEngine()
