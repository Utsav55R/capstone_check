"""
Tests for Java and C++ support in coding practice. No server needed.
Tests for a language are skipped automatically if its compiler is not installed
(Java needs a JDK: javac + java; C++ needs g++ or clang++).

Run:  cd backend  ->  python -m pytest test_coding_languages.py -v
"""
import json
import os

import pytest

from app.services import compiled_runner
from app.services.coding_engine import coding_engine

DATA = json.load(open(os.path.join(os.path.dirname(__file__), "app", "data", "coding_problems.json"), encoding="utf-8"))
PROBLEMS = DATA["problems"]
LANGS = ["java", "cpp"]


def needs(lang):
    return pytest.mark.skipif(not compiled_runner.is_available(lang), reason=f"{lang} compiler not installed")


def lang_params():
    return [pytest.param(lang, marks=needs(lang), id=lang) for lang in LANGS]


def problem_params():
    return [pytest.param(lang, p, marks=needs(lang), id=f"{lang}-{p['id']}") for lang in LANGS for p in PROBLEMS]


def evaluate(lang, code, problem_id="binary_search", mode="submit"):
    return coding_engine.evaluate_code(problem_id, code, mode, language=lang)


JAVA_SEARCH = """class Solution {
    public int search(int[] nums, int target) {
%s
    }
}
"""
CPP_SEARCH = """#include <bits/stdc++.h>
using namespace std;
class Solution {
public:
    int search(vector<int>& nums, int target) {
%s
    }
};
"""


def search_code(lang, body):
    return (JAVA_SEARCH if lang == "java" else CPP_SEARCH) % body


# ---------- problem bank ----------
def test_every_problem_has_all_languages():
    for p in PROBLEMS:
        assert set(p["starter_codes"]) == {"python", "java", "cpp"}, p["id"]
        assert set(p["solutions"]) == {"python", "java", "cpp"}, p["id"]
        assert "signature" in p, p["id"]


def test_public_view_has_starters_but_no_solutions():
    for p in coding_engine.get_public_problems():
        assert set(p["starter_codes"]) == {"python", "java", "cpp"}
        assert "solutions" not in p and "solution" not in p


def test_java_solutions_use_no_lambdas():
    for p in PROBLEMS:
        assert "->" not in p["solutions"]["java"], p["id"]


def test_languages_list():
    ids = [l["id"] for l in coding_engine.languages()]
    assert ids == ["python", "java", "cpp"]


def test_unsupported_language_is_rejected():
    with pytest.raises(ValueError):
        coding_engine.evaluate_code("binary_search", "x", "submit", language="ruby")


# ---------- reference solutions and starters ----------
@pytest.mark.parametrize("lang,problem", problem_params())
def test_reference_solution_is_accepted(lang, problem):
    result = evaluate(lang, problem["solutions"][lang], problem["id"])
    assert result["status"] == "Accepted", result["feedback"]
    assert result["language"] == lang


@pytest.mark.parametrize("lang,problem", problem_params())
def test_starter_code_is_not_accepted(lang, problem):
    result = evaluate(lang, problem["starter_codes"][lang], problem["id"])
    assert result["status"] != "Accepted"
    assert result["status"] != "Compile Error", result.get("error")


# ---------- errors ----------
@pytest.mark.parametrize("lang", lang_params())
def test_compile_error_reports_line(lang):
    result = evaluate(lang, search_code(lang, "        return nums.size( +;"))
    assert result["status"] == "Compile Error"
    line = 3 if lang == "java" else 6     # line of the broken statement in the student's file
    assert f":{line}:" in result["error"]
    assert "/tmp" not in result["error"]   # temp paths are hidden


@pytest.mark.parametrize("lang", lang_params())
def test_wrong_method_name(lang):
    code = search_code(lang, "        return -1;").replace("int search(", "int find(")
    result = evaluate(lang, code)
    assert result["status"] == "Compile Error"
    assert "search" in result["error"]


@pytest.mark.parametrize("lang", lang_params())
def test_runtime_error(lang):
    body = "        return nums[nums.length + 5];" if lang == "java" else "        return nums.at(nums.size() + 5);"
    result = evaluate(lang, search_code(lang, body), mode="run")
    assert result["status"] == "Runtime Error"


@pytest.mark.parametrize("lang", lang_params())
def test_infinite_loop_times_out(lang):
    body = "        int x = 0;\n        while (true) { x++; if (x < 0) x = 0; }"
    result = evaluate(lang, search_code(lang, body), mode="run")
    assert result["status"] == "Time Limit Exceeded"


@pytest.mark.parametrize("lang", lang_params())
def test_wrong_answer_and_hidden_tests_not_leaked(lang):
    result = evaluate(lang, search_code(lang, "        return -1;"))
    assert result["status"] == "Wrong Answer"
    for t in result["test_results"]:
        if t["hidden"]:
            assert "input" not in t and "expected" not in t and "output" not in t


@pytest.mark.parametrize("lang", lang_params())
def test_prints_are_captured_per_test(lang):
    pr = 'System.out.println("hello");' if lang == "java" else 'cout << "hello" << endl;'
    result = evaluate(lang, search_code(lang, f"        {pr}\n        return -1;"), mode="run")
    assert "hello" in result["test_results"][0].get("stdout", "")


@needs("cpp")
def test_cpp_segfault_is_reported():
    body = "        int* p = nullptr;\n        if (nums.size() > 0) *p = 1;\n        return -1;"
    result = evaluate("cpp", search_code("cpp", body))
    assert result["status"] == "Runtime Error"


@pytest.mark.parametrize("lang,body", [
    pytest.param("java", '        Runtime.getRuntime().exec("ls");\n        return 0;', marks=needs("java"), id="java-runtime"),
    pytest.param("java", "        System.exit(0);\n        return 0;", marks=needs("java"), id="java-exit"),
    pytest.param("cpp", '        system("ls");\n        return 0;', marks=needs("cpp"), id="cpp-system"),
    pytest.param("cpp", '        ofstream f("x.txt");\n        return 0;', marks=needs("cpp"), id="cpp-file"),
])
def test_blocked_calls(lang, body):
    result = evaluate(lang, search_code(lang, body))
    assert result["status"] == "Compile Error"
    assert "Not allowed" in result["error"]
