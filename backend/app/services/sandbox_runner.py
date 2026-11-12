"""
Sandbox runner for student code. Executed as a SEPARATE PROCESS by coding_engine.py,
never imported by the server.

Protocol:
  stdin : one JSON object {"code": str, "function_name": str, "inputs": [ {kwargs}, ... ]}
  stdout: one JSON line per event:
            {"event": "compiled"}                         code loaded, function found
            {"event": "compile_error", "error": str}      syntax/import error, or function missing
            {"event": "result", "i": k, "ok": true,  "output": ..., "stdout": str, "ms": float}
            {"event": "result", "i": k, "ok": false, "error": str, "stdout": str, "ms": float}

The parent process enforces the time limit by killing this process, so an
infinite loop can never hang the server. Tests that never report back are
marked "Time Limit Exceeded".

Safety measures (a guard rail for a college project, not a hardened jail):
  - separate process with a wall-clock timeout (parent side)
  - memory cap on Linux/macOS via resource.setrlimit
  - only whitelisted standard-library modules can be imported
  - open(), input(), exec(), eval(), compile(), breakpoint() are removed
For a production deployment, run submissions in a container or a judge
service such as Judge0 instead.
"""
import builtins
import io
import json
import sys
import time
import traceback

MEMORY_LIMIT_BYTES = 512 * 1024 * 1024
MAX_STDOUT_CHARS = 2000

ALLOWED_MODULES = {
    "collections", "heapq", "math", "bisect", "itertools", "functools",
    "typing", "string", "re", "copy", "operator", "random", "array",
    "dataclasses", "fractions", "decimal", "statistics", "__future__",
}

BLOCKED_BUILTINS = {"open", "input", "exec", "eval", "compile", "breakpoint", "exit", "quit", "help"}


def _limit_memory():
    try:
        import resource  # not available on Windows
        resource.setrlimit(resource.RLIMIT_AS, (MEMORY_LIMIT_BYTES, MEMORY_LIMIT_BYTES))
    except Exception:
        pass


def _guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
    root = name.split(".")[0]
    if level != 0 or root not in ALLOWED_MODULES:
        raise ImportError(f"Importing '{name}' is not allowed in the practice sandbox.")
    return __import__(name, globals, locals, fromlist, level)


def _safe_builtins():
    safe = {k: v for k, v in builtins.__dict__.items() if k not in BLOCKED_BUILTINS}
    safe["__import__"] = _guarded_import
    return safe


def _to_jsonable(value):
    try:
        json.dumps(value)
        return value
    except (TypeError, ValueError):
        if isinstance(value, (set, frozenset, tuple)):
            return [_to_jsonable(v) for v in value]
        return repr(value)


def _short_error(exc):
    """Last frame of the traceback that belongs to the student's code, plus the message."""
    tb = traceback.extract_tb(exc.__traceback__)
    user_frames = [f for f in tb if f.filename == "<solution>"]
    where = f" (line {user_frames[-1].lineno})" if user_frames else ""
    return f"{type(exc).__name__}: {exc}{where}"


def main():
    real_stdout = sys.stdout

    def emit(obj):
        real_stdout.write(json.dumps(obj) + "\n")
        real_stdout.flush()

    payload = json.loads(sys.stdin.read())
    # Pre-import the whitelisted modules so their own internal imports
    # happen before the guard is active.
    for mod in ALLOWED_MODULES:
        try:
            __import__(mod)
        except ImportError:
            pass
    _limit_memory()
    sys.setrecursionlimit(20000)

    namespace = {"__builtins__": _safe_builtins(), "__name__": "solution"}
    captured = io.StringIO()
    sys.stdout = captured
    try:
        exec(compile(payload["code"], "<solution>", "exec"), namespace)
    except SyntaxError as exc:
        sys.stdout = real_stdout
        emit({"event": "compile_error", "error": f"SyntaxError: {exc.msg} (line {exc.lineno})"})
        return
    except BaseException as exc:
        sys.stdout = real_stdout
        emit({"event": "compile_error", "error": _short_error(exc)})
        return
    sys.stdout = real_stdout

    func = namespace.get(payload["function_name"])
    if not callable(func):
        emit({"event": "compile_error",
              "error": f"Function '{payload['function_name']}' was not found. Keep the function name from the starter code."})
        return
    emit({"event": "compiled"})

    for i, kwargs in enumerate(payload["inputs"]):
        captured = io.StringIO()
        sys.stdout = captured
        start = time.perf_counter()
        try:
            output = func(**kwargs)
            ms = (time.perf_counter() - start) * 1000
            sys.stdout = real_stdout
            emit({"event": "result", "i": i, "ok": True, "output": _to_jsonable(output),
                  "stdout": captured.getvalue()[:MAX_STDOUT_CHARS], "ms": round(ms, 2)})
        except RecursionError:
            sys.stdout = real_stdout
            emit({"event": "result", "i": i, "ok": False, "error": "RecursionError: maximum recursion depth exceeded",
                  "stdout": captured.getvalue()[:MAX_STDOUT_CHARS], "ms": round((time.perf_counter() - start) * 1000, 2)})
        except MemoryError:
            sys.stdout = real_stdout
            emit({"event": "result", "i": i, "ok": False, "error": "MemoryError: memory limit exceeded",
                  "stdout": "", "ms": round((time.perf_counter() - start) * 1000, 2)})
        except BaseException as exc:
            sys.stdout = real_stdout
            emit({"event": "result", "i": i, "ok": False, "error": _short_error(exc),
                  "stdout": captured.getvalue()[:MAX_STDOUT_CHARS], "ms": round((time.perf_counter() - start) * 1000, 2)})


if __name__ == "__main__":
    main()
