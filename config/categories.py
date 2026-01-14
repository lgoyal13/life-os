"""
Life OS Category Definitions

Central source of truth for all categories, subcategories, and enums.
"""

from typing import Final

# Top-level categories for all items
CATEGORIES: Final[list[str]] = [
    "Car",
    "Personal",
    "Family",
    "Finance",
    "Health",
    "Home",
    "Work",
    "Recruiting",
    "Travel",
    "Ideas",
    "Reference",
]

# Subcategories (only used for Ideas category)
IDEA_SUBCATEGORIES: Final[list[str]] = [
    "Books",
    "Movies",
    "TV",
    "Restaurants",
    "Articles",
    "Gifts",
    "Products",
    "Places",
    "Activities",
    "Random",
]

# Known people in Aditya's life (for AI context)
# Format: name -> relationship description
KNOWN_PEOPLE: Final[dict[str, str]] = {
    "Dad": "father",
    "Mom": "mother",
    "Anjali": "girlfriend",
    "Dobby": "dog",
}

# Item types
ITEM_TYPES: Final[list[str]] = [
    "Task",
    "Event",
    "Idea",
    "Reference",
]

# Urgency levels
URGENCY_LEVELS: Final[list[str]] = [
    "HIGH",
    "MEDIUM",
    "LOW",
]

# Item statuses
ITEM_STATUSES: Final[list[str]] = [
    "pending",
    "in_progress",
    "completed",
    "cancelled",
]

# Calendar actions (from AI processing)
CALENDAR_ACTIONS: Final[list[str]] = [
    "CREATE_EVENT",
    "CREATE_REMINDER",
    "NONE",
]

# Sheet tab names
SHEET_TABS: Final[dict[str, str]] = {
    "inbox": "Inbox",
    "tasks": "Tasks",
    "events": "Events",
    "ideas": "Ideas",
    "reference": "Reference",
}

# Column definitions for each sheet tab
# These match the Google Sheet structure in TECHNICAL_SPEC.md

INBOX_COLUMNS: Final[list[str]] = [
    "id",
    "raw_text",
    "captured_at",
    "processed",
]

TASKS_COLUMNS: Final[list[str]] = [
    "id",
    "description",
    "category",
    "subcategory",
    "people",
    "due_date",
    "urgency",
    "consequence",
    "status",
    "notes",
    "calendar_event_id",
    "captured_at",
]

EVENTS_COLUMNS: Final[list[str]] = [
    "id",
    "description",
    "category",
    "people",
    "event_date",
    "event_time",
    "location",
    "urgency",
    "consequence",
    "calendar_event_id",
    "captured_at",
]

IDEAS_COLUMNS: Final[list[str]] = [
    "id",
    "description",
    "category",
    "subcategory",
    "people",
    "source",
    "links",
    "notes",
    "captured_at",
]

REFERENCE_COLUMNS: Final[list[str]] = [
    "id",
    "description",
    "pointer",
    "category",
    "captured_at",
]
