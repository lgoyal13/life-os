# Life OS — Project Context

## About Aditya (Project Owner)

**Background:** Strategy & Operations professional who builds AI-powered tools as side projects. Economics degree, not a software engineer by training — a strategist who developed technical capabilities through project-based learning and AI-assisted development ("vibe coding").

**Technical Level:** Intermediate vibe-coder. Strong intuition and project vision, relies on AI for implementation details.

**Strengths:** Project vision, workflow design, prompt engineering, business context

**Gaps:** Deep implementation details, debugging complex issues, architectural best practices

### How Aditya Works With AI

- Plans prompts carefully; provides comprehensive context upfront
- Asks "is it possible to do X?" and lets AI assess feasibility
- Approves plans before AI executes
- Wants to be taught what's happening, not just given code
- Strong at chaining workflows and explaining desired outcomes

### Communication Preferences

- **Present options with trade-offs** — not just one solution
- **Explain technical decisions** — don't just write code
- **Check in before big changes** — get approval on architecture choices
- **Be direct about limitations** — if something won't work, say so
- **Use video game analogies** — helpful for explaining complex concepts

---

## Project Overview

Life OS is a personal life management system that captures freeform voice/text input, uses AI to extract structure, routes items to the right places, syncs with Google Calendar, and generates daily briefs.

**Core philosophy:** Capture with zero friction, AI does the organizing, system surfaces what matters when it matters.

### Architecture

```
Phone (Apple Shortcut) → Google Sheet (Inbox) → Python Processor (Claude API)
    → Google Sheet (Tasks/Events/Ideas/Reference) + Google Calendar
    → Daily Briefs (Email)
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Language | Python 3.11+ |
| AI | Claude API (claude-sonnet-4-20250514) |
| Storage | Google Sheets |
| Calendar | Google Calendar API |
| Email | Gmail API |
| Data Validation | Pydantic |
| Automation | GitHub Actions |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/processor.py` | Main orchestration — reads inbox, calls AI, routes items |
| `src/ai_client.py` | Claude API wrapper for extraction |
| `src/sheets_client.py` | Google Sheets CRUD operations |
| `src/calendar_client.py` | Google Calendar create/edit/delete |
| `src/brief_generator.py` | Morning and night brief creation |
| `src/models.py` | Pydantic models for data validation |
| `config/prompts/processor_prompt.txt` | The AI extraction prompt |
| `docs/PRD.md` | Product requirements and feature specs |
| `docs/TECHNICAL_SPEC.md` | Architecture and implementation details |
| `docs/AI_PROMPT_SPEC.md` | Full prompt documentation with examples |

---

## Principles

1. **Simplicity over features** — MVP first, add complexity only when needed
2. **Friction kills adoption** — If it's not easy, it won't get used
3. **AI does the work** — User captures, system organizes
4. **Consequences create urgency** — Surface what happens if things slip
5. **Pointers, not secrets** — Never store sensitive data directly

---

## Quick Reference

### Category System

**Top-level:** Car, Personal, Family, Finance, Health, Home, Work, Recruiting, Travel, Ideas, Reference

**Ideas subcategories:** Books, Movies, TV, Restaurants, Articles, Gifts, Products, Places, Activities, Random

**People tags:** Dad, Mom, Anjali (girlfriend), Dobby (dog) — extracted automatically

### Running the System

```bash
# Process inbox
python -m src.processor

# Generate briefs
python -m src.brief_generator morning
python -m src.brief_generator night

# Run tests
pytest tests/
```

---

*For task-specific guidance (adding categories, debugging, etc.), see `.claude/skills/life-os/SKILL.md`*
*For full background on Aditya's projects and environment, see `.claude/skills/life-os/aditya-context.md`*
