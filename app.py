"""
Security Awareness Trainer — Phase 1 prototype.

Local-only prototype: no LDAP, no Postgres. Question bank is a static JSON
file (data/questions.json). Scoring/progress lives entirely in the Flask
session, so it persists across page refreshes but clears on logout/reset,
matching the design agreed on with the user.

Phase 2 will add LDAP auth in front of this.
Phase 3 will replace the JSON file with a Postgres-backed question bank
generated via the Anthropic API.
"""

import json
import os
import random
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for

import auth

load_dotenv()  # reads .env if present; falls back to real environment variables otherwise

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-only-secret-change-me")

DATA_PATH = Path(__file__).parent / "data" / "questions.json"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    BANK = json.load(f)

CATEGORIES = {c["id"]: c["name"] for c in BANK["categories"]}
QUESTIONS_BY_CATEGORY = {}
for q in BANK["questions"]:
    QUESTIONS_BY_CATEGORY.setdefault(q["category"], []).append(q)

QUESTIONS_BY_ID = {q["id"]: q for q in BANK["questions"]}

TOTAL_QUESTIONS = len(BANK["questions"])


def get_state():
    """Session-backed game state: which questions have been answered,
    and running correct/incorrect tallies, both per-category and overall."""
    if "answered_ids" not in session:
        session["answered_ids"] = []
    if "correct_count" not in session:
        session["correct_count"] = 0
    if "category_stats" not in session:
        session["category_stats"] = {cid: {"correct": 0, "total": 0} for cid in CATEGORIES}
    return session


def login_required(view_func):
    """Redirect to /login (for page routes) or return 401 JSON (for API
    routes) if there's no authenticated user in the session."""
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if "username" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Not authenticated"}), 401
            return redirect(url_for("login"))
        return view_func(*args, **kwargs)
    return wrapped


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("login.html", error=None)

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")

    success, error = auth.authenticate(username, password)
    if not success:
        return render_template("login.html", error=error)

    # Authenticated. Store just the username; no password is ever kept.
    session["username"] = username
    return redirect(url_for("index"))


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/")
@login_required
def index():
    return render_template("index.html", username=session.get("username"))


@app.route("/api/categories")
@login_required
def api_categories():
    state = get_state()
    stats = state["category_stats"]
    result = []
    for cid, name in CATEGORIES.items():
        total_in_cat = len(QUESTIONS_BY_CATEGORY.get(cid, []))
        answered_in_cat = stats.get(cid, {}).get("total", 0)
        correct_in_cat = stats.get(cid, {}).get("correct", 0)
        result.append({
            "id": cid,
            "name": name,
            "total_questions": total_in_cat,
            "answered": answered_in_cat,
            "correct": correct_in_cat,
            "complete": answered_in_cat >= total_in_cat,
        })

    answered_ids = state["answered_ids"]
    overall_progress = {
        "answered": len(answered_ids),
        "total": TOTAL_QUESTIONS,
        "correct": state["correct_count"],
        "percent": round((len(answered_ids) / TOTAL_QUESTIONS) * 100) if TOTAL_QUESTIONS else 0,
    }

    return jsonify({"categories": result, "overall": overall_progress})


@app.route("/api/question/<category_id>")
@login_required
def api_question(category_id):
    if category_id not in CATEGORIES:
        return jsonify({"error": "Unknown category"}), 404

    state = get_state()
    answered_ids = set(state["answered_ids"])

    pool = [q for q in QUESTIONS_BY_CATEGORY.get(category_id, []) if q["id"] not in answered_ids]

    if not pool:
        return jsonify({"done": True, "category": category_id, "name": CATEGORIES[category_id]})

    question = random.choice(pool)

    # Never send the correct_index or explanation to the client before they answer.
    return jsonify({
        "done": False,
        "id": question["id"],
        "category": category_id,
        "prompt": question["prompt"],
        "options": question["options"],
    })


@app.route("/api/answer", methods=["POST"])
@login_required
def api_answer():
    payload = request.get_json(force=True)
    question_id = payload.get("question_id")
    selected_index = payload.get("selected_index")

    question = QUESTIONS_BY_ID.get(question_id)
    if question is None:
        return jsonify({"error": "Unknown question"}), 404

    state = get_state()
    answered_ids = state["answered_ids"]

    if question_id in answered_ids:
        return jsonify({"error": "Question already answered this session"}), 400

    is_correct = selected_index == question["correct_index"]

    answered_ids.append(question_id)
    session["answered_ids"] = answered_ids

    if is_correct:
        session["correct_count"] = state["correct_count"] + 1

    stats = state["category_stats"]
    cat_id = question["category"]
    stats.setdefault(cat_id, {"correct": 0, "total": 0})
    stats[cat_id]["total"] += 1
    if is_correct:
        stats[cat_id]["correct"] += 1
    session["category_stats"] = stats
    session.modified = True

    return jsonify({
        "correct": is_correct,
        "correct_index": question["correct_index"],
        "explanation": question["explanation"],
        "overall": {
            "answered": len(answered_ids),
            "total": TOTAL_QUESTIONS,
            "correct": session["correct_count"],
            "percent": round((len(answered_ids) / TOTAL_QUESTIONS) * 100) if TOTAL_QUESTIONS else 0,
        },
    })


@app.route("/api/reset", methods=["POST"])
@login_required
def api_reset():
    # Reset clears game progress but keeps the user logged in — only
    # /logout ends the session entirely, per the agreed design.
    username = session.get("username")
    session.clear()
    session["username"] = username
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
