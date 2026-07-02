"""
Vercel Python serverless function.
Runs real dbt-duckdb commands in a temporary project directory.

POST /api/dbt
Body: {
  "command": "run" | "test" | "compile" | "seed",
  "models": [{ "name", "folder", "sql", "materialization" }],
  "seeds":  { "orders": "<csv>", "users": "<csv>", "products": "<csv>" },
  "tests":  [{ "model", "column", "type", "values"? }],
  "select": "stg_orders"  // optional
}
Response: { "output": "<terminal text>", "returncode": 0 }
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import subprocess
import shutil
import uuid
import urllib.request
from collections import defaultdict


def _verify_supabase_token(auth_header: str) -> bool:
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    supabase_anon_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if not supabase_url or not supabase_anon_key or not auth_header.startswith("Bearer "):
        return False
    try:
        req = urllib.request.Request(
            f"{supabase_url}/auth/v1/user",
            headers={"Authorization": auth_header, "apikey": supabase_anon_key},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception:
        return False


# ─── Project file builders ────────────────────────────────────────────────────

def _write_dbt_project(project_dir: str, db_path: str) -> None:
    with open(os.path.join(project_dir, "dbt_project.yml"), "w") as f:
        f.write(
            "name: shopnow_analytics\n"
            "version: '1.0.0'\n"
            "config-version: 2\n"
            "profile: shopnow\n"
            "model-paths: [\"models\"]\n"
            "seed-paths: [\"seeds\"]\n"
            "models:\n"
            "  shopnow_analytics:\n"
            "    staging:\n"
            "      +materialized: table\n"
            "    warehouse:\n"
            "      +materialized: table\n"
            "    mart:\n"
            "      +materialized: table\n"
        )


def _write_profiles(project_dir: str, db_path: str) -> None:
    with open(os.path.join(project_dir, "profiles.yml"), "w") as f:
        f.write(
            "shopnow:\n"
            "  target: dev\n"
            "  outputs:\n"
            "    dev:\n"
            "      type: duckdb\n"
            f"      path: '{db_path}'\n"
            "      threads: 1\n"
        )


def _write_schema(project_dir: str, models: list, tests: list) -> None:
    # Group tests by (model, column)
    col_tests: dict = defaultdict(lambda: defaultdict(list))
    for t in tests:
        m = t["model"]
        c = t["column"]
        kind = t["type"]
        if kind == "accepted_values":
            vals = t.get("values", [])
            entry = {"accepted_values": {"values": vals}}
            col_tests[m][c].append(entry)
        else:
            col_tests[m][c].append(kind)

    lines = [
        "version: 2",
        "",
        "sources:",
        "  - name: raw",
        "    schema: main",          # DuckDB default schema where seeds land
        "    tables:",
        "      - name: orders",
        "      - name: users",
        "      - name: products",
        "",
        "models:",
    ]

    for model in models:
        lines.append(f"  - name: {model['name']}")
        model_cols = col_tests.get(model["name"], {})
        if model_cols:
            lines.append("    columns:")
            for col, ctests in model_cols.items():
                lines.append(f"      - name: {col}")
                lines.append("        tests:")
                for ct in ctests:
                    if isinstance(ct, dict):
                        # accepted_values
                        av = ct["accepted_values"]
                        lines.append("          - accepted_values:")
                        lines.append("              values:")
                        for v in av["values"]:
                            lines.append(f"                - '{v}'")
                    else:
                        lines.append(f"          - {ct}")

    with open(os.path.join(project_dir, "models", "schema.yml"), "w") as f:
        f.write("\n".join(lines) + "\n")


def write_project_files(project_dir: str, body: dict) -> str:
    models = body.get("models", [])
    seeds = body.get("seeds", {})
    tests = body.get("tests", [])

    db_path = os.path.join(project_dir, "db.duckdb")

    _write_dbt_project(project_dir, db_path)
    _write_profiles(project_dir, db_path)
    _write_schema(project_dir, models, tests)

    # Seeds
    for name, csv in seeds.items():
        with open(os.path.join(project_dir, "seeds", f"{name}.csv"), "w") as f:
            f.write(csv)

    # Models
    for model in models:
        folder = model["folder"]
        name = model["name"]
        sql = model["sql"]
        path = os.path.join(project_dir, "models", folder, f"{name}.sql")
        with open(path, "w") as f:
            f.write(sql)

    return db_path


# ─── HTTP Handler ─────────────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_POST(self):
        auth_header = self.headers.get("Authorization", "")
        if not _verify_supabase_token(auth_header):
            self._json_error(401, "Unauthorized")
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
        except Exception as e:
            self._json_error(400, f"Invalid request body: {e}")
            return

        command = body.get("command", "run")      # run | test | compile | seed
        select = body.get("select")               # optional --select
        seeds = body.get("seeds", {})

        project_id = uuid.uuid4().hex[:8]
        project_dir = f"/tmp/dbt_{project_id}"

        try:
            # Build directory tree
            for folder in ("staging", "warehouse", "mart"):
                os.makedirs(os.path.join(project_dir, "models", folder), exist_ok=True)
            os.makedirs(os.path.join(project_dir, "seeds"), exist_ok=True)

            write_project_files(project_dir, body)

            env = {**os.environ, "DBT_PROFILES_DIR": project_dir, "NO_COLOR": "1"}
            base_args = [
                "--project-dir", project_dir,
                "--profiles-dir", project_dir,
                "--no-use-colors",
            ]

            outputs: list[str] = []

            # Always seed first when running or testing
            if seeds and command in ("run", "test"):
                res = subprocess.run(
                    ["dbt", "seed"] + base_args,
                    capture_output=True, text=True, timeout=60, env=env,
                )
                outputs.append(res.stdout.strip())
                if res.returncode != 0 and res.stderr:
                    outputs.append(res.stderr.strip())
                outputs.append("")  # blank separator

            # Main command
            cmd = ["dbt", command] + base_args
            if select and command in ("run", "test", "compile"):
                cmd += ["--select", select]

            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120, env=env)
            outputs.append(res.stdout.strip())
            if res.stderr:
                outputs.append(res.stderr.strip())

            output = "\n".join(filter(None, outputs))
            self._json_ok({"output": output, "returncode": res.returncode})

        except subprocess.TimeoutExpired:
            self._json_error(504, "dbt command timed out (>120s)")
        except FileNotFoundError:
            self._json_error(500, "dbt not found — check requirements.txt installation")
        except Exception as e:
            self._json_error(500, str(e))
        finally:
            shutil.rmtree(project_dir, ignore_errors=True)

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json_ok(self, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _json_error(self, status: int, message: str):
        body = json.dumps({"error": message, "output": f"Error: {message}", "returncode": 1}).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass  # suppress default request logs
