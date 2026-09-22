"""
Postgres access layer for the question bank.

Kept separate from app.py, same reasoning as auth.py: isolates the one
thing that can fail for reasons unrelated to Flask (a DB connection issue)
and makes it independently testable.
"""

import os

import psycopg2
import psycopg2.extras


def get_conn():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set. Check your .env file.")
    return psycopg2.connect(database_url)


def get_categories():
    """Returns [{id, name}, ...] ordered by id, for consistent display order."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id, name FROM categories ORDER BY id")
            return cur.fetchall()


def get_question_counts_by_category():
    """Returns {category_id: total_question_count}."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT category_id, COUNT(*) FROM questions GROUP BY category_id")
            return {row[0]: row[1] for row in cur.fetchall()}


def get_total_question_count():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM questions")
            return cur.fetchone()[0]


def get_random_unanswered_question(category_id, excluded_ids):
    """Returns one random question dict from this category, excluding any
    id in excluded_ids. Returns None if none remain."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, category_id, prompt, option_a, option_b, option_c, option_d
                FROM questions
                WHERE category_id = %s AND id != ALL(%s)
                ORDER BY RANDOM()
                LIMIT 1
                """,
                (category_id, list(excluded_ids) if excluded_ids else [""]),
            )
            return cur.fetchone()


def get_question_by_id(question_id):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, category_id, prompt, option_a, option_b, option_c, option_d,
                       correct_index, explanation
                FROM questions WHERE id = %s
                """,
                (question_id,),
            )
            return cur.fetchone()


def category_exists(category_id):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM categories WHERE id = %s", (category_id,))
            return cur.fetchone() is not None
