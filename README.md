# Life OS

A personal life management system that captures the chaos in your head and turns it into organized, actionable clarity.

**Capture anything → AI organizes it → System surfaces what matters**

---

## What It Does

- **Frictionless capture** — Voice or text from your phone, one tap
- **AI processing** — Automatically categorizes, extracts dates, identifies urgency
- **Smart routing** — Tasks, events, ideas, and reference items go to the right place
- **Calendar sync** — Time-bound items create Google Calendar events with smart reminders
- **Daily briefs** — Morning (what's today) and night (what's ahead) summaries delivered to your inbox

---

## Quick Start

### 1. Set Up Google Cloud

1. Create a project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable: Google Sheets API, Google Calendar API, Gmail API
3. Create a service account, download JSON key as `credentials.json`
4. Create OAuth credentials for Gmail, download as `oauth_credentials.json`

### 2. Set Up Claude API

1. Get API key from [Anthropic Console](https://console.anthropic.com)

### 3. Create Google Sheet

1. Create a new Google Sheet named "Life OS"
2. Create tabs: `Inbox`, `Tasks`, `Events`, `Ideas`, `Reference`
3. Share the sheet with your service account email
4. Copy the Sheet ID from the URL

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 5. Install Dependencies

```bash
pip install -r requirements.txt
```

### 6. Run

```bash
# Process inbox
python -m src.processor

# Generate morning brief
python -m src.brief_generator morning

# Generate night brief
python -m src.brief_generator night
```

### 7. Set Up Apple Shortcut

Create a shortcut that:
1. Takes voice/text input
2. Adds a row to your Google Sheet's Inbox tab

---

## Project Structure

```
life-os/
├── src/                    # Application code
├── config/                 # Categories and prompts
├── docs/                   # Detailed documentation
├── tests/                  # Test suite
├── .github/workflows/      # Automation schedules
├── SKILL.md               # Claude Code context
└── README.md              # This file
```

---

## Documentation

- **[PRD.md](docs/PRD.md)** — Product requirements, features, user context
- **[TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md)** — Architecture, APIs, data models
- **[AI_PROMPT_SPEC.md](docs/AI_PROMPT_SPEC.md)** — AI processing logic and examples
- **[DAILY_BRIEF_TEMPLATE.md](docs/DAILY_BRIEF_TEMPLATE.md)** — Brief formats

---

## Building with Claude Code

This project is designed to be built with Claude Code. Open the folder and say:

> "Read the docs and build the MVP. Start with the processor and sheets client."

The `SKILL.md` file gives Claude Code context about the project, your preferences, and how things connect.

---

## Categories

| Category | For |
|----------|-----|
| Car | Registration, service, parking |
| Personal | Social, self-care, hobbies |
| Family | Parents, Anjali, Dobby, relatives |
| Finance | Bills, subscriptions, payments |
| Health | Doctor, fitness, medications |
| Home | Apartment, utilities, repairs |
| Work | Job tasks and meetings |
| Recruiting | Job search, interviews |
| Travel | Trips, flights, itineraries |
| Ideas | Recommendations, someday/maybe |
| Reference | Pointers to info stored elsewhere |

---

## License

Personal project. Do what you want with it.
