"""
Life OS Google Calendar Client

Handles creating, updating, and deleting Google Calendar events.
"""

import logging
import os
from datetime import datetime, time, timedelta
from typing import Optional

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from src.models import ProcessedItem

logger = logging.getLogger(__name__)

# Scopes required for calendar access
SCOPES = ["https://www.googleapis.com/auth/calendar"]


class CalendarClientError(Exception):
    """Base exception for calendar client errors."""
    pass


class CalendarClient:
    """
    Google Calendar client for Life OS.

    Creates events with smart reminders based on urgency and item type.
    """

    def __init__(
        self,
        credentials_path: Optional[str] = None,
        calendar_id: Optional[str] = None,
        timezone: Optional[str] = None,
    ):
        """
        Initialize the calendar client.

        Args:
            credentials_path: Path to service account credentials JSON
            calendar_id: Google Calendar ID (use "primary" for main calendar)
            timezone: Timezone for events (e.g., "America/Los_Angeles")
        """
        self.credentials_path = credentials_path or os.getenv(
            "GOOGLE_CREDENTIALS_PATH", "./credentials.json"
        )
        self.calendar_id = calendar_id or os.getenv("GOOGLE_CALENDAR_ID", "primary")
        self.timezone = timezone or os.getenv("TIMEZONE", "America/Los_Angeles")

        self._service = None

    def _get_service(self):
        """Get or create the Calendar API service."""
        if self._service is None:
            try:
                credentials = service_account.Credentials.from_service_account_file(
                    self.credentials_path, scopes=SCOPES
                )
                self._service = build("calendar", "v3", credentials=credentials)
            except FileNotFoundError:
                raise CalendarClientError(
                    f"Credentials file not found: {self.credentials_path}"
                )
            except Exception as e:
                raise CalendarClientError(f"Failed to initialize calendar service: {e}")

        return self._service

    def create_event(self, item: ProcessedItem) -> Optional[str]:
        """
        Create a Google Calendar event for the item.

        Args:
            item: The processed item to create an event for

        Returns:
            The created event ID, or None if creation failed
        """
        if not item.due_date:
            logger.warning("Cannot create event without due_date")
            return None

        service = self._get_service()

        # Build event body
        event = self._build_event_body(item)

        try:
            result = service.events().insert(
                calendarId=self.calendar_id,
                body=event
            ).execute()

            event_id = result.get("id")
            logger.info(f"Created calendar event: {event_id} - {item.description[:50]}")
            return event_id

        except HttpError as e:
            logger.error(f"Failed to create calendar event: {e}")
            raise CalendarClientError(f"Failed to create calendar event: {e}")

    def update_event(self, event_id: str, item: ProcessedItem) -> None:
        """
        Update an existing calendar event.

        Args:
            event_id: The Google Calendar event ID
            item: The updated item data
        """
        service = self._get_service()

        try:
            # Get existing event
            existing = service.events().get(
                calendarId=self.calendar_id,
                eventId=event_id
            ).execute()

            # Update fields
            event = self._build_event_body(item)
            existing.update(event)

            service.events().update(
                calendarId=self.calendar_id,
                eventId=event_id,
                body=existing
            ).execute()

            logger.info(f"Updated calendar event: {event_id}")

        except HttpError as e:
            logger.error(f"Failed to update calendar event: {e}")
            raise CalendarClientError(f"Failed to update calendar event: {e}")

    def delete_event(self, event_id: str) -> None:
        """
        Delete a calendar event.

        Args:
            event_id: The Google Calendar event ID
        """
        service = self._get_service()

        try:
            service.events().delete(
                calendarId=self.calendar_id,
                eventId=event_id
            ).execute()

            logger.info(f"Deleted calendar event: {event_id}")

        except HttpError as e:
            if e.resp.status == 404:
                logger.warning(f"Event {event_id} not found, may have been deleted")
            else:
                logger.error(f"Failed to delete calendar event: {e}")
                raise CalendarClientError(f"Failed to delete calendar event: {e}")

    def _build_event_body(self, item: ProcessedItem) -> dict:
        """
        Build the event body for the Google Calendar API.

        Args:
            item: The processed item

        Returns:
            Dictionary suitable for Calendar API
        """
        # Determine start and end times
        start_time = item.due_time or time(9, 0)  # Default to 9 AM
        start_datetime = datetime.combine(item.due_date, start_time)

        # Events default to 1 hour, tasks/reminders to 30 min
        if item.item_type == "Event":
            duration = timedelta(hours=1)
        else:
            duration = timedelta(minutes=30)

        end_datetime = start_datetime + duration

        # Build description
        description_parts = []
        if item.category:
            description_parts.append(f"Category: {item.category}")
        if item.consequence:
            description_parts.append(f"Consequence: {item.consequence}")
        if item.notes:
            description_parts.append(f"Notes: {item.notes}")
        if item.needs_clarification:
            description_parts.append("⚠️ Needs clarification")

        description = "\n".join(description_parts)

        # Build event
        event = {
            "summary": item.description,
            "description": description,
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

        # Add location if present
        if item.location:
            event["location"] = item.location

        return event

    def _calculate_reminders(self, item: ProcessedItem) -> list[dict]:
        """
        Calculate reminder times based on urgency and item type.

        Args:
            item: The processed item

        Returns:
            List of reminder overrides for Calendar API
        """
        reminders = []

        if item.urgency == "HIGH":
            # HIGH urgency: multiple reminders
            reminders = [
                {"method": "popup", "minutes": 10080},  # 1 week before
                {"method": "popup", "minutes": 1440},   # 1 day before
                {"method": "popup", "minutes": 60},     # 1 hour before
            ]

        elif item.urgency == "MEDIUM":
            # MEDIUM urgency: standard reminders
            reminders = [
                {"method": "popup", "minutes": 4320},   # 3 days before
                {"method": "popup", "minutes": 1440},   # 1 day before
            ]

        else:  # LOW
            # LOW urgency: minimal reminders
            reminders = [
                {"method": "popup", "minutes": 60},     # 1 hour before
            ]

        # Add travel buffer for appointments with location
        if item.location and item.item_type == "Event":
            reminders.append({"method": "popup", "minutes": 120})  # 2 hours before

        # If item has consequence, add extra reminder
        if item.consequence:
            if {"method": "popup", "minutes": 10080} not in reminders:
                reminders.append({"method": "popup", "minutes": 10080})  # 1 week

        # Deduplicate and limit to 5 reminders (Calendar API limit)
        seen = set()
        unique_reminders = []
        for r in reminders:
            key = r["minutes"]
            if key not in seen:
                seen.add(key)
                unique_reminders.append(r)

        return unique_reminders[:5]

    def get_events_for_date(self, target_date) -> list[dict]:
        """
        Get all events for a specific date.

        Args:
            target_date: The date to query

        Returns:
            List of event dictionaries
        """
        service = self._get_service()

        # Build time range for the day
        start_of_day = datetime.combine(target_date, time.min)
        end_of_day = datetime.combine(target_date, time.max)

        try:
            result = service.events().list(
                calendarId=self.calendar_id,
                timeMin=start_of_day.isoformat() + "Z",
                timeMax=end_of_day.isoformat() + "Z",
                singleEvents=True,
                orderBy="startTime"
            ).execute()

            return result.get("items", [])

        except HttpError as e:
            logger.error(f"Failed to get events: {e}")
            return []

    def test_connection(self) -> bool:
        """
        Test the connection to Google Calendar.

        Returns:
            True if connection successful
        """
        try:
            service = self._get_service()
            calendar = service.calendars().get(
                calendarId=self.calendar_id
            ).execute()
            logger.info(f"Connected to calendar: {calendar.get('summary', 'Unknown')}")
            return True
        except Exception as e:
            logger.error(f"Calendar connection test failed: {e}")
            return False
