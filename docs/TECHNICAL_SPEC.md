# Life OS — Technical Specification

## Architecture Overview

```
┌─────────────────┐
│   Your Phone    │
│ (Apple Shortcut)│
└────────┬────────┘
         │ Voice/Text
         ▼
┌─────────────────┐
│  Google Sheet   │
│    (Inbox)      │
└────────┬────────┘
         │ Scheduled trigger (2x daily)
         ▼
┌─────────────────┐
│ Python Processor│◄────── Claude API
│   (AI Brain)    │
└────────┬────────┘
         │ Processed items
         ▼
┌─────────────────────────────────────────┐
│            Google Sheet                  │
│  ┌───────┬───────┬───────┬───────────┐  │
│  │ Tasks │Events │ Ideas │ Reference │  │
│  └───────┴───────┴───────┴───────────┘  │
└────────┬────────────────────────────────┘
         │ Events with dates
         ▼
┌─────────────────┐
│ Google Calendar │
│  (Auto-sync)    │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Daily Briefs   │
│ (8am + 11pm)    │
│   via Email     │
└─────────────────┘
```

---

## Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| **Capture** | Apple Shortcuts | Native iOS, voice support, one-tap |
| **Inbox/Storage** | Google Sheets | Free, familiar, easy API, visible data |
| **AI Processing** | Claude API (claude-sonnet-4-20250514) | Great at structured extraction, follows instructions well |
| **Calendar** | Google Calendar API | Already use it, well-documented |
| **Daily Briefs** | Gmail API | Delivers to your inbox reliably |
| **Automation** | GitHub Actions | Free, scheduled runs, easy setup |
| **Language** | Python 3.11+ | You know it, great libraries |
| **Data Validation** | Pydantic | Type safety, clean models |

---

## File Structure

```
life-os/
├── src/
│   ├── __init__.py
│   ├── processor.py           # Main orchestration
│   ├── ai_client.py           # Claude API calls
│   ├── sheets_client.py       # Google Sheets read/write
│   ├── calendar_client.py     # Google Calendar CRUD
│   ├── email_client.py        # Gmail send
│   ├── brief_generator.py     # Daily brief formatting
│   └── models.py              # Pydantic data models
│
├── config/
│   ├── categories.py          # Category & subcategory definitions
│   └── prompts/
│       ├── processor_prompt.txt       # Main AI extraction prompt
│       ├── clarification_prompt.txt   # Follow-up questions prompt
│       └── brief_prompt.txt           # Brief generation prompt
│
├── .github/
│   └── workflows/
│       ├── morning_brief.yml  # Runs at 8am PT
│       ├── night_brief.yml    # Runs at 11pm PT
│       └── process_inbox.yml  # Runs every few hours
│
├── tests/
│   ├── test_processor.py
│   ├── test_models.py
│   └── fixtures/
│       └── sample_inputs.json
│
├── docs/
│   ├── PRD.md
│   ├── TECHNICAL_SPEC.md
│   ├── AI_PROMPT_SPEC.md
│   └── DAILY_BRIEF_TEMPLATE.md
│
├── .env.example               # Template for secrets
├── requirements.txt
├── SKILL.md                   # Claude Code context
└── README.md
```

---

## Data Models

### InboxItem (raw capture)

```python
class InboxItem(BaseModel):
    id: str                          # UUID
    raw_text: str                    # Original capture
    captured_at: datetime            # When captured
    processed: bool = False          # Has AI processed it?
    processed_at: Optional[datetime] # When processed
```

### ProcessedItem (after AI extraction)

```python
class ProcessedItem(BaseModel):
    id: str                          # UUID
    raw_text: str                    # Original capture

    # Extracted fields
    item_type: Literal["Task", "Event", "Idea", "Reference"]
    description: str                 # Clean description
    category: str                    # Top-level category
    subcategory: Optional[str]       # For Ideas especially
    people: List[str]                # People mentioned

    # Time-related
    due_date: Optional[date]
    due_time: Optional[time]
    reminders: List[datetime]        # Calculated reminder times

    # Priority
    urgency: Literal["HIGH", "MEDIUM", "LOW"]
    consequence: Optional[str]       # What happens if not done

    # Metadata
    source: Optional[str]            # Who recommended, where from
    location: Optional[str]          # Physical location if relevant
    links: List[str]                 # URLs mentioned
    notes: Optional[str]             # Additional AI notes

    # Status
    needs_clarification: bool
    clarification_questions: List[str]
    status: Literal["pending", "in_progress", "completed", "cancelled"] = "pending"

    # Timestamps
    captured_at: datetime
    processed_at: datetime
    completed_at: Optional[datetime]

    # Calendar integration
    calendar_event_id: Optional[str] # Google Calendar event ID if synced
```

### DailyBrief

```python
class DailyBrief(BaseModel):
    brief_type: Literal["morning", "night"]
    generated_at: datetime

    # Morning brief sections
    today_events: List[ProcessedItem]
    today_tasks: List[ProcessedItem]
    high_priority: List[ProcessedItem]
    focus_items: List[str]           # 1-3 recommended focuses

    # Night brief additional sections
    tomorrow_events: List[ProcessedItem]
    this_week: List[ProcessedItem]
    stale_items: List[ProcessedItem] # In inbox too long
    needs_clarification: List[ProcessedItem]
    upcoming_consequences: List[ProcessedItem]
    suggestions: List[str]
```

---

## Google Sheet Structure

### Sheet: "Life OS"

**Tab: Inbox**
| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| raw_text | string | Original capture |
| captured_at | datetime | When captured |
| processed | boolean | Has been processed? |

**Tab: Tasks**
| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| description | string | Clean task description |
| category | string | Category |
| subcategory | string | Subcategory (if applicable) |
| people | string | Comma-separated names |
| due_date | date | When due |
| urgency | string | HIGH/MEDIUM/LOW |
| consequence | string | What happens if not done |
| status | string | pending/in_progress/completed/cancelled |
| notes | string | Additional context |
| calendar_event_id | string | Linked calendar event |
| captured_at | datetime | Original capture time |

**Tab: Events**
| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| description | string | Event description |
| category | string | Category |
| people | string | Comma-separated names |
| event_date | date | Date of event |
| event_time | time | Time of event |
| location | string | Where |
| urgency | string | HIGH/MEDIUM/LOW |
| consequence | string | What happens if missed |
| calendar_event_id | string | Google Calendar event ID |
| captured_at | datetime | Original capture time |

**Tab: Ideas**
| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| description | string | Idea description |
| category | string | Always "Ideas" |
| subcategory | string | Books/Movies/Restaurants/Gifts/etc. |
| people | string | Who it's for or who recommended |
| source | string | Where you heard about it |
| links | string | URLs |
| notes | string | Additional context |
| captured_at | datetime | When captured |

**Tab: Reference**
| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| description | string | What this reference is |
| pointer | string | Where to find the actual info |
| category | string | Category for organization |
| captured_at | datetime | When added |

---

## API Setup

### 1. Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Life OS"
3. Enable APIs:
   - Google Sheets API
   - Google Calendar API
   - Gmail API

### 2. Service Account (for Sheets & Calendar)

1. Go to IAM & Admin → Service Accounts
2. Create service account: "life-os-service"
3. Grant roles: None needed (we'll share sheet directly)
4. Create JSON key, download as `credentials.json`
5. Share your Google Sheet with the service account email

### 3. OAuth (for Gmail)

1. Go to APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Desktop app)
3. Download as `oauth_credentials.json`
4. First run will open browser for authorization

### 4. Claude API

1. Go to [Anthropic Console](https://console.anthropic.com)
2. Create API key
3. Save as `ANTHROPIC_API_KEY`

### 5. Environment Variables

Create `.env` file:

```bash
# Claude
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_CREDENTIALS_PATH=./credentials.json
GOOGLE_OAUTH_CREDENTIALS_PATH=./oauth_credentials.json
GOOGLE_SHEET_ID=your-sheet-id-here

# Calendar
GOOGLE_CALENDAR_ID=primary  # or specific calendar ID

# Email
RECIPIENT_EMAIL=your-email@gmail.com

# Timezone
TIMEZONE=America/Los_Angeles
```

---

## Processing Flow

### 1. Inbox Processing (runs every 2-4 hours)

```python
def process_inbox():
    # 1. Read unprocessed items from Inbox tab
    inbox_items = sheets_client.get_unprocessed_items()

    for item in inbox_items:
        # 2. Send to Claude for extraction
        processed = ai_client.extract_structure(item.raw_text)

        # 3. Check if clarification needed
        if processed.needs_clarification:
            # Store with flag, will appear in night brief
            pass

        # 4. Route to correct tab
        if processed.item_type == "Task":
            sheets_client.add_to_tasks(processed)
        elif processed.item_type == "Event":
            sheets_client.add_to_events(processed)
            # Also create calendar event
            if processed.due_date:
                calendar_client.create_event(processed)
        elif processed.item_type == "Idea":
            sheets_client.add_to_ideas(processed)
        elif processed.item_type == "Reference":
            sheets_client.add_to_reference(processed)

        # 5. Mark as processed in inbox
        sheets_client.mark_processed(item.id)
```

### 2. Morning Brief (runs at 8am PT)

```python
def generate_morning_brief():
    today = date.today()

    # Gather today's items
    today_events = sheets_client.get_events_for_date(today)
    today_tasks = sheets_client.get_tasks_due_by(today)
    high_priority = sheets_client.get_high_urgency_items()

    # Generate brief
    brief = brief_generator.create_morning_brief(
        events=today_events,
        tasks=today_tasks,
        high_priority=high_priority
    )

    # Send email
    email_client.send_brief(brief, subject="☀️ Morning Brief")
```

### 3. Night Brief (runs at 11pm PT)

```python
def generate_night_brief():
    tomorrow = date.today() + timedelta(days=1)
    week_end = date.today() + timedelta(days=7)

    # Gather items
    tomorrow_events = sheets_client.get_events_for_date(tomorrow)
    this_week = sheets_client.get_items_due_between(tomorrow, week_end)
    stale = sheets_client.get_stale_inbox_items(days=3)
    needs_clarification = sheets_client.get_items_needing_clarification()
    consequences = sheets_client.get_items_with_consequences_soon()

    # Generate brief
    brief = brief_generator.create_night_brief(
        tomorrow=tomorrow_events,
        this_week=this_week,
        stale=stale,
        needs_clarification=needs_clarification,
        consequences=consequences
    )

    # Send email
    email_client.send_brief(brief, subject="🌙 Night Brief")
```

---

## Calendar Integration

### Create Event

```python
def create_event(item: ProcessedItem) -> str:
    event = {
        'summary': item.description,
        'description': f"Category: {item.category}\nConsequence: {item.consequence or 'None'}",
        'start': {
            'dateTime': datetime.combine(item.due_date, item.due_time or time(9, 0)).isoformat(),
            'timeZone': 'America/Los_Angeles',
        },
        'end': {
            'dateTime': datetime.combine(item.due_date, item.due_time or time(10, 0)).isoformat(),
            'timeZone': 'America/Los_Angeles',
        },
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'popup', 'minutes': minutes}
                for minutes in calculate_reminder_minutes(item)
            ],
        },
    }

    result = calendar_service.events().insert(
        calendarId='primary',
        body=event
    ).execute()

    return result['id']
```

### Update Event

```python
def update_event(event_id: str, item: ProcessedItem):
    # Fetch existing, update fields, push back
    event = calendar_service.events().get(
        calendarId='primary',
        eventId=event_id
    ).execute()

    event['summary'] = item.description
    event['start']['dateTime'] = datetime.combine(
        item.due_date,
        item.due_time or time(9, 0)
    ).isoformat()

    calendar_service.events().update(
        calendarId='primary',
        eventId=event_id,
        body=event
    ).execute()
```

### Delete Event

```python
def delete_event(event_id: str):
    calendar_service.events().delete(
        calendarId='primary',
        eventId=event_id
    ).execute()
```

---

## GitHub Actions Schedules

### .github/workflows/process_inbox.yml

```yaml
name: Process Inbox

on:
  schedule:
    - cron: '0 */4 * * *'  # Every 4 hours
  workflow_dispatch:  # Manual trigger

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: python -m src.processor
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GOOGLE_CREDENTIALS: ${{ secrets.GOOGLE_CREDENTIALS }}
          GOOGLE_SHEET_ID: ${{ secrets.GOOGLE_SHEET_ID }}
```

### .github/workflows/morning_brief.yml

```yaml
name: Morning Brief

on:
  schedule:
    - cron: '0 16 * * *'  # 8am PT (UTC-8)
  workflow_dispatch:

jobs:
  brief:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: python -m src.brief_generator morning
        env:
          # ... secrets
```

### .github/workflows/night_brief.yml

```yaml
name: Night Brief

on:
  schedule:
    - cron: '0 7 * * *'  # 11pm PT (UTC-8)
  workflow_dispatch:

jobs:
  brief:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: python -m src.brief_generator night
        env:
          # ... secrets
```

---

## Apple Shortcut Setup

### Shortcut: "Life OS Capture"

**Actions:**
1. **Dictate Text** (or **Ask for Input** if you prefer typing)
2. **Get Current Date** → format as ISO 8601
3. **Add Row to Google Sheet**
   - Sheet: "Life OS"
   - Tab: "Inbox"
   - Columns: `id` (UUID), `raw_text` (dictated text), `captured_at` (date), `processed` (FALSE)

**Alternative using Google Forms:**
1. Create a Google Form with one field: "Capture"
2. Form responses go to your Sheet's Inbox tab
3. Shortcut opens the form URL

**Alternative using Email:**
1. Shortcut sends email to a specific address
2. A Zapier/n8n automation reads that email and adds to Sheet

---

## Error Handling

```python
class ProcessingError(Exception):
    """Raised when AI processing fails"""
    pass

class CalendarSyncError(Exception):
    """Raised when calendar operations fail"""
    pass

def process_with_retry(item: InboxItem, max_retries: int = 3):
    for attempt in range(max_retries):
        try:
            return ai_client.extract_structure(item.raw_text)
        except Exception as e:
            if attempt == max_retries - 1:
                # Log error, mark item as failed, continue
                logging.error(f"Failed to process {item.id}: {e}")
                sheets_client.mark_failed(item.id, str(e))
                raise ProcessingError(f"Failed after {max_retries} attempts")
            time.sleep(2 ** attempt)  # Exponential backoff
```

---

## Dependencies

### requirements.txt

```
anthropic>=0.40.0
google-api-python-client>=2.100.0
google-auth-httplib2>=0.2.0
google-auth-oauthlib>=1.2.0
gspread>=6.0.0
pydantic>=2.5.0
python-dotenv>=1.0.0
pytz>=2024.1
```

---

*Last updated: January 2026*
