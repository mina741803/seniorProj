# Security Awareness Trainer

An interactive, branching-scenario web app that trains employees to recognize social engineering attacks — phishing, vishing, smishing, pretexting, tailgating, business email compromise, USB/media baiting, AI voice/deepfake scams, physical security lapses, and MFA fatigue attacks.

Built as a senior capstone project demonstrating: Active Directory integration, LDAP authentication, CI/CD automation, and secure application deployment.

## How it works

- Users log in with their real Active Directory credentials (LDAP/LDAPS bind against a Windows Server 2025 domain controller)
- They pick a category and answer realistic, modern multiple-choice scenarios (4 options each, exactly one correct answer)
- Every answer is graded right/wrong (no partial credit) with an explanation shown either way
- Score and progress persist across categories and page refreshes, and reset only on the Reset button or logout
- 100 questions total, 10 per category, hand-written to reflect current, real-world attack patterns

## Architecture

```
┌─────────────────┐         LDAPS (636)        ┌──────────────────────┐
│  Windows Server  │◄───────────────────────────┤   Ubuntu Server       │
│  2025 (AD DC)     │                            │   - Flask app         │
│  training.local   │                            │   - gunicorn          │
└─────────────────┘                            │   - systemd service    │
                                                 └──────────┬───────────┘
                                                            │
                                                   git push │ auto-deploy
                                                            ▼
                                                 ┌──────────────────────┐
                                                 │  GitHub repo          │
                                                 │  + self-hosted        │
                                                 │    Actions runner     │
                                                 └──────────────────────┘
```

## Tech stack

- **Backend:** Python, Flask, gunicorn
- **Auth:** `ldap3` — binds against Active Directory over LDAPS (port 636)
- **Frontend:** vanilla HTML/CSS/JS (no framework)
- **Data:** static curated JSON question bank (`data/questions.json`)
- **Deployment:** systemd service + self-hosted GitHub Actions runner (auto pull + restart on every push to `main`)
- **Secrets:** `.env` file (git-ignored), never committed

## Project structure

```
seniorProj/
├── app.py                  # Flask routes: login, categories, questions, answers, reset
├── auth.py                 # LDAP/LDAPS authentication logic
├── data/questions.json     # 100 questions, 10 categories
├── templates/
│   ├── login.html
│   └── index.html
├── static/
│   ├── css/style.css
│   └── js/game.js
├── requirements.txt
├── .env.example             # documents required environment variables
└── .github/workflows/
    └── deploy.yml            # CI/CD: pull latest + restart service on push
```

## Local setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in real values
python3 app.py
```

Required environment variables (see `.env.example`):

| Variable | Purpose |
|---|---|
| `FLASK_SECRET_KEY` | Signs session cookies |
| `LDAP_HOST` | Domain controller IP |
| `LDAP_PORT` | 636 (LDAPS) |
| `LDAP_DOMAIN` | AD domain name |

## Deployment

Runs as a systemd service (`trainer-app.service`) under a dedicated, unprivileged `runner-svc` user — not root. A self-hosted GitHub Actions runner watches the `main` branch; every push triggers:

1. Checkout latest code
2. Sync it into the live app directory (via `rsync`, excluding `venv/` and `.env`)
3. Reinstall dependencies
4. Restart the service (`sudo systemctl restart trainer-app`, permitted via a narrowly-scoped `sudoers` rule for that one command only)

## Security notes

- Passwords are never stored — only the username is kept in the session after a successful LDAP bind
- The correct answer and explanation are never sent to the client until after an answer is submitted
- The Actions runner and app both run as a non-root service account with minimal, explicitly-granted `sudo` permissions
- UFW firewall allows only SSH (22) and the app port (5000) inbound
