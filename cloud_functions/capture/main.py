"""
Life OS Phone Capture Cloud Function

Receives voice/text captures from Apple Shortcuts, processes them with Gemini AI,
routes to the correct sheet tab, creates calendar events, and returns a summary.
"""

import os
import json
import uuid
from datetime import datetime, date, time, timedelta
from typing import Optional

import functions_framework
from flask import Request, jsonify
import gspread
from google.oauth2 import service_account
from google import genai
from google.genai import types
from googleapiclient.discovery import build


# Configuration
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/calendar"
]
TIMEZONE = "America/Los_Angeles"

# Sheet tab names
SHEET_TABS = {
    "inbox": "Inbox",
    "tasks": "Tasks",
    "events": "Events",
    "ideas": "Ideas",
    "reference": "Reference",
}

# Valid categories
CATEGORIES = [
    "Car", "Personal", "Family", "Finance", "Health",
    "Home", "Work", "Recruiting", "Travel", "Ideas", "Reference"
]

# Processor prompt (embedded for Cloud Functions)
PROCESSOR_PROMPT = """You are a personal life assistant processing captures for Aditya's Life OS.

Your job is to take freeform, messy input and extract structured information. Be smart about inference — understand context, implied deadlines, and urgency from language cues.

## Categories

Assign ONE top-level category:

| Category | Use for |
|----------|---------|
| Car | Registration, service, parking, insurance, tickets, anything vehicle-related |
| Personal | Social plans, self-care, hobbies, personal todos not fitting elsewhere |
| Family | Parents (Dad, Mom), girlfriend (Anjali), dog (Dobby), relatives, family events |
| Finance | Bills, subscriptions, payments, money decisions |
| Health | Doctor, dentist, medications, fitness, gym |
| Home | Apartment, utilities, repairs, household chores |
| Work | Job tasks, reminders, work meetings |
| Recruiting | Job search, interviews, applications, prep, career resources |
| Travel | Trips, flights, itineraries, bookings, packing |
| Ideas | Recommendations, someday/maybe, things to explore |
| Reference | Information pointers (never store sensitive data, just point to where it lives) |

## Subcategories (for Ideas only)

If category is Ideas, also assign a subcategory:
- Books, Movies, TV, Restaurants, Articles, Gifts, Products, Places, Activities, Random

## People Tags

Extract any people mentioned. Known people in Aditya's life:
- Dad — father
- Mom — mother
- Anjali — girlfriend
- Dobby — dog

For others, extract the name as mentioned.

## Item Types

Classify as ONE of:
- **Task** — Something actionable that needs to be done
- **Event** — Something happening at a specific time/date (goes on calendar)
- **Idea** — Someday/maybe, recommendation, something to explore later
- **Reference** — Information to store for later lookup (pointer only)

## Urgency

- **HIGH**: Explicit urgency language, close deadline (within 3 days), stated consequences
- **MEDIUM**: Has a deadline but not imminent (4-14 days), important but not critical
- **LOW**: No deadline, someday/maybe, nice-to-have

## Output Format

Respond with valid JSON:

{
  "item_type": "Task" | "Event" | "Idea" | "Reference",
  "description": "Clean, concise description",
  "category": "One of the categories above",
  "subcategory": "For Ideas only, or null",
  "people": ["List", "of", "people"],
  "due_date": "YYYY-MM-DD or null",
  "due_time": "HH:MM or null",
  "urgency": "HIGH" | "MEDIUM" | "LOW",
  "consequence": "What happens if not done, or null",
  "location": "Physical location if relevant, or null",
  "source": "Who recommended or where from, or null",
  "notes": "Additional context",
  "needs_clarification": true | false,
  "clarification_questions": ["Questions if needs_clarification is true"]
}

## Important Rules

1. **Always output valid JSON** — no markdown, no explanation, just the JSON object
2. **Infer intelligently** — use context clues for dates ("tomorrow", "end of month", "this weekend")
3. **Be conservative with urgency** — not everything is HIGH, most things are MEDIUM or LOW
"""


def get_credentials():
    """Get Google credentials from environment variable."""
    credentials_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if not credentials_json:
        raise ValueError("GOOGLE_CREDENTIALS_JSON not set")

    credentials_info = json.loads(credentials_json)
    return service_account.Credentials.from_service_account_info(
        credentials_info, scopes=SCOPES
    )


def get_sheets_client():
    """Initialize Google Sheets client."""
    credentials = get_credentials()
    return gspread.authorize(credentials)


def get_calendar_service():
    """Initialize Google Calendar service."""
    credentials = get_credentials()
    return build("calendar", "v3", credentials=credentials)


def verify_api_key(request: Request) -> bool:
    """Verify the API key from request headers."""
    expected_key = os.environ.get("CAPTURE_API_KEY")
    if not expected_key:
        return False

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        provided_key = auth_header[7:]
        return provided_key == expected_key

    provided_key = request.headers.get("X-API-Key", "")
    return provided_key == expected_key


def add_cors_headers(response):
    """Add CORS headers to response."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-API-Key"
    return response


def process_with_gemini(text: str) -> dict | None:
    """Process capture text with Gemini AI."""
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return None

    try:
        client = genai.Client(api_key=api_key)
        current_date = datetime.now()
        date_context = f"Today's date is {current_date.strftime('%Y-%m-%d')} ({current_date.strftime('%A')})."
        full_prompt = f"{PROCESSOR_PROMPT}\n\n{date_context}\n\nInput: {text}"

        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=full_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        if response.text:
            return json.loads(response.text)
        return None
    except Exception as e:
        print(f"Gemini processing failed: {e}")
        return None


def to_task_row(item_id: str, data: dict, captured_at: str) -> list[str]:
    """Convert processed data to a Tasks tab row."""
    return [
        item_id,
        data.get("description", ""),
        data.get("category", ""),
        data.get("subcategory") or "",
        ",".join(data.get("people", [])),
        data.get("due_date") or "",
        data.get("urgency", "MEDIUM"),
        data.get("consequence") or "",
        "pending",
        data.get("notes") or "",
        "",  # calendar_event_id (filled later)
        captured_at,
    ]


def to_event_row(item_id: str, data: dict, captured_at: str, calendar_event_id: str = "") -> list[str]:
    """Convert processed data to an Events tab row."""
    return [
        item_id,
        data.get("description", ""),
        data.get("category", ""),
        ",".join(data.get("people", [])),
        data.get("due_date") or "",
        data.get("due_time") or "",
        data.get("location") or "",
        data.get("urgency", "MEDIUM"),
        data.get("consequence") or "",
        calendar_event_id,
        captured_at,
    ]


def to_idea_row(item_id: str, data: dict, captured_at: str) -> list[str]:
    """Convert processed data to an Ideas tab row."""
    return [
        item_id,
        data.get("description", ""),
        data.get("category", ""),
        data.get("subcategory") or "",
        ",".join(data.get("people", [])),
        data.get("source") or "",
        "",  # links
        data.get("notes") or "",
        captured_at,
    ]


def to_reference_row(item_id: str, data: dict, captured_at: str) -> list[str]:
    """Convert processed data to a Reference tab row."""
    return [
        item_id,
        data.get("description", ""),
        data.get("location") or "",  # pointer column
        data.get("category", ""),
        captured_at,
    ]


def calculate_reminders(urgency: str, has_location: bool, has_consequence: bool) -> list[dict]:
    """Calculate smart reminders based on urgency and context."""
    reminders = []

    if urgency == "HIGH":
        reminders = [
            {"method": "popup", "minutes": 10080},  # 1 week
            {"method": "popup", "minutes": 1440},   # 1 day
            {"method": "popup", "minutes": 60},     # 1 hour
        ]
    elif urgency == "MEDIUM":
        reminders = [
            {"method": "popup", "minutes": 4320},   # 3 days
            {"method": "popup", "minutes": 1440},   # 1 day
        ]
    else:
        reminders = [
            {"method": "popup", "minutes": 60},     # 1 hour
        ]

    # Travel buffer for events with location
    if has_location:
        reminders.append({"method": "popup", "minutes": 120})  # 2 hours

    # Extra reminder for items with consequences
    if has_consequence:
        if not any(r["minutes"] == 10080 for r in reminders):
            reminders.append({"method": "popup", "minutes": 10080})

    # Deduplicate and limit to 5
    seen = set()
    unique = []
    for r in reminders:
        if r["minutes"] not in seen:
            seen.add(r["minutes"])
            unique.append(r)
    return unique[:5]


def create_calendar_event(data: dict) -> Optional[str]:
    """Create a Google Calendar event and return the event ID."""
    calendar_id = os.environ.get("GOOGLE_CALENDAR_ID")
    if not calendar_id:
        print("GOOGLE_CALENDAR_ID not set")
        return None

    due_date_str = data.get("due_date")
    if not due_date_str:
        return None

    try:
        service = get_calendar_service()

        # Parse date and time
        event_date = date.fromisoformat(due_date_str)
        due_time_str = data.get("due_time")
        if due_time_str:
            event_time = time.fromisoformat(due_time_str)
        else:
            event_time = time(9, 0)  # Default 9 AM

        start_datetime = datetime.combine(event_date, event_time)
        end_datetime = start_datetime + timedelta(hours=1)

        # Build description
        desc_parts = []
        if data.get("category"):
            desc_parts.append(f"Category: {data['category']}")
        if data.get("consequence"):
            desc_parts.append(f"Consequence: {data['consequence']}")
        if data.get("notes"):
            desc_parts.append(f"Notes: {data['notes']}")

        event_body = {
            "summary": data.get("description", "Life OS Event"),
            "description": "\n".join(desc_parts),
            "start": {
                "dateTime": start_datetime.isoformat(),
                "timeZone": TIMEZONE,
            },
            "end": {
                "dateTime": end_datetime.isoformat(),
                "timeZone": TIMEZONE,
            },
            "reminders": {
                "useDefault": False,
                "overrides": calculate_reminders(
                    data.get("urgency", "MEDIUM"),
                    bool(data.get("location")),
                    bool(data.get("consequence"))
                ),
            },
        }

        if data.get("location"):
            event_body["location"] = data["location"]

        result = service.events().insert(
            calendarId=calendar_id,
            body=event_body
        ).execute()

        return result.get("id")

    except Exception as e:
        print(f"Failed to create calendar event: {e}")
        return None


def route_to_sheet(client, sheet_id: str, item_id: str, data: dict, captured_at: str) -> tuple[str, Optional[str]]:
    """
    Route processed item to the correct sheet tab.
    Returns (tab_name, calendar_event_id or None).
    """
    spreadsheet = client.open_by_key(sheet_id)
    item_type = data.get("item_type", "Task")
    calendar_event_id = None

    if item_type == "Event":
        # Create calendar event if there's a date
        if data.get("due_date"):
            calendar_event_id = create_calendar_event(data)

        worksheet = spreadsheet.worksheet(SHEET_TABS["events"])
        row = to_event_row(item_id, data, captured_at, calendar_event_id or "")
        worksheet.append_row(row, value_input_option="USER_ENTERED")
        return "Events", calendar_event_id

    elif item_type == "Task":
        worksheet = spreadsheet.worksheet(SHEET_TABS["tasks"])
        row = to_task_row(item_id, data, captured_at)
        worksheet.append_row(row, value_input_option="USER_ENTERED")
        return "Tasks", None

    elif item_type == "Idea":
        worksheet = spreadsheet.worksheet(SHEET_TABS["ideas"])
        row = to_idea_row(item_id, data, captured_at)
        worksheet.append_row(row, value_input_option="USER_ENTERED")
        return "Ideas", None

    elif item_type == "Reference":
        worksheet = spreadsheet.worksheet(SHEET_TABS["reference"])
        row = to_reference_row(item_id, data, captured_at)
        worksheet.append_row(row, value_input_option="USER_ENTERED")
        return "Reference", None

    return "Unknown", None


def mark_inbox_processed(client, sheet_id: str, item_id: str):
    """Mark an inbox item as processed."""
    try:
        spreadsheet = client.open_by_key(sheet_id)
        inbox = spreadsheet.worksheet(SHEET_TABS["inbox"])
        all_rows = inbox.get_all_values()

        for i, row in enumerate(all_rows[1:], start=2):
            if row[0] == item_id:
                inbox.update_cell(i, 4, "TRUE")
                return
    except Exception as e:
        print(f"Failed to mark inbox processed: {e}")


def format_summary(data: dict, calendar_created: bool) -> str:
    """Format a nice summary for display in notifications."""
    item_type = data.get("item_type", "Item")
    description = data.get("description", "")
    category = data.get("category", "")
    urgency = data.get("urgency", "MEDIUM")
    due_date = data.get("due_date")
    due_time = data.get("due_time")
    location = data.get("location")

    type_emoji = {
        "Task": "✅",
        "Event": "📅",
        "Idea": "💡",
        "Reference": "📌"
    }.get(item_type, "📝")

    urgency_text = {
        "HIGH": "🔴 High",
        "MEDIUM": "🟡 Medium",
        "LOW": "🟢 Low"
    }.get(urgency, urgency)

    lines = [f"{type_emoji} {description}"]

    if due_date:
        try:
            date_obj = datetime.strptime(due_date, "%Y-%m-%d")
            date_str = date_obj.strftime("%a %b %d")
            if due_time:
                time_obj = datetime.strptime(due_time, "%H:%M")
                time_str = time_obj.strftime("%-I:%M %p")
                lines.append(f"{date_str} at {time_str}")
            else:
                lines.append(date_str)
        except ValueError:
            if due_time:
                lines.append(f"{due_date} at {due_time}")
            else:
                lines.append(due_date)

    if location:
        lines.append(f"📍 {location}")

    lines.append(f"🏷️ {category} | {urgency_text}")

    if calendar_created:
        lines.append("✅ Added to calendar")

    return "\n".join(lines)


@functions_framework.http
def capture(request: Request):
    """HTTP Cloud Function for capturing and processing phone notes."""

    # Handle CORS preflight
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        return add_cors_headers(response)

    if request.method != "POST":
        response = jsonify({"success": False, "error": "Method not allowed. Use POST."})
        response.status_code = 405
        return add_cors_headers(response)

    if not verify_api_key(request):
        response = jsonify({"success": False, "error": "Unauthorized."})
        response.status_code = 401
        return add_cors_headers(response)

    # Parse request
    try:
        request_json = request.get_json(silent=True)
        if not request_json:
            raise ValueError("No JSON body provided")
        text = request_json.get("text", "").strip()
        if not text:
            raise ValueError("Missing or empty 'text' field")
    except Exception as e:
        response = jsonify({"success": False, "error": f"Invalid request: {str(e)}"})
        response.status_code = 400
        return add_cors_headers(response)

    # Generate IDs and timestamps
    row_id = str(uuid.uuid4())
    captured_at = datetime.now().isoformat()

    # Get sheet ID
    sheet_id = os.environ.get("GOOGLE_SHEET_ID")
    if not sheet_id:
        response = jsonify({"success": False, "error": "GOOGLE_SHEET_ID not configured"})
        response.status_code = 500
        return add_cors_headers(response)

    # Step 1: Save to Inbox
    try:
        client = get_sheets_client()
        spreadsheet = client.open_by_key(sheet_id)
        inbox = spreadsheet.worksheet(SHEET_TABS["inbox"])
        inbox.append_row(
            [row_id, text, captured_at, "FALSE"],
            value_input_option="USER_ENTERED"
        )
    except Exception as e:
        response = jsonify({"success": False, "error": f"Failed to save to inbox: {str(e)}"})
        response.status_code = 500
        return add_cors_headers(response)

    # Step 2: Process with Gemini AI
    processed_data = process_with_gemini(text)

    # If AI processing failed, return basic response
    if not processed_data:
        result = {
            "success": True,
            "id": row_id,
            "processed": {
                "type": None,
                "description": text,
                "calendar_created": False,
                "summary": "📥 Saved to inbox\nWill be processed later"
            }
        }
        response = jsonify(result)
        return add_cors_headers(response)

    # Validate category
    if processed_data.get("category") not in CATEGORIES:
        processed_data["category"] = "Personal"

    # Step 3 & 4: Route to correct tab and create calendar event
    try:
        tab_name, calendar_event_id = route_to_sheet(
            client, sheet_id, row_id, processed_data, captured_at
        )
        calendar_created = calendar_event_id is not None
    except Exception as e:
        print(f"Routing failed: {e}")
        tab_name = "Error"
        calendar_created = False

    # Step 5: Mark inbox as processed
    mark_inbox_processed(client, sheet_id, row_id)

    # Step 6: Build response
    result = {
        "success": True,
        "id": row_id,
        "processed": {
            "type": processed_data.get("item_type"),
            "description": processed_data.get("description"),
            "due_date": processed_data.get("due_date"),
            "due_time": processed_data.get("due_time"),
            "urgency": processed_data.get("urgency"),
            "category": processed_data.get("category"),
            "location": processed_data.get("location"),
            "people": processed_data.get("people", []),
            "routed_to": tab_name,
            "calendar_created": calendar_created,
            "needs_clarification": processed_data.get("needs_clarification", False),
            "clarification_questions": processed_data.get("clarification_questions", []),
            "summary": format_summary(processed_data, calendar_created)
        }
    }

    response = jsonify(result)
    return add_cors_headers(response)
