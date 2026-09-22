CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id),
    prompt TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
    explanation TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id);
