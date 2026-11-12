# Coding Practice Module

Owner: Utsav Raj (23BCE10920)

Students solve DSA problems in Python, Java or C++ (they pick the language above the
editor). Code runs in an isolated sandbox against visible
examples and hidden tests, and the first accepted solution to each problem raises the
student's DSA readiness, which feeds the Placement Readiness Score.

## Problem bank

15 problems, 5 per difficulty, covering the common placement topics.

| Difficulty | Problems | DSA gain on first solve |
|---|---|---|
| Easy | Two Sum, Valid Parentheses, Best Time to Buy and Sell Stock, Valid Anagram, Binary Search | +3 |
| Medium | Maximum Subarray, Coin Change, Longest Substring Without Repeating Characters, Number of Islands, Product of Array Except Self | +6 |
| Hard | Trapping Rain Water, Median of Two Sorted Arrays, Edit Distance, Largest Rectangle in Histogram, Word Ladder | +10 |

Each problem has a description, constraints, 2 visible examples, 4 to 6 hidden tests,
2 progressive hints and a reference solution in each language. Several Medium and Hard problems include a
large hidden test, so a brute-force solution passes the small tests but gets
Time Limit Exceeded, just like on a real judge.

## How it works

```
Browser  --POST /coding/run or /submit-->  coding_routes.py
                                               |
                                         coding_engine.py  (loads problems, compares outputs)
                                               |
             Python:  new Python process: sandbox_runner.py
                      (4 s time limit, 512 MB memory cap on Linux/macOS,
                       only safe standard-library imports, no open/eval/exec)
         Java / C++:  compiled_runner.py
                      (compiles the student's class with a generated test harness,
                       runs it with a time limit, blocks files/processes/exit)
```

- Run checks the visible examples only and shows input, expected output, the student's
  output and anything they printed. Nothing is saved.
- Submit also runs the hidden tests. Their inputs and outputs never leave the server;
  the student only sees "Hidden test 4: Wrong Answer".
- Only the first accepted submission of a problem changes the score, so re-submitting
  a solved problem cannot inflate readiness.
- When a student solves 2 problems in one of their weak topics (for example Dynamic
  Programming), that topic is removed from their weak topics.
- The reference solution unlocks only after the student solves the problem, in the
  language selected in the editor.
- Solving a problem counts once, whichever language is used. Each submission stores its
  language.
- The editor keeps a separate draft per problem and per language, so switching
  language never loses code.

## Java and C++

Students write a `class Solution` with one method, LeetCode style. The starter code already
has the right signature, for example:

```java
class Solution {
    public int search(int[] nums, int target) { ... }
}
```

```cpp
class Solution {
public:
    int search(vector<int>& nums, int target) { ... }
};
```

- The server generates a `main` that feeds every test to the method, so students must not
  write `main` themselves.
- Compile errors show the student's own line numbers. Runtime errors (exceptions,
  segmentation faults, stack overflow) and Time Limit Exceeded are reported per test,
  like on a real judge.
- `System.out.println` / `cout` output is shown under each example.
- Limits: Java 6 s and 256 MB heap, C++ 4 s (plus compile time).
- Not allowed: files, running processes, `System.exit`/`exit()`, threads, reflection,
  `#include "..."`.

### Installing the compilers (needed on the machine running the backend)

Python works out of the box. If a compiler is missing, that language is shown greyed out
with the reason, and the rest of the app works normally.

**Windows**
1. Java: install a JDK 17 or newer, e.g. Eclipse Temurin from https://adoptium.net
   (tick "Set JAVA_HOME" and "Add to PATH" in the installer).
2. C++: install MinGW-w64 g++, e.g. from https://www.msys2.org then in the MSYS2
   terminal run `pacman -S mingw-w64-ucrt-x86_64-gcc` and add
   `C:\msys64\ucrt64\bin` to PATH.
3. Close and reopen VS Code, then check in a new terminal:
   `javac -version`, `java -version`, `g++ --version`.
4. Restart the backend (`uvicorn ...`). The server detects the compilers on startup.

**macOS**: `brew install openjdk` and `xcode-select --install` (gives clang++).
**Ubuntu**: `sudo apt install default-jdk g++`.

To use a specific compiler, set `JAVA_HOME` or `CXX` (for example `CXX=clang++`).

## API

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/coding/problems` | No | All problems (starter code for every language), without hidden tests or solutions, plus `languages` |
| GET | `/api/v1/coding/languages` | No | Python / Java / C++ and whether each is installed on the server |
| GET | `/api/v1/coding/progress` | Yes | Solved and attempted problems, counts per difficulty, weak topics |
| POST | `/api/v1/coding/run` | Yes | Run visible examples. Body: `{problem_id, code, language}`; `language` is `python` (default), `java` or `cpp` |
| POST | `/api/v1/coding/submit` | Yes | Run all tests, save submission, update readiness |
| GET | `/api/v1/coding/solution/{id}?language=java` | Yes | Reference solution, only after solving (403 otherwise) |

## Adding a problem

1. Open `backend/tools/build_coding_bank.py` and copy an existing `add(...)` block.
2. Fill in the fields and write a correct reference `solution`. Leave expected outputs
   out; the script computes them by running your solution.
3. In `backend/tools/coding_bank_languages.py` add the problem's typed signature to
   `SIGNATURES` (parameter types: `int`, `int[]`, `string`, `string[]`, `char[][]`;
   return types: `int`, `bool`, `double`, `int[]`) and a Java and C++ reference solution
   to `JAVA_SOLUTIONS` and `CPP_SOLUTIONS`. Starter code is generated from the signature.
4. For large inputs, use `{"$range": [start, stop, step]}` or `{"$repeat": [base, times]}`
   instead of pasting huge lists.
5. Rebuild and test:

```
cd backend
python tools/build_coding_bank.py
python -m pytest test_coding_practice.py test_coding_languages.py -q
```

## Tests

`backend/test_coding_practice.py` (43 tests) checks that every reference solution is
accepted, blank starter code is never accepted, hidden tests don't leak, infinite loops
and brute-force solutions time out, and dangerous imports are blocked.

`backend/test_coding_languages.py` does the same for Java and C++: all 30 reference
solutions are accepted, starters are not, and compile errors, runtime errors, crashes,
time limits, printed output and blocked calls behave correctly. Tests for a language
are skipped if its compiler is not installed.

## Known limitations

The sandbox is a guard rail suitable for a college project, not a security boundary.
Python code can't be fully contained from inside Python, and the Java/C++ checks are
pattern-based. For a public deployment, run
submissions in a container or use a judge service such as Judge0. The memory limit
also only applies on Linux and macOS; on Windows only the time limit applies.
