"""
Tests for the coding practice module. No server needed.

Run:  cd backend  ->  python -m pytest test_coding_practice.py -v
"""
import json
import os

import pytest

from app.services.coding_engine import coding_engine

DATA = json.load(open(os.path.join(os.path.dirname(__file__), "app", "data", "coding_problems.json"), encoding="utf-8"))
PROBLEMS = DATA["problems"]


def test_bank_has_five_problems_per_difficulty():
    counts = {}
    for p in PROBLEMS:
        counts[p["difficulty"]] = counts.get(p["difficulty"], 0) + 1
    assert counts == {"Easy": 5, "Medium": 5, "Hard": 5}


def test_problem_ids_are_unique():
    ids = [p["id"] for p in PROBLEMS]
    assert len(ids) == len(set(ids))


@pytest.mark.parametrize("problem", PROBLEMS, ids=[p["id"] for p in PROBLEMS])
def test_reference_solution_is_accepted(problem):
    result = coding_engine.evaluate_code(problem["id"], problem["solution"], "submit")
    assert result["status"] == "Accepted", result["feedback"]


@pytest.mark.parametrize("problem", PROBLEMS, ids=[p["id"] for p in PROBLEMS])
def test_starter_code_is_not_accepted(problem):
    """The editor must never start with a working solution."""
    result = coding_engine.evaluate_code(problem["id"], problem["starter_code"], "submit")
    assert result["status"] != "Accepted"


def test_public_view_hides_solutions_and_hidden_tests():
    for p in coding_engine.get_public_problems():
        assert "solution" not in p
        assert "hidden_tests" not in p


def test_run_mode_uses_only_examples():
    p = PROBLEMS[0]
    result = coding_engine.evaluate_code(p["id"], p["solution"], "run")
    assert result["total_tests"] == len(p["examples"])
    assert all(not t["hidden"] for t in result["test_results"])


def test_hidden_test_details_are_not_returned():
    result = coding_engine.evaluate_code("binary_search", "def search(nums, target):\n    return -1\n", "submit")
    for t in result["test_results"]:
        if t["hidden"]:
            assert "input" not in t and "expected" not in t and "output" not in t


def test_infinite_loop_times_out():
    result = coding_engine.evaluate_code("two_sum", "def twoSum(nums, target):\n    while True:\n        pass\n")
    assert result["status"] == "Time Limit Exceeded"


def test_brute_force_times_out_on_large_hard_test():
    brute = (
        "def trap(height):\n"
        "    w = 0\n"
        "    for i in range(len(height)):\n"
        "        w += min(max(height[:i+1]), max(height[i:])) - height[i]\n"
        "    return w\n"
    )
    result = coding_engine.evaluate_code("trapping_rain_water", brute)
    assert result["status"] == "Time Limit Exceeded"
    assert result["passed_tests"] > 0  # small tests still pass


@pytest.mark.parametrize("code", [
    "import os\ndef twoSum(nums, target):\n    return os.listdir('.')\n",
    "import subprocess\ndef twoSum(nums, target):\n    return []\n",
])
def test_dangerous_imports_are_blocked(code):
    result = coding_engine.evaluate_code("two_sum", code)
    assert result["status"] == "Compile Error"
    assert "not allowed" in result["error"]


def test_open_is_blocked():
    result = coding_engine.evaluate_code("two_sum", "def twoSum(nums, target):\n    return open('x').read()\n")
    assert result["status"] == "Runtime Error"


def test_syntax_error_reports_line():
    result = coding_engine.evaluate_code("two_sum", "def twoSum(nums, target)\n    return []\n")
    assert result["status"] == "Compile Error"
    assert "line 1" in result["error"]


def test_wrong_function_name():
    result = coding_engine.evaluate_code("two_sum", "def two_sum(nums, target):\n    return [0, 1]\n")
    assert result["status"] == "Compile Error"
    assert "twoSum" in result["error"]


def test_unknown_problem_raises():
    with pytest.raises(KeyError):
        coding_engine.evaluate_code("does_not_exist", "x = 1")
