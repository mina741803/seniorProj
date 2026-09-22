# Security Awareness Trainer

An interactive, scenario-based web app that trains employees to recognize social engineering attacks: phishing, vishing, smishing, pretexting, tailgating, business email compromise, USB/media baiting, AI voice/deepfake scams, physical security lapses, and MFA fatigue attacks.

Built as a senior capstone project demonstrating Active Directory integration, LDAP authentication, a database-backed application, CI/CD automation, and secure deployment practices.

## How it works

- Users sign in with their real Active Directory credentials (LDAPS bind against a Windows Server 2025 domain controller)
- They pick a category and answer realistic, modern multiple-choice scenarios (4 options each, exactly one correct answer)
- Every answer is graded right/wrong (no partial credit), with an explanation shown either way
- Score and progress persist across categories and page refreshes, and reset only on the Reset button or logout
- 100 questions total, 10 per category, stored in PostgreSQL

## Architecture

```
┌──────────────────┐        LDAPS (636)        ┌───────────────────────┐
│  Windows Server  │◄──────────────────────────┤  Ubuntu Server        │
│  2025 (AD DC)    │                           │  - Flask app          │
│  training.local  │                           │  - gunicorn           │
└──────────────────┘                           │  - systemd service    │
                                               │  - PostgreSQL         │
                                               └──────────┬────────────┘
                                                          │
                                                 git push │ auto-deploy
                                                          ▼
                                               ┌───────────────────────┐
                                               │  GitHub repo          │
                                               │  + self-hosted        │
                                               │    Actions runner     │
                                               └───────────────────────┘
```

## Tech stack

- **Backend:** Python, Flask, gunicorn
- **Auth:** `ldap3`, binding against Active Directory over LDAPS (port 636)
- **Database:** PostgreSQL via `psycopg2` (all queries parameterized)
- **Frontend:** vanilla HTML/CSS/JS (no framework), inline SVG category icons
- **Deployment:** systemd service + self-hosted GitHub Actions runner
- **Secrets:** `.env` file (git-ignored), never committed

## Project structure

```
seniorProj/
├── app.py                    # Flask routes: login, categories, questions, answers, reset
├── auth.py                   # LDAPS authentication against Active Directory
├── db.py                     # PostgreSQL queries
├── schema.sql                # Table definitions (categories, questions)
├── load_questions_to_db.py   # Loads data/questions.json into PostgreSQL (re-runnable)
├── data/questions.json       # Source of truth for the question bank
├── templates/
│   ├── login.html
│   └── index.html
├── static/
│   ├── css/style.css
│   └── js/game.js
├── requirements.txt
├── .env.example              # Documents required environment variables
└── .github/workflows/
    └── deploy.yml            # CI/CD: sync code + restart service on push to main
```

## Configuration

Copy `.env.example` to `.env` and fill in real values. Required variables:

| Variable | Purpose |
|---|---|
| `FLASK_SECRET_KEY` | Signs session cookies (generate with `python3 -c "import secrets; print(secrets.token_hex(32))"`) |
| `LDAP_HOST` | Domain controller address |
| `LDAP_PORT` | 636 (LDAPS) |
| `LDAP_DOMAIN` | AD domain name |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://USER:PASSWORD@localhost:5432/trainer_db` |

Avoid `#`, `@`, `/`, and spaces in the database password, since they break connection-string parsing unless URL-encoded.

## Local setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then fill in real values
python3 load_questions_to_db.py # creates tables and loads the question bank
python3 app.py                  # development server only (debug mode), never on a shared network
```

In production the app runs under gunicorn via systemd, never through `python3 app.py`.

## Updating the question bank

Questions live in `data/questions.json`, but the app reads them from PostgreSQL. After editing the JSON and pushing it, load the changes on the server:

```bash
cd /home/runner-svc/seniorProj
sudo -u runner-svc venv/bin/python load_questions_to_db.py
```

The loader uses upserts, so re-running it updates existing questions rather than duplicating them. If you add or remove a **category**, also restart the service (`sudo systemctl restart trainer-app`), because categories are cached at startup.

## Deployment

The app runs as a systemd service (`trainer-app.service`) under a dedicated, unprivileged `runner-svc` user, not root. A self-hosted GitHub Actions runner watches the `main` branch; every push triggers:

1. Checkout of the latest code
2. Sync into the live app directory (`rsync`, excluding `.git/`, `venv/`, and `.env`)
3. Reinstall of dependencies
4. Service restart (`sudo systemctl restart trainer-app`, permitted via a narrowly scoped `sudoers` rule for that one command only)

## Security notes

- Passwords are never stored; only the username is kept in the session after a successful LDAP bind
- The correct answer and explanation are never sent to the client until after an answer is submitted
- All database queries are parameterized
- Secrets live only in `.env` on the server and are excluded from Git and from the deploy sync
- The Actions runner and the app both run as a non-root service account with a single, explicitly granted `sudo` command
- UFW firewall allows only SSH (22) and the app port (5000) inbound

### Lab-environment limitations

These are accepted trade-offs for the isolated lab network and should be addressed before any real-world deployment:

- The web app is served over plain HTTP, so login credentials are unencrypted between the browser and the server. Production would put the app behind HTTPS (e.g. nginx with a TLS certificate).
- The LDAPS connection does not verify the domain controller's certificate (lab uses a self-signed/internal-CA certificate). Production would trust the internal CA and enable verification.
