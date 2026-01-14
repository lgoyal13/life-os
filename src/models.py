"""
Life OS Data Models

Pydantic models for all data types in the Life OS system.
Includes serialization helpers for Google Sheets integration.
"""

from datetime import date, datetime, time
from typing import Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator, model_validator

from config.categories import (
    CATEGORIES,
    IDEA_SUBCATEGORIES,
    ITEM_STATUSES,
    ITEM_TYPES,
    URGENCY_LEVELS,
)


# Type aliases for clarity
ItemType = Literal["Task", "Event", "Idea", "Reference"]
UrgencyLevel = Literal["HIGH", "MEDIUM", "LOW"]
ItemStatus = Literal["pending", "in_progress", "completed", "cancelled"]
CalendarAction = Literal["CREATE_EVENT", "CREATE_REMINDER", "NONE"]
BriefType = Literal["morning", "night"]


def generate_id() -> str:
    """Generate a unique ID for new items."""
    return str(uuid4())


class ReminderTime(BaseModel):
    """A single reminder with date, time, and reason."""

    date: date
    time: time
    reason: str

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "date": self.date.isoformat(),
            "time": self.time.isoformat(),
            "reason": self.reason,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ReminderTime":
        """Create from dictionary (e.g., from JSON)."""
        return cls(
            date=date.fromisoformat(data["date"]),
            time=time.fromisoformat(data["time"]),
            reason=data["reason"],
        )


class SubTask(BaseModel):
    """A sub-task extracted from a main item."""

    description: str
    due: Optional[str] = None  # Can be date or relative like "day before"
    urgency: UrgencyLevel = "MEDIUM"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "description": self.description,
            "due": self.due,
            "urgency": self.urgency,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "SubTask":
        """Create from dictionary."""
        return cls(
            description=data["description"],
            due=data.get("due"),
            urgency=data.get("urgency", "MEDIUM"),
        )


class InboxItem(BaseModel):
    """
    Raw capture from user input before AI processing.
    This is what lands in the Inbox tab from the Apple Shortcut.
    """

    id: str = Field(default_factory=generate_id)
    raw_text: str
    captured_at: datetime = Field(default_factory=datetime.now)
    processed: bool = False
    processed_at: Optional[datetime] = None

    def to_sheet_row(self) -> list[str]:
        """Convert to a row for Google Sheets Inbox tab."""
        return [
            self.id,
            self.raw_text,
            self.captured_at.isoformat(),
            str(self.processed).upper(),  # TRUE/FALSE for Sheets
        ]

    @classmethod
    def from_sheet_row(cls, row: list[str]) -> "InboxItem":
        """Create from a Google Sheets row."""
        return cls(
            id=row[0],
            raw_text=row[1],
            captured_at=datetime.fromisoformat(row[2]),
            processed=row[3].upper() == "TRUE" if row[3] else False,
        )


class ProcessedItem(BaseModel):
    """
    Item after AI extraction with full structure.
    This is the main data model used throughout the system.
    """

    # Identity
    id: str = Field(default_factory=generate_id)
    raw_text: str

    # Core classification
    item_type: ItemType
    description: str
    category: str
    subcategory: Optional[str] = None
    people: list[str] = Field(default_factory=list)

    # Time-related
    due_date: Optional[date] = None
    due_time: Optional[time] = None
    reminders: list[ReminderTime] = Field(default_factory=list)

    # Priority
    urgency: UrgencyLevel = "MEDIUM"
    consequence: Optional[str] = None

    # Metadata
    source: Optional[str] = None  # Who recommended, where from
    location: Optional[str] = None  # Physical location
    links: list[str] = Field(default_factory=list)
    notes: Optional[str] = None

    # Clarification
    needs_clarification: bool = False
    clarification_questions: list[str] = Field(default_factory=list)

    # Status
    status: ItemStatus = "pending"

    # Timestamps
    captured_at: datetime = Field(default_factory=datetime.now)
    processed_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None

    # Calendar integration
    calendar_event_id: Optional[str] = None
    calendar_action: CalendarAction = "NONE"

    # Sub-tasks (for complex items)
    sub_tasks: list[SubTask] = Field(default_factory=list)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        """Ensure category is valid."""
        if v not in CATEGORIES:
            raise ValueError(f"Invalid category: {v}. Must be one of {CATEGORIES}")
        return v

    @model_validator(mode="after")
    def validate_subcategory(self) -> "ProcessedItem":
        """Ensure subcategory is only set for Ideas and is valid."""
        if self.subcategory:
            if self.category != "Ideas":
                raise ValueError("Subcategory can only be set for Ideas category")
            if self.subcategory not in IDEA_SUBCATEGORIES:
                raise ValueError(
                    f"Invalid subcategory: {self.subcategory}. "
                    f"Must be one of {IDEA_SUBCATEGORIES}"
                )
        return self

    def to_task_row(self) -> list[str]:
        """Convert to a row for Google Sheets Tasks tab."""
        return [
            self.id,
            self.description,
            self.category,
            self.subcategory or "",
            ",".join(self.people),
            self.due_date.isoformat() if self.due_date else "",
            self.urgency,
            self.consequence or "",
            self.status,
            self.notes or "",
            self.calendar_event_id or "",
            self.captured_at.isoformat(),
        ]

    def to_event_row(self) -> list[str]:
        """Convert to a row for Google Sheets Events tab."""
        return [
            self.id,
            self.description,
            self.category,
            ",".join(self.people),
            self.due_date.isoformat() if self.due_date else "",
            self.due_time.isoformat() if self.due_time else "",
            self.location or "",
            self.urgency,
            self.consequence or "",
            self.calendar_event_id or "",
            self.captured_at.isoformat(),
        ]

    def to_idea_row(self) -> list[str]:
        """Convert to a row for Google Sheets Ideas tab."""
        return [
            self.id,
            self.description,
            self.category,
            self.subcategory or "",
            ",".join(self.people),
            self.source or "",
            ",".join(self.links),
            self.notes or "",
            self.captured_at.isoformat(),
        ]

    def to_reference_row(self) -> list[str]:
        """Convert to a row for Google Sheets Reference tab."""
        return [
            self.id,
            self.description,
            self.location or "",  # 'pointer' column in sheet
            self.category,
            self.captured_at.isoformat(),
        ]

    @classmethod
    def from_task_row(cls, row: list[str]) -> "ProcessedItem":
        """Create a Task from a Google Sheets row."""
        return cls(
            id=row[0],
            raw_text="",  # Not stored in Tasks tab
            item_type="Task",
            description=row[1],
            category=row[2],
            subcategory=row[3] if row[3] else None,
            people=row[4].split(",") if row[4] else [],
            due_date=date.fromisoformat(row[5]) if row[5] else None,
            urgency=row[6] if row[6] else "MEDIUM",
            consequence=row[7] if row[7] else None,
            status=row[8] if row[8] else "pending",
            notes=row[9] if row[9] else None,
            calendar_event_id=row[10] if row[10] else None,
            captured_at=datetime.fromisoformat(row[11]) if row[11] else datetime.now(),
        )

    @classmethod
    def from_event_row(cls, row: list[str]) -> "ProcessedItem":
        """Create an Event from a Google Sheets row."""
        return cls(
            id=row[0],
            raw_text="",
            item_type="Event",
            description=row[1],
            category=row[2],
            people=row[3].split(",") if row[3] else [],
            due_date=date.fromisoformat(row[4]) if row[4] else None,
            due_time=time.fromisoformat(row[5]) if row[5] else None,
            location=row[6] if row[6] else None,
            urgency=row[7] if row[7] else "MEDIUM",
            consequence=row[8] if row[8] else None,
            calendar_event_id=row[9] if row[9] else None,
            captured_at=datetime.fromisoformat(row[10]) if row[10] else datetime.now(),
        )

    @classmethod
    def from_idea_row(cls, row: list[str]) -> "ProcessedItem":
        """Create an Idea from a Google Sheets row."""
        return cls(
            id=row[0],
            raw_text="",
            item_type="Idea",
            description=row[1],
            category=row[2],
            subcategory=row[3] if row[3] else None,
            people=row[4].split(",") if row[4] else [],
            source=row[5] if row[5] else None,
            links=row[6].split(",") if row[6] else [],
            notes=row[7] if row[7] else None,
            captured_at=datetime.fromisoformat(row[8]) if row[8] else datetime.now(),
        )

    @classmethod
    def from_reference_row(cls, row: list[str]) -> "ProcessedItem":
        """Create a Reference from a Google Sheets row."""
        return cls(
            id=row[0],
            raw_text="",
            item_type="Reference",
            description=row[1],
            location=row[2] if row[2] else None,  # 'pointer' column
            category=row[3],
            captured_at=datetime.fromisoformat(row[4]) if row[4] else datetime.now(),
        )


class DailyBrief(BaseModel):
    """
    Generated daily brief (morning or night).
    Contains aggregated items for the brief.
    """

    brief_type: BriefType
    generated_at: datetime = Field(default_factory=datetime.now)

    # Morning brief sections
    today_events: list[ProcessedItem] = Field(default_factory=list)
    today_tasks: list[ProcessedItem] = Field(default_factory=list)
    high_priority: list[ProcessedItem] = Field(default_factory=list)
    focus_items: list[str] = Field(default_factory=list)

    # Night brief additional sections
    tomorrow_events: list[ProcessedItem] = Field(default_factory=list)
    this_week: list[ProcessedItem] = Field(default_factory=list)
    stale_items: list[ProcessedItem] = Field(default_factory=list)
    needs_clarification: list[ProcessedItem] = Field(default_factory=list)
    upcoming_consequences: list[ProcessedItem] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


# AI Response model (what we expect back from Claude)
class AIExtractionResponse(BaseModel):
    """
    Expected response format from Claude AI extraction.
    Maps to the JSON schema in AI_PROMPT_SPEC.md.
    """

    item_type: ItemType
    description: str
    category: str
    subcategory: Optional[str] = None
    people: list[str] = Field(default_factory=list)
    due_date: Optional[str] = None  # YYYY-MM-DD format
    due_time: Optional[str] = None  # HH:MM format
    reminders: list[dict] = Field(default_factory=list)
    urgency: UrgencyLevel = "MEDIUM"
    consequence: Optional[str] = None
    source: Optional[str] = None
    location: Optional[str] = None
    links: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    needs_clarification: bool = False
    clarification_questions: list[str] = Field(default_factory=list)
    sub_tasks: list[dict] = Field(default_factory=list)
    calendar_action: CalendarAction = "NONE"

    def to_processed_item(
        self, raw_text: str, captured_at: datetime
    ) -> ProcessedItem:
        """Convert AI response to a ProcessedItem."""
        return ProcessedItem(
            raw_text=raw_text,
            item_type=self.item_type,
            description=self.description,
            category=self.category,
            subcategory=self.subcategory,
            people=self.people,
            due_date=date.fromisoformat(self.due_date) if self.due_date else None,
            due_time=time.fromisoformat(self.due_time) if self.due_time else None,
            reminders=[ReminderTime.from_dict(r) for r in self.reminders],
            urgency=self.urgency,
            consequence=self.consequence,
            source=self.source,
            location=self.location,
            links=self.links,
            notes=self.notes,
            needs_clarification=self.needs_clarification,
            clarification_questions=self.clarification_questions,
            sub_tasks=[SubTask.from_dict(s) for s in self.sub_tasks],
            calendar_action=self.calendar_action,
            captured_at=captured_at,
            processed_at=datetime.now(),
        )
