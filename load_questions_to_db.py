"""
One-time (or re-runnable) script: loads data/questions.json into Postgres.

Usage:
    python3 load_questions_to_db.py

Reads DATABASE_URL from the environment (.env), same as the app itself.
Safe to re-run: uses upserts, so re-running after editing questions.json
just updates existing rows rather than duplicating them.
"""

import json
import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("DATABASE_URL is not set. Add it to your .env file first.")

DATA_PATH = Path(__file__).parent / "data" / "questions.json"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    bank = json.load(f)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

with open(Path(__file__).parent / "schema.sql", "r", encoding="utf-8") as f:
    cur.execute(f.read())

for cat in bank["categories"]:
    cur.execute(
        """
        INSERT INTO categories (id, name) VALUES (%s, %s)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        """,
        (cat["id"], cat["name"]),
    )

for q in bank["questions"]:
    options = q["options"]
    cur.execute(
        """
        INSERT INTO questions (id, category_id, prompt, option_a, option_b, option_c, option_d, correct_index, explanation)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            category_id = EXCLUDED.category_id,
            prompt = EXCLUDED.prompt,
            option_a = EXCLUDED.option_a,
            option_b = EXCLUDED.option_b,
            option_c = EXCLUDED.option_c,
            option_d = EXCLUDED.option_d,
            correct_index = EXCLUDED.correct_index,
            explanation = EXCLUDED.explanation
        """,
        (q["id"], q["category"], q["prompt"], options[0], options[1], options[2], options[3],
         q["correct_index"], q["explanation"]),
    )

conn.commit()

cur.execute("SELECT COUNT(*) FROM categories")
cat_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM questions")
q_count = cur.fetchone()[0]

cur.close()
conn.close()

print(f"Loaded {cat_count} categories and {q_count} questions into Postgres.")
