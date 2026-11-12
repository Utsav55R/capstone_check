"""
Judge for Java and C++ submissions.

How it works:
  1. The student's code is saved as Solution.java / solution.cpp in a fresh temp folder.
  2. A small generated "harness" (Main.java / main.cpp) reads the test inputs from
     stdin, calls the student's Solution method once per test, and writes one JSON
     line per test (output, time, anything the student printed) to a results file.
  3. The harness is compiled together with the student's code and run with a time
     limit (and a memory limit on Linux/macOS).
  4. The results are returned as the same events the Python sandbox produces, so
     coding_engine.py scores all three languages the same way.

Each test result is written and flushed as soon as it finishes, so if the program
crashes or runs out of time, the earlier tests still count.

Requirements on the machine running the backend:
  Java : a JDK (javac + java) on PATH, or JAVA_HOME set
  C++  : g++ (or clang++) on PATH, or the CXX environment variable set
If a compiler is missing, that language is reported as unavailable instead of failing.

Safety: like the Python sandbox, this is a guard rail for a college project, not a
hardened jail. Code using files, processes, networking or exit() is rejected before
compiling, and runs are time- and memory-limited. For a public deployment, run
submissions in a container or a judge service such as Judge0.
"""
import functools
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from typing import Any, Dict, List, Optional

IS_WINDOWS = os.name == "nt"

COMPILE_TIMEOUT_SECONDS = 30.0
RUN_TIMEOUT_SECONDS = {"java": 6.0, "cpp": 4.0}   # Java gets extra time for JVM start-up
CPP_MEMORY_LIMIT_BYTES = 512 * 1024 * 1024
CPP_STACK_BYTES = 256 * 1024 * 1024
MAX_STDOUT_CHARS = 2000
MAX_ERROR_LINES = 30

LANGUAGE_LABELS = {"python": "Python 3", "java": "Java", "cpp": "C++"}

# --------------------------------------------------------------------------- toolchains

@functools.lru_cache(maxsize=None)
def _java_tools() -> Optional[Dict[str, str]]:
    exe = ".exe" if IS_WINDOWS else ""
    java_home = os.environ.get("JAVA_HOME")
    if java_home:
        javac = os.path.join(java_home, "bin", "javac" + exe)
        java = os.path.join(java_home, "bin", "java" + exe)
        if os.path.isfile(javac) and os.path.isfile(java):
            return {"javac": javac, "java": java}
    javac, java = shutil.which("javac"), shutil.which("java")
    if javac and java:
        return {"javac": javac, "java": java}
    return None


@functools.lru_cache(maxsize=None)
def _cpp_tools() -> Optional[Dict[str, str]]:
    for candidate in (os.environ.get("CXX"), "g++", "clang++"):
        if candidate:
            path = shutil.which(candidate)
            if path:
                return {"cxx": path}
    return None


def is_available(language: str) -> bool:
    if language == "python":
        return True
    if language == "java":
        return _java_tools() is not None
    if language == "cpp":
        return _cpp_tools() is not None
    return False


def available_languages() -> List[Dict[str, Any]]:
    """What the frontend shows in the language picker."""
    missing = {
        "java": "Java is not installed on the server. Install a JDK (javac and java) and restart the backend.",
        "cpp": "No C++ compiler found on the server. Install g++ (MinGW-w64 on Windows) and restart the backend.",
    }
    result = []
    for lang, label in LANGUAGE_LABELS.items():
        ok = is_available(lang)
        result.append({"id": lang, "label": label, "available": ok, "reason": None if ok else missing.get(lang)})
    return result

# --------------------------------------------------------------------------- safety checks

CPP_BLOCKED = [
    (r'#\s*include\s*"', 'Local #include "..." files'),
    (r"#\s*include\s*<\s*[/\\.]", "#include with a file path"),
    (r"#\s*include\s*<\s*(filesystem|fstream|thread|future|csignal|signal\.h|unistd\.h|fcntl\.h|sys/|"
     r"windows\.h|io\.h|direct\.h|process\.h|dirent\.h|dlfcn\.h|spawn\.h)", "That header"),
    (r"\b(i|o)?fstream\b", "File streams"),
    (r"\b(system|popen|_popen|_wpopen|fork|vfork|execl|execlp|execle|execv|execvp|execve|posix_spawn\w*|"
     r"CreateProcess\w*|ShellExecute\w*|WinExec|fopen|_wfopen|freopen|fdopen|unlink|rmdir|mkdir|chdir|kill|"
     r"dlopen|LoadLibrary\w*)\s*\(", "Files, processes and system calls"),
    (r"\b(exit|_exit|_Exit|quick_exit|abort)\s*\(", "exit() / abort(): return from your method instead"),
    (r"\b(asm|__asm|__asm__)\b", "Inline assembly"),
]

JAVA_BLOCKED = [
    (r"\b(Runtime|ProcessBuilder|ProcessHandle)\b", "Running processes"),
    (r"\b(FileInputStream|FileOutputStream|FileReader|FileWriter|RandomAccessFile)\b", "Reading or writing files"),
    (r"\bnew\s+File\s*\(", "Reading or writing files"),
    (r"\bjava\s*\.\s*(nio|net)\b", "File and network APIs"),
    (r"\b(Files|Paths)\s*\.\s*\w+\s*\(", "File APIs"),
    (r"\bSystem\s*\.\s*(exit|set\w*|getenv|getProperty|load\w*)\b", "System.exit / System.set... / environment access"),
    (r"\bjava\s*\.\s*lang\s*\.\s*reflect\b|\bClass\s*\.\s*forName\b|\bgetDeclared\w*\b|\bsetAccessible\b|"
     r"\bClassLoader\b|\bMethodHandles?\b|\bUnsafe\b", "Reflection"),
    (r"\bnew\s+Thread\b|\bExecutors?\b|\bExecutorService\b|\bForkJoinPool\b|\bCompletableFuture\b", "Threads"),
    (r"\bnative\b", "Native methods"),
    (r"\bclass\s+Main\b", "A class named Main (it is used by the judge)"),
]


def _strip_comments(code: str) -> str:
    code = re.sub(r"/\*.*?\*/", " ", code, flags=re.S)
    return re.sub(r"//[^\n]*", " ", code)


def check_code(language: str, code: str) -> Optional[str]:
    """Returns an error message if the code uses something the practice sandbox does not allow."""
    rules = JAVA_BLOCKED if language == "java" else CPP_BLOCKED
    cleaned = _strip_comments(code)
    for pattern, what in rules:
        match = re.search(pattern, cleaned)
        if match:
            line = cleaned.count("\n", 0, match.start()) + 1
            return (f"Not allowed in the practice sandbox: {what} "
                    f"(found '{match.group(0).strip()}' on line {line}).")
    if language == "cpp" and re.search(r"\bint\s+main\s*\(", cleaned):
        return "Remove your main() function. The judge calls your Solution method directly."
    if language == "java" and re.search(r"\bstatic\s+void\s+main\s*\(", cleaned):
        return "Remove your main() method. The judge calls your Solution method directly."
    return None

# --------------------------------------------------------------------------- input encoding

def _encode(value: Any, typ: str, out: List[str]) -> None:
    """Writes one argument as whitespace-separated integers (strings as character codes)."""
    if typ == "int":
        out.append(str(int(value)))
    elif typ == "int[]":
        out.append(str(len(value)))
        out.extend(str(int(v)) for v in value)
    elif typ == "string":
        out.append(str(len(value)))
        out.extend(str(ord(ch)) for ch in value)
    elif typ == "string[]":
        out.append(str(len(value)))
        for s in value:
            _encode(s, "string", out)
    elif typ == "char[][]":
        rows = len(value)
        cols = len(value[0]) if rows else 0
        out.append(f"{rows} {cols}")
        for row in value:
            out.extend(str(ord(ch)) for ch in row)
    else:
        raise ValueError(f"Unsupported parameter type '{typ}'")


def encode_inputs(signature: Dict[str, Any], inputs: List[Dict[str, Any]]) -> str:
    out = [str(len(inputs))]
    for kwargs in inputs:
        for param in signature["params"]:
            _encode(kwargs[param["name"]], param["type"], out)
    return " ".join(out) + "\n"

# --------------------------------------------------------------------------- Java harness

_JAVA_READ = {
    "int": "nextInt()", "int[]": "readIntArr()", "string": "readStr()",
    "string[]": "readStrList()", "char[][]": "readGrid()",
}
_JAVA_DECL = {"int": "int", "int[]": "int[]", "string": "String", "string[]": "List<String>", "char[][]": "char[][]"}
_JAVA_RET = {"int": "int", "bool": "boolean", "double": "double", "int[]": "int[]"}

_JAVA_TEMPLATE = r"""import java.io.*;
import java.util.*;

public class Main {
    static final PrintStream REAL_OUT = System.out;
    static InputStream in;
    static final byte[] BUF = new byte[1 << 16];
    static int bufLen = 0, bufPos = 0;

    static int readByte() throws IOException {
        if (bufPos == bufLen) {
            bufLen = in.read(BUF, 0, BUF.length);
            bufPos = 0;
            if (bufLen <= 0) return -1;
        }
        return BUF[bufPos++];
    }

    static int nextInt() throws IOException {
        int c = readByte();
        while (c != '-' && (c < '0' || c > '9')) { if (c == -1) return 0; c = readByte(); }
        boolean neg = false;
        if (c == '-') { neg = true; c = readByte(); }
        long r = 0;
        while (c >= '0' && c <= '9') { r = r * 10 + (c - '0'); c = readByte(); }
        return (int) (neg ? -r : r);
    }

    static int[] readIntArr() throws IOException {
        int n = nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = nextInt();
        return a;
    }

    static String readStr() throws IOException {
        int n = nextInt();
        StringBuilder sb = new StringBuilder(n);
        for (int i = 0; i < n; i++) sb.append((char) nextInt());
        return sb.toString();
    }

    static List<String> readStrList() throws IOException {
        int n = nextInt();
        List<String> list = new ArrayList<String>(n);
        for (int i = 0; i < n; i++) list.add(readStr());
        return list;
    }

    static char[][] readGrid() throws IOException {
        int rows = nextInt(), cols = nextInt();
        char[][] g = new char[rows][cols];
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) g[r][c] = (char) nextInt();
        return g;
    }

    static String j(int v) { return Integer.toString(v); }
    static String j(boolean v) { return v ? "true" : "false"; }
    static String j(double v) { return (Double.isNaN(v) || Double.isInfinite(v)) ? "null" : Double.toString(v); }
    static String j(int[] v) {
        if (v == null) return "null";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < v.length; i++) { if (i > 0) sb.append(','); sb.append(v[i]); }
        return sb.append(']').toString();
    }

    static String esc(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"') sb.append("\\\"");
            else if (c == '\\') sb.append("\\\\");
            else if (c == '\n') sb.append("\\n");
            else if (c == '\r') sb.append("\\r");
            else if (c == '\t') sb.append("\\t");
            else if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
            else sb.append(c);
        }
        return sb.append('"').toString();
    }

    static String describe(Throwable e) {
        String text;
        if (e instanceof StackOverflowError) text = "StackOverflowError: recursion is too deep";
        else if (e instanceof OutOfMemoryError) text = "OutOfMemoryError: memory limit exceeded";
        else text = e.getClass().getSimpleName() + (e.getMessage() != null ? ": " + e.getMessage() : "");
        for (StackTraceElement el : e.getStackTrace()) {
            if ("Solution.java".equals(el.getFileName())) {
                return text + " (line " + el.getLineNumber() + ")";
            }
        }
        return text;
    }

    public static void main(final String[] args) throws Exception {
        final Throwable[] fatal = new Throwable[1];
        // Large stack so deep recursion behaves like on online judges
        Thread t = new Thread(null, new Runnable() {
            public void run() {
                try { judge(args[0]); } catch (Throwable e) { fatal[0] = e; }
            }
        }, "judge", 1L << 26);
        t.start();
        t.join();
        System.exit(fatal[0] == null ? 0 : 3);
    }

    static void judge(String resultsPath) throws Exception {
        in = new BufferedInputStream(System.in, 1 << 16);
        PrintWriter res = new PrintWriter(new OutputStreamWriter(new FileOutputStream(resultsPath), "UTF-8"));
        int total = nextInt();
        for (int test = 0; test < total; test++) {
/*READS*/
            ByteArrayOutputStream captured = new ByteArrayOutputStream();
            System.setOut(new PrintStream(captured, true, "UTF-8"));
            String output = null, error = null;
            long start = System.nanoTime();
            try {
                /*RET*/ result = new Solution()./*METHOD*/(/*ARGS*/);
                output = j(result);
            } catch (Throwable e) {
                error = describe(e);
            }
            double ms = (System.nanoTime() - start) / 1e6;
            System.out.flush();
            System.setOut(REAL_OUT);
            String printed = captured.toString("UTF-8");
            if (printed.length() > 2000) printed = printed.substring(0, 2000);
            StringBuilder line = new StringBuilder();
            line.append("{\"i\":").append(test)
                .append(",\"ms\":").append(String.format(Locale.ROOT, "%.2f", ms))
                .append(",\"stdout\":").append(esc(printed));
            if (error == null) line.append(",\"ok\":true,\"output\":").append(output);
            else line.append(",\"ok\":false,\"error\":").append(esc(error));
            line.append('}');
            res.println(line.toString());
            res.flush();
        }
        res.close();
    }
}
"""


def java_harness(method: str, signature: Dict[str, Any]) -> str:
    reads = "\n".join(
        f"            {_JAVA_DECL[p['type']]} a{i} = {_JAVA_READ[p['type']]};"
        for i, p in enumerate(signature["params"])
    )
    args = ", ".join(f"a{i}" for i in range(len(signature["params"])))
    return (_JAVA_TEMPLATE.replace("/*READS*/", reads)
            .replace("/*RET*/", _JAVA_RET[signature["returns"]])
            .replace("/*METHOD*/", method)
            .replace("/*ARGS*/", args))

# --------------------------------------------------------------------------- C++ harness

# Portable replacement for <bits/stdc++.h>, so it also works with clang (macOS) and MinGW.
# Deliberately leaves out <fstream>, <filesystem> and <thread>.
_CPP_STDCXX_SHIM = """#ifndef SP_JUDGE_STDCXX
#define SP_JUDGE_STDCXX
#include <algorithm>
#include <array>
#include <bitset>
#include <cassert>
#include <cctype>
#include <cfloat>
#include <chrono>
#include <climits>
#include <cmath>
#include <complex>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <deque>
#include <functional>
#include <iomanip>
#include <iostream>
#include <iterator>
#include <limits>
#include <list>
#include <map>
#include <memory>
#include <numeric>
#include <optional>
#include <queue>
#include <random>
#include <set>
#include <sstream>
#include <stack>
#include <string>
#include <string_view>
#include <tuple>
#include <type_traits>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <variant>
#include <vector>
#endif
"""

_CPP_READ = {
    "int": "sp_judge::ni()", "int[]": "sp_judge::nia()", "string": "sp_judge::ns()",
    "string[]": "sp_judge::nsa()", "char[][]": "sp_judge::ng()",
}
_CPP_DECL = {
    "int": "int", "int[]": "std::vector<int>", "string": "std::string",
    "string[]": "std::vector<std::string>", "char[][]": "std::vector<std::vector<char>>",
}
_CPP_RET = {"int": "int", "bool": "bool", "double": "double", "int[]": "std::vector<int>"}

_CPP_TEMPLATE = r"""#include <bits/stdc++.h>
#include "solution.cpp"

namespace sp_judge {
static char ibuf[1 << 16];
static size_t ilen = 0, ipos = 0;

static int rb() {
    if (ipos == ilen) {
        ilen = fread(ibuf, 1, sizeof(ibuf), stdin);
        ipos = 0;
        if (ilen == 0) return -1;
    }
    return (unsigned char)ibuf[ipos++];
}

static int ni() {
    int c = rb();
    while (c != '-' && (c < '0' || c > '9')) { if (c == -1) return 0; c = rb(); }
    bool neg = false;
    if (c == '-') { neg = true; c = rb(); }
    long long r = 0;
    while (c >= '0' && c <= '9') { r = r * 10 + (c - '0'); c = rb(); }
    return (int)(neg ? -r : r);
}

static std::vector<int> nia() {
    int n = ni();
    std::vector<int> a(n);
    for (int i = 0; i < n; i++) a[i] = ni();
    return a;
}

static std::string ns() {
    int n = ni();
    std::string s;
    s.reserve(n);
    for (int i = 0; i < n; i++) s.push_back((char)ni());
    return s;
}

static std::vector<std::string> nsa() {
    int n = ni();
    std::vector<std::string> a;
    a.reserve(n);
    for (int i = 0; i < n; i++) a.push_back(ns());
    return a;
}

static std::vector<std::vector<char>> ng() {
    int rows = ni(), cols = ni();
    std::vector<std::vector<char>> g(rows, std::vector<char>(cols));
    for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) g[r][c] = (char)ni();
    return g;
}

static std::string j(int v) { return std::to_string(v); }
static std::string j(bool v) { return v ? "true" : "false"; }
static std::string j(double v) {
    if (!std::isfinite(v)) return "null";
    char b[64];
    snprintf(b, sizeof b, "%.17g", v);
    return b;
}
static std::string j(const std::vector<int>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) s += ','; s += std::to_string(v[i]); }
    return s + "]";
}

static std::string esc(const std::string& s) {
    std::string o = "\"";
    for (unsigned char c : s) {
        if (c == '"') o += "\\\"";
        else if (c == '\\') o += "\\\\";
        else if (c == '\n') o += "\\n";
        else if (c == '\r') o += "\\r";
        else if (c == '\t') o += "\\t";
        else if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\u%04x", c); o += b; }
        else o += (char)c;
    }
    return o + "\"";
}
}  // namespace sp_judge

int main(int argc, char** argv) {
    if (argc < 2) return 2;
    FILE* res = fopen(argv[1], "w");
    if (!res) return 2;
    int total = sp_judge::ni();
    for (int test = 0; test < total; test++) {
/*READS*/
        std::ostringstream captured;
        std::streambuf* original = std::cout.rdbuf(captured.rdbuf());
        std::string output, error;
        bool ok = true;
        auto start = std::chrono::steady_clock::now();
        try {
            Solution sol;
            /*RET*/ result = sol./*METHOD*/(/*ARGS*/);
            output = sp_judge::j(result);
        } catch (const std::exception& e) {
            ok = false;
            error = std::string("Exception: ") + e.what();
        } catch (...) {
            ok = false;
            error = "Exception thrown";
        }
        double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start).count();
        std::cout.flush();
        std::cout.rdbuf(original);
        std::string printed = captured.str();
        if (printed.size() > 2000) printed.resize(2000);
        fprintf(res, "{\"i\":%d,\"ms\":%.2f,\"stdout\":%s,", test, ms, sp_judge::esc(printed).c_str());
        if (ok) fprintf(res, "\"ok\":true,\"output\":%s}\n", output.c_str());
        else fprintf(res, "\"ok\":false,\"error\":%s}\n", sp_judge::esc(error).c_str());
        fflush(res);
    }
    fclose(res);
    return 0;
}
"""


def cpp_harness(method: str, signature: Dict[str, Any]) -> str:
    reads = "\n".join(
        f"        {_CPP_DECL[p['type']]} a{i} = {_CPP_READ[p['type']]};"
        for i, p in enumerate(signature["params"])
    )
    args = ", ".join(f"a{i}" for i in range(len(signature["params"])))
    return (_CPP_TEMPLATE.replace("/*READS*/", reads)
            .replace("/*RET*/", _CPP_RET[signature["returns"]])
            .replace("/*METHOD*/", method)
            .replace("/*ARGS*/", args))

# --------------------------------------------------------------------------- compile + run

def _clean_compiler_output(text: str, workdir: str, language: str, method: str) -> str:
    lines = []
    for line in text.replace("\r\n", "\n").split("\n"):
        if line.startswith("Picked up ") or line.startswith("In file included from"):
            continue
        line = line.replace(workdir + os.sep, "").replace(workdir, "")
        lines.append(line)
    cleaned = "\n".join(lines).strip()
    harness_file = "Main.java" if language == "java" else "main.cpp"
    hint = ""
    if harness_file in cleaned:
        hint = (f"\n\nHint: keep the class name Solution and the method {method}(...) with the same "
                f"parameter and return types as the starter code.")
        if language == "cpp" and ("redefinition of 'int main" in cleaned or "multiple definition of" in cleaned):
            hint = "\n\nHint: remove your main() function. The judge calls your Solution method directly."
    out_lines = cleaned.split("\n")
    if len(out_lines) > MAX_ERROR_LINES:
        out_lines = out_lines[:MAX_ERROR_LINES] + [f"... ({len(out_lines) - MAX_ERROR_LINES} more lines)"]
    return "\n".join(out_lines) + hint


def _crash_message(returncode: int, language: str) -> str:
    code = returncode & 0xFFFFFFFF if IS_WINDOWS else returncode
    known = {
        -11: "Segmentation fault: your code accessed invalid memory (for example an index out of range)",
        -6: "Program aborted (for example a failed assert)",
        -8: "Arithmetic error (for example division by zero)",
        -4: "Illegal instruction, usually caused by undefined behaviour such as division by zero",
        -7: "Bus error: your code accessed invalid memory",
        -9: "Program killed (memory limit exceeded)",
        0xC0000005: "Access violation: your code accessed invalid memory (for example an index out of range)",
        0xC00000FD: "Stack overflow: recursion is too deep",
        0xC0000094: "Arithmetic error: integer division by zero",
        0xC0000409: "Program aborted (stack buffer overrun or failed check)",
    }
    if code in known:
        return known[code]
    if language == "java":
        return "The Java program stopped unexpectedly"
    return f"Program crashed (exit code {returncode})"


def _cpp_run_command(exe: str, results: str) -> List[str]:
    if IS_WINDOWS:
        return [exe, results]
    # Apply memory and stack limits, then replace this Python process with the program
    limiter = (
        "import os, resource, sys\n"
        "def lim(kind, value):\n"
        "    try:\n"
        "        soft, hard = resource.getrlimit(kind)\n"
        "        if hard != resource.RLIM_INFINITY: value = min(value, hard)\n"
        "        resource.setrlimit(kind, (value, hard))\n"
        "    except (ValueError, OSError, AttributeError):\n"
        "        pass\n"
        f"lim(resource.RLIMIT_AS, {CPP_MEMORY_LIMIT_BYTES})\n"
        f"lim(resource.RLIMIT_STACK, {CPP_STACK_BYTES})\n"
        "os.execv(sys.argv[1], sys.argv[1:])\n"
    )
    return [sys.executable, "-I", "-c", limiter, exe, results]


def run_compiled(language: str, code: str, method: str, signature: Dict[str, Any],
                 inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compiles and runs a Java or C++ submission.
    Returns {"events": [...], "timed_out": bool, "crash": str|None, "program_output": str}
    with the same event format as sandbox_runner.py.
    """
    if not is_available(language):
        reason = next(l["reason"] for l in available_languages() if l["id"] == language)
        return {"events": [{"event": "compile_error", "error": reason}], "timed_out": False, "crash": None, "program_output": ""}

    blocked = check_code(language, code)
    if blocked:
        return {"events": [{"event": "compile_error", "error": blocked}], "timed_out": False, "crash": None, "program_output": ""}

    with tempfile.TemporaryDirectory(prefix="sp_judge_", ignore_cleanup_errors=True) as workdir:
        results_path = os.path.join(workdir, "results.jsonl")

        if language == "java":
            tools = _java_tools()
            with open(os.path.join(workdir, "Solution.java"), "w", encoding="utf-8") as f:
                f.write(code)
            with open(os.path.join(workdir, "Main.java"), "w", encoding="utf-8") as f:
                f.write(java_harness(method, signature))
            compile_cmd = [tools["javac"], "-encoding", "UTF-8", "-nowarn", "-d", workdir, "Main.java", "Solution.java"]
            run_cmd = [tools["java"], "-Xmx256m", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1",
                       "-Dfile.encoding=UTF-8", "-cp", workdir, "Main", results_path]
        else:
            tools = _cpp_tools()
            include_dir = os.path.join(workdir, "include", "bits")
            os.makedirs(include_dir)
            with open(os.path.join(include_dir, "stdc++.h"), "w", encoding="utf-8") as f:
                f.write(_CPP_STDCXX_SHIM)
            with open(os.path.join(workdir, "solution.cpp"), "w", encoding="utf-8") as f:
                f.write(code)
            with open(os.path.join(workdir, "main.cpp"), "w", encoding="utf-8") as f:
                f.write(cpp_harness(method, signature))
            exe = os.path.join(workdir, "solution.exe" if IS_WINDOWS else "solution")
            compile_cmd = [tools["cxx"], "-std=c++17", "-O2", "-w", "-I", os.path.join(workdir, "include"),
                           "-o", exe, "main.cpp"]
            if IS_WINDOWS:
                compile_cmd.append("-Wl,--stack,%d" % CPP_STACK_BYTES)
            run_cmd = _cpp_run_command(exe, results_path)

        # 1. Compile
        try:
            comp = subprocess.run(compile_cmd, cwd=workdir, capture_output=True, text=True,
                                  encoding="utf-8", errors="replace", timeout=COMPILE_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            return {"events": [{"event": "compile_error", "error": "Compilation took too long."}],
                    "timed_out": False, "crash": None, "program_output": ""}
        if comp.returncode != 0:
            message = _clean_compiler_output((comp.stderr or "") + (comp.stdout or ""), workdir, language, method)
            return {"events": [{"event": "compile_error", "error": message or "Compilation failed."}],
                    "timed_out": False, "crash": None, "program_output": ""}

        # 2. Run
        timed_out = False
        returncode = 0
        program_output = ""
        try:
            proc = subprocess.run(run_cmd, cwd=workdir, input=encode_inputs(signature, inputs).encode("ascii"),
                                  capture_output=True, timeout=RUN_TIMEOUT_SECONDS[language])
            returncode = proc.returncode
            program_output = proc.stdout.decode("utf-8", errors="replace")
        except subprocess.TimeoutExpired as exc:
            timed_out = True
            if exc.stdout:
                program_output = exc.stdout.decode("utf-8", errors="replace")

        # 3. Collect per-test results (written and flushed one by one)
        events: List[Dict[str, Any]] = [{"event": "compiled"}]
        if os.path.exists(results_path):
            with open(results_path, encoding="utf-8", errors="replace") as f:
                for line in f:
                    try:
                        r = json.loads(line)
                    except json.JSONDecodeError:
                        continue  # a line cut off by a crash or timeout
                    r["event"] = "result"
                    events.append(r)

        crash = None
        if not timed_out and returncode != 0:
            crash = _crash_message(returncode, language)
        return {"events": events, "timed_out": timed_out, "crash": crash,
                "program_output": program_output[:MAX_STDOUT_CHARS]}
