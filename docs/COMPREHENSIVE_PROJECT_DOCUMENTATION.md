# Life OS — Comprehensive Project Documentation

> **Last Updated:** January 2026
> **Author:** Aditya Goyal (built with Claude Code)
> **Status:** MVP Complete — In Active Use

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem Being Solved](#2-the-problem-being-solved)
3. [System Architecture](#3-system-architecture)
4. [Technical Implementation](#4-technical-implementation)
5. [AI Processing Engine](#5-ai-processing-engine)
6. [Data Models](#6-data-models)
7. [Google Sheets Integration](#7-google-sheets-integration)
8. [Google Calendar Integration](#8-google-calendar-integration)
9. [Daily Briefs System](#9-daily-briefs-system)
10. [Phone Capture System](#10-phone-capture-system)
11. [Configuration & Environment](#11-configuration--environment)
12. [File-by-File Breakdown](#12-file-by-file-breakdown)
13. [What's Built vs. What's Planned](#13-whats-built-vs-whats-planned)
14. [How Everything Connects](#14-how-everything-connects)
15. [Key Design Decisions](#15-key-design-decisions)

---

## 1. Executive Summary

### What Is Life OS?

Life OS is a personal life management system designed for Aditya Goyal. It captures freeform voice/text input from a phone, uses AI to extract structure and meaning, routes items to organized storage, syncs with Google Calendar, and delivers daily summaries via email.

### The Core Philosophy

> **Capture with zero friction. AI does the organizing. System surfaces what matters when it matters.**

### Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Capture | Apple Shortcuts → Google Cloud Function |
| AI Processing | Google Gemini 3 Flash |
| Storage | Google Sheets |
| Calendar | Google Calendar API |
| Email | Gmail SMTP |
| Automation | GitHub Actions (planned) |
| Language | Python 3.11+ |
| Data Validation | Pydantic v2 |

### What's Working Today

- Phone capture via Cloud Function + Apple Shortcut
- AI extraction of structured data from messy input
- Automatic routing to Tasks/Events/Ideas/Reference tabs
- Google Calendar event creation with smart reminders
- Morning and night brief generation
- Email delivery of briefs

---

## 2. The Problem Being Solved

### The User: Aditya

Aditya is a Strategy & Operations professional who builds AI tools as side projects. He's not a software engineer by training—he's a strategist who learned to code through AI-assisted development ("vibe coding").

**His Challenge:**
- Lots of things running in his head: car registration, doctor appointments, gifts to buy, trips to plan, job search activities
- Previous systems didn't stick because:
  - Too much friction to capture in the moment
  - Too much overhead to organize and categorize
  - Out of sight = out of mind
  - No sense of urgency or consequences

**What Worked Before:** Automating his finances. Money moves automatically, he just checks in occasionally. He wanted that same feeling for the rest of his life.

### The Solution Design

1. **Frictionless Capture:** One tap, speak anything, done
2. **AI Processing:** System extracts structure from messy input
3. **Smart Routing:** Items automatically go to the right place
4. **Calendar Sync:** Time-bound items create calendar events
5. **Daily Briefs:** Morning (what's today) and night (what's ahead) summaries

---

## 3. System Architecture

### High-Level Data Flow

```
┌─────────────────┐
│   iPhone        │ ← User speaks/types
│ (Apple Shortcut)│
└────────┬────────┘
         │ HTTP POST with text
         ▼
┌─────────────────┐
│ Google Cloud    │ ← Receives capture, processes immediately
│ Function        │
└────────┬────────┘
         │ Processes with Gemini AI
         ▼
┌─────────────────────────────────────────┐
│            Google Sheet                  │
│  ┌───────┬───────┬───────┬───────────┐  │
│  │Inbox  │ Tasks │Events │ Ideas     │  │
│  │       │       │       │ Reference │  │
│  └───────┴───────┴───────┴───────────┘  │
└────────┬────────────────────────────────┘
         │ Events with dates
         ▼
┌─────────────────┐
│ Google Calendar │ ← Auto-creates events with smart reminders
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Daily Briefs   │ ← Generated 2x daily (8am, 11pm)
│   via Email     │
└─────────────────┘
```

### Two Processing Paths

**Path 1: Immediate Processing (Cloud Function)**
- Phone → Cloud Function → AI → Sheets + Calendar → Response to phone
- Processes in real-time, ~2-3 seconds end-to-end
- User gets immediate confirmation with summary

**Path 2: Batch Processing (Local Python)**
- Inbox fills with captures → Scheduled processor runs
- Processes any unprocessed items
- Useful for retries, bulk processing, or items added directly to sheet

---

## 4. Technical Implementation

### Core Python Modules

The system is built as a modular Python application with clear separation of concerns:

```
src/
├── processor.py        # Main orchestration (276 lines)
├── ai_client.py        # Gemini AI wrapper (154 lines)
├── sheets_client.py    # Google Sheets CRUD (592 lines)
├── calendar_client.py  # Google Calendar ops (325 lines)
├── brief_generator.py  # Daily brief creation (379 lines)
├── email_client.py     # Gmail SMTP delivery (154 lines)
├── models.py           # Pydantic data models (394 lines)
└── __init__.py         # Package init (2 lines)
```

**Total: ~2,276 lines of Python code**

### Key Design Patterns

1. **Client Pattern:** Each external service (Sheets, Calendar, AI, Email) has its own client class
2. **Retry Logic:** All API calls have exponential backoff (max 3 retries)
3. **Validation:** Pydantic models validate all data at boundaries
4. **Error Isolation:** Calendar/email failures don't block item processing
5. **Stateless Processing:** Each item processed independently

---

## 5. AI Processing Engine

### The AI Client (`src/ai_client.py`)

Uses **Google Gemini 3 Flash** (not Claude, despite initial design docs) via the `google-genai` SDK.

**Why Gemini 3 Flash:**
- Fast (low latency for phone captures)
- Native JSON output mode
- Good at structured extraction
- Free tier sufficient for personal use

### How Extraction Works

```python
# ai_client.py:61-100
def extract_structure(self, raw_text: str, current_date: datetime) -> dict:
    # 1. Load the processor prompt from config/prompts/processor_prompt.txt
    # 2. Add current date context ("Today is 2026-01-14, Tuesday")
    # 3. Send to Gemini with JSON response mode
    # 4. Parse JSON response
    # 5. Validate through Pydantic model
    # 6. Return ProcessedItem
```

### The Processor Prompt

Located at `config/prompts/processor_prompt.txt` (132 lines). Key responsibilities:

1. **Classify item type:** Task, Event, Idea, or Reference
2. **Assign category:** One of 11 categories (Car, Personal, Family, etc.)
3. **Extract people:** Named individuals mentioned
4. **Parse dates:** Relative dates ("tomorrow", "end of month") to absolute
5. **Determine urgency:** HIGH, MEDIUM, or LOW based on language cues
6. **Infer consequences:** What happens if this doesn't get done
7. **Suggest reminders:** Based on urgency and type
8. **Flag clarifications:** When critical info is missing

### Extraction JSON Schema

```json
{
  "item_type": "Task | Event | Idea | Reference",
  "description": "Clean, concise description",
  "category": "One of 11 categories",
  "subcategory": "For Ideas only",
  "people": ["List of people mentioned"],
  "due_date": "YYYY-MM-DD or null",
  "due_time": "HH:MM or null",
  "reminders": [{"date": "...", "time": "...", "reason": "..."}],
  "urgency": "HIGH | MEDIUM | LOW",
  "consequence": "What happens if not done",
  "source": "Who recommended / where from",
  "location": "Physical location if relevant",
  "links": ["URLs mentioned"],
  "notes": "Additional context",
  "needs_clarification": true | false,
  "clarification_questions": ["Questions to ask"],
  "sub_tasks": [{"description": "...", "due": "...", "urgency": "..."}],
  "calendar_action": "CREATE_EVENT | CREATE_REMINDER | NONE"
}
```

### Urgency Logic

| Level | Criteria |
|-------|----------|
| **HIGH** | Explicit urgency ("urgent", "ASAP"), deadline within 3 days, stated consequences |
| **MEDIUM** | Has deadline 4-14 days out, important but not critical |
| **LOW** | No deadline, someday/maybe, nice-to-have |

### Smart Reminder Strategy

| Situation | Reminders |
|-----------|-----------|
| HIGH urgency deadline | 1 week before, 1 day before, morning of |
| MEDIUM urgency deadline | 2-3 days before, day before |
| LOW urgency / no deadline | No automatic reminder |
| Appointment with location | 2 hours before (travel buffer) |
| Has consequence | Extra reminder at 1 week mark |

---

## 6. Data Models

### Pydantic Models (`src/models.py`)

All data structures are defined as Pydantic v2 models with validation.

#### InboxItem — Raw capture

```python
class InboxItem(BaseModel):
    id: str                          # UUID
    raw_text: str                    # Original voice/text input
    captured_at: datetime            # When captured
    processed: bool = False          # Has been processed?
```

#### ProcessedItem — After AI extraction

```python
class ProcessedItem(BaseModel):
    # Identity
    id: str
    raw_text: str

    # Classification
    item_type: Literal["Task", "Event", "Idea", "Reference"]
    description: str
    category: str                    # Validated against CATEGORIES
    subcategory: Optional[str]       # Only for Ideas, validated
    people: list[str]

    # Time-related
    due_date: Optional[date]
    due_time: Optional[time]
    reminders: list[ReminderTime]

    # Priority
    urgency: Literal["HIGH", "MEDIUM", "LOW"]
    consequence: Optional[str]

    # Metadata
    source: Optional[str]
    location: Optional[str]
    links: list[str]
    notes: Optional[str]

    # Clarification
    needs_clarification: bool
    clarification_questions: list[str]

    # Status
    status: Literal["pending", "in_progress", "completed", "cancelled"]

    # Timestamps
    captured_at: datetime
    processed_at: datetime
    completed_at: Optional[datetime]

    # Calendar
    calendar_event_id: Optional[str]
    calendar_action: Literal["CREATE_EVENT", "CREATE_REMINDER", "NONE"]

    # Sub-tasks
    sub_tasks: list[SubTask]
```

#### Supporting Models

- **ReminderTime:** Date, time, and reason for a reminder
- **SubTask:** Breakdown of complex items
- **DailyBrief:** Container for brief generation
- **AIExtractionResponse:** What we expect back from the AI

### Category Definitions (`config/categories.py`)

Central source of truth for all enums and constants:

```python
CATEGORIES = ["Car", "Personal", "Family", "Finance", "Health",
              "Home", "Work", "Recruiting", "Travel", "Ideas", "Reference"]

IDEA_SUBCATEGORIES = ["Books", "Movies", "TV", "Restaurants", "Articles",
                      "Gifts", "Products", "Places", "Activities", "Random"]

KNOWN_PEOPLE = {"Dad": "father", "Mom": "mother",
                "Anjali": "girlfriend", "Dobby": "dog"}

ITEM_TYPES = ["Task", "Event", "Idea", "Reference"]
URGENCY_LEVELS = ["HIGH", "MEDIUM", "LOW"]
ITEM_STATUSES = ["pending", "in_progress", "completed", "cancelled"]
CALENDAR_ACTIONS = ["CREATE_EVENT", "CREATE_REMINDER", "NONE"]
```

---

## 7. Google Sheets Integration

### Sheets Client (`src/sheets_client.py`)

Uses the `gspread` library with service account authentication.

### Sheet Structure

One spreadsheet with 5 tabs:

**Inbox Tab**
| Column | Description |
|--------|-------------|
| id | UUID |
| raw_text | Original capture |
| captured_at | ISO datetime |
| processed | TRUE/FALSE |

**Tasks Tab**
| Column | Description |
|--------|-------------|
| id | UUID |
| description | Clean task description |
| category | Category |
| subcategory | Subcategory (if applicable) |
| people | Comma-separated names |
| due_date | YYYY-MM-DD |
| urgency | HIGH/MEDIUM/LOW |
| consequence | What happens if not done |
| status | pending/in_progress/completed/cancelled |
| notes | Additional context |
| calendar_event_id | Linked Google Calendar event |
| captured_at | Original capture time |

**Events Tab**
| Column | Description |
|--------|-------------|
| id | UUID |
| description | Event description |
| category | Category |
| people | Comma-separated names |
| event_date | YYYY-MM-DD |
| event_time | HH:MM |
| location | Physical location |
| urgency | HIGH/MEDIUM/LOW |
| consequence | What happens if missed |
| calendar_event_id | Google Calendar event ID |
| captured_at | Original capture time |

**Ideas Tab**
| Column | Description |
|--------|-------------|
| id | UUID |
| description | Idea description |
| category | Always "Ideas" |
| subcategory | Books/Movies/Restaurants/Gifts/etc. |
| people | Who it's for / who recommended |
| source | Where you heard about it |
| links | URLs |
| notes | Additional context |
| captured_at | When captured |

**Reference Tab**
| Column | Description |
|--------|-------------|
| id | UUID |
| description | What this reference is |
| pointer | Where to find the actual info |
| category | Category |
| captured_at | When added |

### Key Operations

```python
# Reading
get_unprocessed_items()           # Items in Inbox where processed=FALSE
get_events_for_date(date)         # Events on a specific date
get_tasks_due_by(date)            # Tasks due on or before date
get_high_urgency_items()          # All HIGH urgency items
get_items_due_between(start, end) # Items in date range
get_stale_inbox_items(days=3)     # Unprocessed items older than N days
get_items_needing_clarification() # Items flagged for clarification
get_items_with_consequences_soon(days=14) # Consequence items approaching

# Writing
add_to_tasks(item)                # Append to Tasks tab
add_to_events(item)               # Append to Events tab
add_to_ideas(item)                # Append to Ideas tab
add_to_reference(item)            # Append to Reference tab
mark_processed(item_id)           # Set processed=TRUE in Inbox
mark_failed(item_id, error)       # Log failure

# Updating
update_task_status(item_id, status)           # Change task status
update_calendar_event_id(item_id, type, id)   # Link calendar event
```

### Error Handling

All operations wrapped in retry logic:

```python
def _retry_operation(self, operation, *args, **kwargs):
    for attempt in range(self.max_retries):
        try:
            return operation(*args, **kwargs)
        except APIError as e:
            if attempt < self.max_retries - 1:
                delay = self.retry_delay * (2 ** attempt)  # Exponential backoff
                time.sleep(delay)
            else:
                raise
```

---

## 8. Google Calendar Integration

### Calendar Client (`src/calendar_client.py`)

Uses the Google Calendar API v3 with service account credentials.

### Event Creation

When an item has `calendar_action = "CREATE_EVENT"` or `"CREATE_REMINDER"`:

```python
def create_event(self, item: ProcessedItem) -> Optional[str]:
    event = {
        "summary": item.description,
        "description": f"Category: {item.category}\nConsequence: {item.consequence}",
        "start": {
            "dateTime": start_datetime.isoformat(),
            "timeZone": self.timezone,
        },
        "end": {
            "dateTime": end_datetime.isoformat(),
            "timeZone": self.timezone,
        },
        "reminders": {
            "useDefault": False,
            "overrides": self._calculate_reminders(item),
        },
    }

    if item.location:
        event["location"] = item.location

    result = service.events().insert(
        calendarId=self.calendar_id,
        body=event
    ).execute()

    return result.get("id")
```

### Smart Reminders

Reminders are calculated based on urgency:

```python
def _calculate_reminders(self, item: ProcessedItem) -> list[dict]:
    if item.urgency == "HIGH":
        reminders = [
            {"method": "popup", "minutes": 10080},  # 1 week
            {"method": "popup", "minutes": 1440},   # 1 day
            {"method": "popup", "minutes": 60},     # 1 hour
        ]
    elif item.urgency == "MEDIUM":
        reminders = [
            {"method": "popup", "minutes": 4320},   # 3 days
            {"method": "popup", "minutes": 1440},   # 1 day
        ]
    else:  # LOW
        reminders = [
            {"method": "popup", "minutes": 60},     # 1 hour
        ]

    # Add travel buffer for events with location
    if item.location and item.item_type == "Event":
        reminders.append({"method": "popup", "minutes": 120})  # 2 hours

    # Extra reminder for items with consequences
    if item.consequence:
        reminders.append({"method": "popup", "minutes": 10080})  # 1 week

    # Deduplicate and limit to 5 (Calendar API limit)
    return unique_reminders[:5]
```

### Event Lifecycle

- **Create:** When item first processed with date
- **Update:** When item details change (not yet implemented)
- **Delete:** When item cancelled (implemented but not triggered)

---

## 9. Daily Briefs System

### Brief Generator (`src/brief_generator.py`)

Generates two briefs daily:

### Morning Brief (8am)

**Purpose:** Focus on today, action-oriented

**Sections:**
1. **Today's Schedule** — Events with times
2. **Must Do Today** — Tasks due today, HIGH urgency items
3. **Today's Focus** — 1-3 recommended priorities

**Data Queries:**
- `get_events_for_date(today)`
- `get_tasks_due_by(today)`
- `get_high_urgency_items()`

**Example Output:**
```
☀️ MORNING BRIEF — Tuesday, January 14
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TODAY'S SCHEDULE
────────────────
4:10 PM — Car registration at AAA Potrero Hill
          📍 Potrero Hill
          ⚠️ Car almost got towed - don't miss this

MUST DO TODAY
─────────────
🚨 Car registration appointment
   Bring: ID, current registration, payment

□ Order craft supplies for Friday's event

🎯 TODAY'S FOCUS
────────────────
1. Get to AAA by 4:10 PM
2. Order the craft supplies
3. Confirm event headcount

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Have a good day.
```

### Night Brief (11pm)

**Purpose:** Look ahead, planning-oriented

**Sections:**
1. **Tomorrow** — Tomorrow's schedule
2. **This Week** — Items due in next 7 days
3. **Needs Your Input** — Items needing clarification
4. **Been Sitting On** — Stale items (>3 days)
5. **Heads Up** — Consequences approaching
6. **Consider for Tomorrow** — Suggestions

**Data Queries:**
- `get_events_for_date(tomorrow)`
- `get_items_due_between(tomorrow, week_end)`
- `get_stale_inbox_items(days=3)`
- `get_items_needing_clarification()`
- `get_items_with_consequences_soon(days=14)`

### Email Delivery (`src/email_client.py`)

Uses Gmail SMTP with App Password authentication:

```python
def send_brief(self, brief_content: str, subject: str) -> bool:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Life OS <{self.sender_email}>"
    msg["To"] = self.recipient_email

    text_part = MIMEText(brief_content, "plain", "utf-8")
    msg.attach(text_part)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(self.sender_email, self.app_password)
        server.send_message(msg)
```

**Fallback:** If Gmail not configured, prints to console.

---

## 10. Phone Capture System

### Cloud Function (`cloud_functions/capture/main.py`)

A Google Cloud Function (2nd gen) that:

1. **Receives** HTTP POST from Apple Shortcut
2. **Validates** API key
3. **Saves** raw capture to Inbox
4. **Processes** with Gemini AI
5. **Routes** to correct tab
6. **Creates** calendar event if needed
7. **Returns** formatted summary

### Request Format

```bash
POST /
Headers:
  Authorization: Bearer YOUR_API_KEY
  Content-Type: application/json

Body:
  {"text": "Your voice/text capture here"}
```

### Response Format

```json
{
  "success": true,
  "id": "uuid-here",
  "processed": {
    "type": "Event",
    "description": "Car registration at AAA",
    "due_date": "2026-01-14",
    "due_time": "16:10",
    "urgency": "HIGH",
    "category": "Car",
    "location": "AAA Potrero Hill",
    "people": [],
    "routed_to": "Events",
    "calendar_created": true,
    "needs_clarification": false,
    "clarification_questions": [],
    "summary": "📅 Car registration at AAA\nTue Jan 14 at 4:10 PM\n📍 AAA Potrero Hill\n🏷️ Car | 🔴 High\n✅ Added to calendar"
  }
}
```

### Cloud Function Flow

```
1. Verify API key (Authorization header)
2. Generate UUID and timestamp
3. Save raw text to Inbox tab (processed=FALSE)
4. Send to Gemini for processing
5. If AI succeeds:
   - Validate category
   - Route to correct tab (Tasks/Events/Ideas/Reference)
   - Create calendar event if Event with date
   - Mark inbox item as processed (processed=TRUE)
6. Return summary for phone notification
```

### Apple Shortcut Setup

**Simple Version:**
1. Ask for Input (with dictation)
2. Get Contents of URL (POST to Cloud Function)
3. Show Notification (success/failure)

**Detailed Setup in:** `cloud_functions/capture/DEPLOY.md`

### Deployment

```bash
gcloud functions deploy life-os-capture \
  --gen2 \
  --runtime=python312 \
  --region=us-west1 \
  --source=. \
  --entry-point=capture \
  --trigger-http \
  --allow-unauthenticated \
  --memory=256MB \
  --timeout=30s \
  --set-env-vars="GOOGLE_SHEET_ID=...,CAPTURE_API_KEY=...,GOOGLE_API_KEY=...,GOOGLE_CALENDAR_ID=..."
```

---

## 11. Configuration & Environment

### Environment Variables

Create `.env` file from `.env.example`:

```bash
# Google Gemini API
GOOGLE_API_KEY=AIza...

# Google Cloud Service Account
GOOGLE_CREDENTIALS_PATH=./credentials.json

# Google Sheet
GOOGLE_SHEET_ID=1abc123...

# Google Calendar
GOOGLE_CALENDAR_ID=primary

# Email
RECIPIENT_EMAIL=your-email@gmail.com
GMAIL_ADDRESS=sender@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Timezone
TIMEZONE=America/Los_Angeles
```

### Google Cloud Setup

1. **Create Project** in Google Cloud Console
2. **Enable APIs:**
   - Google Sheets API
   - Google Calendar API
   - Cloud Functions API
3. **Create Service Account:**
   - Download JSON key
   - Share Google Sheet with service account email
   - Share Google Calendar with service account email
4. **Create App Password** for Gmail (if using email)

### Dependencies

**Main Project (`requirements.txt`):**
```
google-genai>=1.0.0
gspread>=6.0.0
google-auth>=2.0.0
google-auth-oauthlib>=1.2.0
google-api-python-client>=2.100.0
pydantic>=2.5.0
python-dotenv>=1.0.0
pytz>=2024.1
pytest>=8.0.0
```

**Cloud Function (`cloud_functions/capture/requirements.txt`):**
```
functions-framework>=3.0.0
gspread>=6.0.0
google-auth>=2.0.0
google-genai>=1.0.0
google-api-python-client>=2.100.0
```

---

## 12. File-by-File Breakdown

### Source Files (`src/`)

| File | Lines | Purpose |
|------|-------|---------|
| `processor.py` | 276 | Main orchestrator. Reads inbox, calls AI, routes items, creates calendar events. Entry point for batch processing. |
| `ai_client.py` | 154 | Wraps Gemini API. Loads prompt, sends text, parses JSON, validates through Pydantic. |
| `sheets_client.py` | 592 | All Google Sheets operations. Reading, writing, updating across all 5 tabs. Includes retry logic. |
| `calendar_client.py` | 325 | Google Calendar create/update/delete. Smart reminder calculation based on urgency. |
| `brief_generator.py` | 379 | Generates morning and night briefs. Queries sheets, formats output, handles empty sections. |
| `email_client.py` | 154 | Gmail SMTP delivery. Falls back to console if not configured. |
| `models.py` | 394 | All Pydantic models. InboxItem, ProcessedItem, DailyBrief, etc. With validation and serialization helpers. |

### Configuration Files (`config/`)

| File | Purpose |
|------|---------|
| `categories.py` | Central source of truth for all enums: categories, subcategories, people, statuses, column definitions. |
| `prompts/processor_prompt.txt` | The AI extraction prompt. Defines how to classify, categorize, and extract structure. |

### Cloud Function (`cloud_functions/capture/`)

| File | Purpose |
|------|---------|
| `main.py` | HTTP endpoint. Receives captures, processes immediately, returns summary. Contains embedded copy of processor prompt. |
| `requirements.txt` | Cloud function dependencies. |
| `DEPLOY.md` | Step-by-step deployment guide for Cloud Function and Apple Shortcut setup. |
| `.env.yaml` | Environment variable template for Cloud Functions. |

### Documentation (`docs/`)

| File | Purpose |
|------|---------|
| `PRD.md` | Product requirements. Vision, problem statement, user profile, features, categories, success criteria. |
| `TECHNICAL_SPEC.md` | Architecture, tech stack, data models, API setup, processing flows. |
| `AI_PROMPT_SPEC.md` | AI prompt with detailed examples. 7 worked examples showing expected extraction. |
| `DAILY_BRIEF_TEMPLATE.md` | Morning and night brief templates with formatting guidelines. |
| `COMPREHENSIVE_PROJECT_DOCUMENTATION.md` | This file. |

### Root Files

| File | Purpose |
|------|---------|
| `README.md` | Quick start guide. Setup steps, project structure, category list. |
| `SKILL.md` | Claude Code context. Project overview, key files, common tasks, how Aditya works. |
| `.env.example` | Template for environment variables. |
| `requirements.txt` | Python dependencies for main project. |

---

## 13. What's Built vs. What's Planned

### Built and Working

| Feature | Status | Notes |
|---------|--------|-------|
| Phone capture via Cloud Function | ✅ Working | Real-time processing, returns summary |
| AI extraction with Gemini | ✅ Working | Categories, dates, urgency, consequences |
| Google Sheets storage | ✅ Working | All 5 tabs with proper columns |
| Automatic routing | ✅ Working | Tasks, Events, Ideas, Reference |
| Google Calendar creation | ✅ Working | Smart reminders based on urgency |
| Morning brief generation | ✅ Working | Today's schedule, must-do, focus |
| Night brief generation | ✅ Working | Tomorrow, this week, consequences |
| Email delivery | ✅ Working | Gmail SMTP with fallback |
| Apple Shortcut | ✅ Working | Voice/text capture |

### Not Yet Built

| Feature | Status | Notes |
|---------|--------|-------|
| GitHub Actions automation | 📋 Planned | Workflows documented but not created |
| Test suite | 📋 Planned | Test files referenced but not created |
| Clarification follow-up flow | 📋 Planned | Prompt exists, not wired up |
| Query interface | 🔮 Future v2 | "What gift ideas for Anjali?" |
| Email parsing | 🔮 Future v2 | Auto-extract from Gmail |
| Weekly review | 🔮 Future v2 | Longer summary with patterns |
| Voice responses | 🔮 Future v2 | AI responds via voice |
| Multi-user support | 🔮 Future v2 | Friends/family access |

### GitHub Actions (Documented but not created)

```yaml
# Would run at 8am PT
morning_brief.yml: python -m src.brief_generator morning

# Would run at 11pm PT
night_brief.yml: python -m src.brief_generator night

# Would run every 4 hours (fallback processor)
process_inbox.yml: python -m src.processor
```

---

## 14. How Everything Connects

### The Complete Flow

```
1. USER CAPTURES
   - Opens Apple Shortcut on iPhone
   - Speaks: "Car registration appointment at AAA tomorrow at 4:10pm,
              my car almost got towed"

2. CLOUD FUNCTION RECEIVES
   POST /capture
   {
     "text": "Car registration appointment at AAA tomorrow at 4:10pm,
              my car almost got towed"
   }

3. SAVES TO INBOX
   Google Sheet → Inbox tab
   | id | raw_text | captured_at | processed |
   | uuid | "Car registration..." | 2026-01-13T20:00:00 | FALSE |

4. AI PROCESSES
   Gemini 3 Flash extracts:
   {
     "item_type": "Event",
     "description": "Car registration appointment at AAA",
     "category": "Car",
     "due_date": "2026-01-14",
     "due_time": "16:10",
     "urgency": "HIGH",
     "consequence": "Car almost got towed - late on registration",
     "location": "AAA",
     "calendar_action": "CREATE_EVENT"
   }

5. ROUTES TO EVENTS TAB
   Google Sheet → Events tab
   | id | description | category | due_date | due_time | urgency | ... |
   | uuid | Car registration... | Car | 2026-01-14 | 16:10 | HIGH | ... |

6. CREATES CALENDAR EVENT
   Google Calendar event:
   - Title: "Car registration appointment at AAA"
   - When: Jan 14, 4:10 PM
   - Where: AAA
   - Reminders: 1 week, 1 day, 1 hour before

7. MARKS INBOX PROCESSED
   Inbox tab: processed = TRUE

8. RETURNS TO PHONE
   {
     "success": true,
     "processed": {
       "summary": "📅 Car registration at AAA\nTue Jan 14 at 4:10 PM\n..."
     }
   }

9. PHONE SHOWS NOTIFICATION
   "Life OS: 📅 Car registration at AAA, Tue Jan 14 at 4:10 PM, ✅ Added to calendar"

10. NEXT MORNING (8am)
    Brief Generator runs:
    - Queries Events for today
    - Queries Tasks due today
    - Formats morning brief
    - Emails to user

11. USER RECEIVES
    "☀️ MORNING BRIEF — Tuesday, January 14
     4:10 PM — Car registration at AAA Potrero Hill
     ⚠️ Car almost got towed..."
```

### Key Integration Points

| Component A | Component B | How They Connect |
|-------------|-------------|------------------|
| Apple Shortcut | Cloud Function | HTTP POST with API key |
| Cloud Function | Google Sheets | gspread library, service account auth |
| Cloud Function | Gemini AI | google-genai SDK, JSON response mode |
| Cloud Function | Google Calendar | Calendar API v3, service account auth |
| Sheets Client | Calendar Client | Shares credentials, links via calendar_event_id |
| Brief Generator | Sheets Client | Queries sheets for today's items |
| Brief Generator | Email Client | Passes formatted text for delivery |

---

## 15. Key Design Decisions

### Why Google Sheets (not a database)?

1. **Visibility:** Can see and edit data directly
2. **Free:** No hosting costs
3. **Familiar:** Already using Google Workspace
4. **Simple:** No schema migrations, just tabs
5. **Queryable:** Native filtering in Sheets UI

**Trade-off:** Limited to ~50,000 rows per tab, not suitable for high-volume use.

### Why Gemini (not Claude)?

Despite initial docs mentioning Claude, the implementation uses Gemini because:

1. **Native JSON mode:** `response_mime_type="application/json"`
2. **Speed:** Gemini Flash is optimized for low latency
3. **Cost:** Generous free tier for personal use
4. **Integration:** Same Google ecosystem as other services

### Why Cloud Function (not just local processor)?

1. **Immediate feedback:** User gets confirmation in 2-3 seconds
2. **Always on:** No need to run local script
3. **Mobile-first:** Designed for phone capture
4. **Stateless:** Each capture independent

**The local processor still exists** as a fallback for batch processing and retries.

### Why Plain Text Briefs (not HTML)?

1. **Universal:** Readable on any device/client
2. **Fast:** No rendering delays
3. **Clean:** Monospace formatting works well
4. **Simple:** Easy to generate, easy to scan

### Why Categories Are Fixed (not AI-determined)?

1. **Predictability:** User knows where to find things
2. **Validation:** Can catch AI errors
3. **Queryability:** Easy to filter by category
4. **Simplicity:** 11 categories covers most of life

---

## Summary

Life OS is a personal life management system that:

1. **Captures** freeform voice/text from a phone
2. **Processes** with AI to extract structure
3. **Routes** to organized Google Sheets tabs
4. **Syncs** with Google Calendar (smart reminders)
5. **Delivers** daily briefs via email

**Built with:** Python, Google Gemini, Google Sheets API, Google Calendar API, Gmail, Cloud Functions

**Philosophy:** Zero-friction capture, AI does the organizing, system surfaces what matters

**Current State:** MVP complete and in active use. Future features documented but not yet built.

---

*This document was generated by analyzing the complete Life OS codebase and documentation.*
