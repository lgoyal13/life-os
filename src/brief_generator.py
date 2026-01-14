"""
Life OS Daily Brief Generator

Generates morning and night briefs from processed items.
"""

import logging
import os
from datetime import date, datetime, timedelta
from typing import Optional

from dotenv import load_dotenv

from src.models import DailyBrief, ProcessedItem
from src.sheets_client import SheetsClient

load_dotenv()

logger = logging.getLogger(__name__)


class BriefGenerator:
    """
    Generates daily briefs (morning and night) from Life OS data.
    """

    def __init__(self, sheets_client: Optional[SheetsClient] = None):
        """
        Initialize the brief generator.

        Args:
            sheets_client: Google Sheets client (creates one if not provided)
        """
        self.sheets_client = sheets_client or self._create_sheets_client()

    def _create_sheets_client(self) -> SheetsClient:
        """Create a sheets client from environment variables."""
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        credentials_path = os.getenv("GOOGLE_CREDENTIALS_PATH", "./credentials.json")

        if not sheet_id:
            raise ValueError("GOOGLE_SHEET_ID not set")

        return SheetsClient(sheet_id=sheet_id, credentials_path=credentials_path)

    def generate_morning_brief(self, target_date: Optional[date] = None) -> str:
        """
        Generate the morning brief.

        Args:
            target_date: The date to generate the brief for (defaults to today)

        Returns:
            Formatted brief as a string
        """
        if target_date is None:
            target_date = date.today()

        logger.info(f"Generating morning brief for {target_date}")

        # Gather data
        today_events = self.sheets_client.get_events_for_date(target_date)
        today_tasks = self.sheets_client.get_tasks_due_by(target_date)
        high_priority = self.sheets_client.get_high_urgency_items()

        # Build brief
        brief = DailyBrief(
            brief_type="morning",
            today_events=today_events,
            today_tasks=today_tasks,
            high_priority=high_priority,
            focus_items=self._generate_focus_items(today_events, today_tasks, high_priority),
        )

        return self._format_morning_brief(brief, target_date)

    def generate_night_brief(self, target_date: Optional[date] = None) -> str:
        """
        Generate the night brief.

        Args:
            target_date: The date to generate the brief for (defaults to today)

        Returns:
            Formatted brief as a string
        """
        if target_date is None:
            target_date = date.today()

        tomorrow = target_date + timedelta(days=1)
        week_end = target_date + timedelta(days=7)

        logger.info(f"Generating night brief for {target_date}")

        # Gather data
        tomorrow_events = self.sheets_client.get_events_for_date(tomorrow)
        this_week = self.sheets_client.get_items_due_between(tomorrow, week_end)
        stale_items = self.sheets_client.get_stale_inbox_items(days=3)
        needs_clarification = self.sheets_client.get_items_needing_clarification()
        upcoming_consequences = self.sheets_client.get_items_with_consequences_soon(days=14)

        # Build brief
        brief = DailyBrief(
            brief_type="night",
            tomorrow_events=tomorrow_events,
            this_week=this_week,
            stale_items=[],  # Convert InboxItems to ProcessedItems if needed
            needs_clarification=needs_clarification,
            upcoming_consequences=upcoming_consequences,
            suggestions=self._generate_suggestions(tomorrow_events, this_week, upcoming_consequences),
        )

        return self._format_night_brief(brief, target_date, tomorrow)

    def _generate_focus_items(
        self,
        events: list[ProcessedItem],
        tasks: list[ProcessedItem],
        high_priority: list[ProcessedItem],
    ) -> list[str]:
        """Generate 1-3 focus items for the morning brief."""
        focus = []

        # High priority items first
        for item in high_priority[:2]:
            if item.consequence:
                focus.append(f"{item.description} — {item.consequence}")
            else:
                focus.append(item.description)

        # Add most important event if not already covered
        if events and len(focus) < 3:
            event = events[0]
            if event.id not in [i.id for i in high_priority[:2]]:
                focus.append(event.description)

        # Add most urgent task if not already covered
        if tasks and len(focus) < 3:
            task = tasks[0]
            if task.id not in [i.id for i in high_priority[:2]]:
                focus.append(task.description)

        return focus[:3]

    def _generate_suggestions(
        self,
        tomorrow_events: list[ProcessedItem],
        this_week: list[ProcessedItem],
        consequences: list[ProcessedItem],
    ) -> list[str]:
        """Generate 2-3 suggestions for the night brief."""
        suggestions = []

        # Items with consequences are highest priority
        for item in consequences[:2]:
            suggestions.append(f"Handle {item.description} — {item.consequence}")

        # Then this week's items
        for item in this_week[:3]:
            if item.id not in [c.id for c in consequences[:2]]:
                suggestions.append(f"Work on {item.description}")
                if len(suggestions) >= 3:
                    break

        return suggestions[:3]

    def _format_morning_brief(self, brief: DailyBrief, target_date: date) -> str:
        """Format the morning brief as text."""
        day_name = target_date.strftime("%A")
        month_day = target_date.strftime("%B %d")

        lines = [
            f"☀️ MORNING BRIEF — {day_name}, {month_day}",
            "━" * 50,
            "",
            "TODAY'S SCHEDULE",
            "─" * 16,
        ]

        # Events
        if brief.today_events:
            for event in brief.today_events:
                time_str = self._format_time(event.due_time)
                lines.append(f"{time_str} — {event.description}")
                if event.location:
                    lines.append(f"         📍 {event.location}")
                if event.urgency == "HIGH" and event.consequence:
                    lines.append(f"         ⚠️ {event.consequence}")
                lines.append("")
        else:
            lines.append("Nothing scheduled. Open day.")
            lines.append("")

        lines.append("")
        lines.append("MUST DO TODAY")
        lines.append("─" * 13)

        # High urgency items
        high_items = [i for i in brief.high_priority if i.urgency == "HIGH"]
        for item in high_items:
            lines.append(f"🚨 {item.description}")
            if item.consequence:
                lines.append(f"   {item.consequence}")
            lines.append("")

        # Other tasks due today
        other_tasks = [t for t in brief.today_tasks if t.id not in [h.id for h in high_items]]
        for task in other_tasks:
            lines.append(f"□ {task.description}")
            if task.notes:
                lines.append(f"  {task.notes[:60]}")
            lines.append("")

        if not high_items and not other_tasks:
            lines.append("No deadlines today.")
            lines.append("")

        lines.append("")
        lines.append("🎯 TODAY'S FOCUS")
        lines.append("─" * 16)
        lines.append("Based on what's on your plate, here's what matters most:")
        lines.append("")

        for i, focus in enumerate(brief.focus_items, 1):
            lines.append(f"{i}. {focus}")

        if not brief.focus_items:
            lines.append("1. Enjoy your open day!")

        lines.append("")
        lines.append("━" * 50)
        lines.append("Have a good day.")

        return "\n".join(lines)

    def _format_night_brief(
        self, brief: DailyBrief, target_date: date, tomorrow: date
    ) -> str:
        """Format the night brief as text."""
        day_name = target_date.strftime("%A")
        month_day = target_date.strftime("%B %d")
        tomorrow_name = tomorrow.strftime("%A")
        tomorrow_month_day = tomorrow.strftime("%B %d")

        lines = [
            f"🌙 NIGHT BRIEF — {day_name}, {month_day}",
            "━" * 50,
            "",
            "TOMORROW",
            "─" * 8,
            f"{tomorrow_name}, {tomorrow_month_day}",
            "",
        ]

        # Tomorrow's events
        if brief.tomorrow_events:
            for event in brief.tomorrow_events:
                time_str = self._format_time(event.due_time)
                lines.append(f"{time_str} — {event.description}")
                if event.location:
                    lines.append(f"         📍 {event.location}")
                lines.append("")
        else:
            lines.append("Nothing scheduled tomorrow.")
            lines.append("")

        # This week
        if brief.this_week:
            lines.append("")
            lines.append("THIS WEEK")
            lines.append("─" * 9)

            # Group by date
            by_date = {}
            for item in brief.this_week:
                if item.due_date:
                    if item.due_date not in by_date:
                        by_date[item.due_date] = []
                    by_date[item.due_date].append(item)

            for d in sorted(by_date.keys()):
                day_label = d.strftime("%A (%b %d)")
                lines.append(f"{day_label}")
                for item in by_date[d]:
                    urgency_marker = " 🚨" if item.urgency == "HIGH" else ""
                    lines.append(f"  • {item.description}{urgency_marker}")
                    if item.consequence:
                        lines.append(f"    {item.consequence}")
                lines.append("")

        # Needs clarification
        if brief.needs_clarification:
            lines.append("")
            lines.append("NEEDS YOUR INPUT")
            lines.append("─" * 16)
            for item in brief.needs_clarification:
                lines.append(f'You said: "{item.raw_text[:60]}..."')
                for q in item.clarification_questions:
                    lines.append(f"→ {q}")
                lines.append("")

        # Consequences approaching
        if brief.upcoming_consequences:
            lines.append("")
            lines.append("HEADS UP — CONSEQUENCES APPROACHING")
            lines.append("─" * 35)
            for item in brief.upcoming_consequences:
                lines.append(f"⚠️ {item.description}")
                if item.due_date:
                    lines.append(f"   Due: {item.due_date.strftime('%B %d')}")
                if item.consequence:
                    lines.append(f"   If you don't: {item.consequence}")
                lines.append("")

        # Suggestions
        lines.append("")
        lines.append("CONSIDER FOR TOMORROW")
        lines.append("─" * 21)
        lines.append("Based on your week and what's coming up:")
        lines.append("")

        for i, suggestion in enumerate(brief.suggestions, 1):
            lines.append(f"{i}. {suggestion}")

        if not brief.suggestions:
            lines.append("1. Rest up — tomorrow looks manageable!")

        lines.append("")
        lines.append("━" * 50)
        lines.append("Rest well. Tomorrow's got a plan.")

        return "\n".join(lines)

    def _format_time(self, t) -> str:
        """Format a time object as 12-hour string."""
        if t is None:
            return "TBD"
        hour = t.hour
        minute = t.minute
        am_pm = "AM" if hour < 12 else "PM"
        if hour == 0:
            hour = 12
        elif hour > 12:
            hour -= 12
        if minute == 0:
            return f"{hour} {am_pm}"
        return f"{hour}:{minute:02d} {am_pm}"


def generate_brief(brief_type: str = "morning"):
    """
    Command-line entry point for generating briefs.

    Args:
        brief_type: "morning" or "night"
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    generator = BriefGenerator()

    if brief_type == "morning":
        brief = generator.generate_morning_brief()
    elif brief_type == "night":
        brief = generator.generate_night_brief()
    else:
        raise ValueError(f"Unknown brief type: {brief_type}. Use 'morning' or 'night'")

    print(brief)
    return brief


if __name__ == "__main__":
    import sys
    brief_type = sys.argv[1] if len(sys.argv) > 1 else "morning"
    generate_brief(brief_type)
