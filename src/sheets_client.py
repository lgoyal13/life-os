"""
Life OS Google Sheets Client

Handles all CRUD operations with Google Sheets using gspread.
"""

import logging
import time as time_module
from datetime import date, datetime, timedelta
from typing import Optional

import gspread
from gspread.exceptions import APIError, SpreadsheetNotFound, WorksheetNotFound

from config.categories import (
    EVENTS_COLUMNS,
    IDEAS_COLUMNS,
    INBOX_COLUMNS,
    REFERENCE_COLUMNS,
    SHEET_TABS,
    TASKS_COLUMNS,
)
from src.models import InboxItem, ProcessedItem

logger = logging.getLogger(__name__)


class SheetsClientError(Exception):
    """Base exception for Sheets client errors."""

    pass


class AuthenticationError(SheetsClientError):
    """Raised when authentication fails."""

    pass


class SheetNotFoundError(SheetsClientError):
    """Raised when the sheet or tab is not found."""

    pass


class SheetsClient:
    """
    Google Sheets client for Life OS.

    Handles reading from Inbox, writing to all tabs,
    and querying for daily briefs.
    """

    def __init__(
        self,
        sheet_id: str,
        credentials_path: str,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ):
        """
        Initialize the Sheets client.

        Args:
            sheet_id: Google Sheet ID (from URL)
            credentials_path: Path to service account credentials JSON
            max_retries: Number of retries for API errors
            retry_delay: Initial delay between retries (exponential backoff)
        """
        self.sheet_id = sheet_id
        self.credentials_path = credentials_path
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self._client: Optional[gspread.Client] = None
        self._spreadsheet: Optional[gspread.Spreadsheet] = None

    def _get_client(self) -> gspread.Client:
        """Get or create the gspread client."""
        if self._client is None:
            try:
                self._client = gspread.service_account(filename=self.credentials_path)
            except FileNotFoundError:
                raise AuthenticationError(
                    f"Credentials file not found: {self.credentials_path}\n"
                    "Please set up Google Cloud credentials. See docs/TECHNICAL_SPEC.md"
                )
            except Exception as e:
                raise AuthenticationError(f"Failed to authenticate: {e}")
        return self._client

    def _get_spreadsheet(self) -> gspread.Spreadsheet:
        """Get or create the spreadsheet reference."""
        if self._spreadsheet is None:
            client = self._get_client()
            try:
                self._spreadsheet = client.open_by_key(self.sheet_id)
            except SpreadsheetNotFound:
                raise SheetNotFoundError(
                    f"Spreadsheet not found: {self.sheet_id}\n"
                    "Make sure the sheet exists and is shared with the service account."
                )
        return self._spreadsheet

    def _get_worksheet(self, tab_name: str) -> gspread.Worksheet:
        """Get a worksheet by tab name."""
        spreadsheet = self._get_spreadsheet()
        try:
            return spreadsheet.worksheet(tab_name)
        except WorksheetNotFound:
            raise SheetNotFoundError(
                f"Tab '{tab_name}' not found in spreadsheet.\n"
                f"Please create the tab. Expected tabs: {list(SHEET_TABS.values())}"
            )

    def _retry_operation(self, operation, *args, **kwargs):
        """Execute an operation with retry logic."""
        last_exception = None
        for attempt in range(self.max_retries):
            try:
                return operation(*args, **kwargs)
            except APIError as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    delay = self.retry_delay * (2**attempt)
                    logger.warning(
                        f"API error (attempt {attempt + 1}/{self.max_retries}): {e}. "
                        f"Retrying in {delay}s..."
                    )
                    time_module.sleep(delay)
                else:
                    logger.error(f"API error after {self.max_retries} attempts: {e}")
        raise last_exception

    # =========================================================================
    # Inbox Operations
    # =========================================================================

    def get_unprocessed_items(self) -> list[InboxItem]:
        """
        Get all unprocessed items from the Inbox tab.

        Returns:
            List of InboxItem objects that haven't been processed yet.
        """
        worksheet = self._get_worksheet(SHEET_TABS["inbox"])
        all_rows = self._retry_operation(worksheet.get_all_values)

        if not all_rows or len(all_rows) < 2:
            return []

        items = []
        for row in all_rows[1:]:  # Skip header row
            if len(row) >= len(INBOX_COLUMNS):
                # Check if processed is FALSE
                if row[3].upper() != "TRUE":
                    try:
                        items.append(InboxItem.from_sheet_row(row))
                    except Exception as e:
                        logger.warning(f"Failed to parse inbox row: {row}. Error: {e}")

        return items

    def mark_processed(self, item_id: str, processed_at: Optional[datetime] = None) -> None:
        """
        Mark an inbox item as processed.

        Args:
            item_id: The ID of the item to mark
            processed_at: Optional timestamp (defaults to now)
        """
        worksheet = self._get_worksheet(SHEET_TABS["inbox"])
        all_rows = self._retry_operation(worksheet.get_all_values)

        for i, row in enumerate(all_rows[1:], start=2):  # Start at 2 (1-indexed, skip header)
            if row[0] == item_id:
                self._retry_operation(worksheet.update_cell, i, 4, "TRUE")
                logger.info(f"Marked item {item_id} as processed")
                return

        logger.warning(f"Item {item_id} not found in inbox")

    def mark_failed(self, item_id: str, error: str) -> None:
        """
        Mark an inbox item as failed (for debugging).

        Adds error message to the notes and leaves unprocessed.
        """
        worksheet = self._get_worksheet(SHEET_TABS["inbox"])
        all_rows = self._retry_operation(worksheet.get_all_values)

        for i, row in enumerate(all_rows[1:], start=2):
            if row[0] == item_id:
                # Add error to a notes column if it exists, otherwise log
                logger.error(f"Item {item_id} failed processing: {error}")
                return

        logger.warning(f"Item {item_id} not found in inbox")

    def get_stale_inbox_items(self, days: int = 3) -> list[InboxItem]:
        """
        Get inbox items that have been sitting unprocessed for too long.

        Args:
            days: Number of days to consider "stale"

        Returns:
            List of stale InboxItem objects
        """
        cutoff = datetime.now() - timedelta(days=days)
        items = self.get_unprocessed_items()
        return [item for item in items if item.captured_at < cutoff]

    # =========================================================================
    # Write Operations (Routing)
    # =========================================================================

    def add_to_tasks(self, item: ProcessedItem) -> None:
        """Add a processed item to the Tasks tab."""
        worksheet = self._get_worksheet(SHEET_TABS["tasks"])
        row = item.to_task_row()
        self._retry_operation(worksheet.append_row, row, value_input_option="USER_ENTERED")
        logger.info(f"Added task: {item.description[:50]}...")

    def add_to_events(self, item: ProcessedItem) -> None:
        """Add a processed item to the Events tab."""
        worksheet = self._get_worksheet(SHEET_TABS["events"])
        row = item.to_event_row()
        self._retry_operation(worksheet.append_row, row, value_input_option="USER_ENTERED")
        logger.info(f"Added event: {item.description[:50]}...")

    def add_to_ideas(self, item: ProcessedItem) -> None:
        """Add a processed item to the Ideas tab."""
        worksheet = self._get_worksheet(SHEET_TABS["ideas"])
        row = item.to_idea_row()
        self._retry_operation(worksheet.append_row, row, value_input_option="USER_ENTERED")
        logger.info(f"Added idea: {item.description[:50]}...")

    def add_to_reference(self, item: ProcessedItem) -> None:
        """Add a processed item to the Reference tab."""
        worksheet = self._get_worksheet(SHEET_TABS["reference"])
        row = item.to_reference_row()
        self._retry_operation(worksheet.append_row, row, value_input_option="USER_ENTERED")
        logger.info(f"Added reference: {item.description[:50]}...")

    def route_item(self, item: ProcessedItem) -> None:
        """
        Route a processed item to the correct tab based on item_type.

        Args:
            item: The ProcessedItem to route
        """
        if item.item_type == "Task":
            self.add_to_tasks(item)
        elif item.item_type == "Event":
            self.add_to_events(item)
        elif item.item_type == "Idea":
            self.add_to_ideas(item)
        elif item.item_type == "Reference":
            self.add_to_reference(item)
        else:
            logger.error(f"Unknown item type: {item.item_type}")

    # =========================================================================
    # Read Operations (For Briefs)
    # =========================================================================

    def get_events_for_date(self, target_date: date) -> list[ProcessedItem]:
        """
        Get all events scheduled for a specific date.

        Args:
            target_date: The date to query

        Returns:
            List of ProcessedItem objects for events on that date
        """
        worksheet = self._get_worksheet(SHEET_TABS["events"])
        all_rows = self._retry_operation(worksheet.get_all_values)

        if not all_rows or len(all_rows) < 2:
            return []

        events = []
        target_str = target_date.isoformat()

        for row in all_rows[1:]:  # Skip header
            if len(row) >= len(EVENTS_COLUMNS) and row[4] == target_str:
                try:
                    events.append(ProcessedItem.from_event_row(row))
                except Exception as e:
                    logger.warning(f"Failed to parse event row: {row}. Error: {e}")

        # Sort by time
        events.sort(key=lambda e: e.due_time or datetime.min.time())
        return events

    def get_tasks_due_by(self, target_date: date) -> list[ProcessedItem]:
        """
        Get all tasks due on or before a specific date.

        Args:
            target_date: The cutoff date

        Returns:
            List of ProcessedItem objects for tasks due by that date
        """
        worksheet = self._get_worksheet(SHEET_TABS["tasks"])
        all_rows = self._retry_operation(worksheet.get_all_values)

        if not all_rows or len(all_rows) < 2:
            return []

        tasks = []
        for row in all_rows[1:]:
            if len(row) >= len(TASKS_COLUMNS):
                # Skip completed/cancelled tasks
                if row[8] in ("completed", "cancelled"):
                    continue

                # Check due date
                if row[5]:  # Has due date
                    try:
                        task_date = date.fromisoformat(row[5])
                        if task_date <= target_date:
                            tasks.append(ProcessedItem.from_task_row(row))
                    except ValueError:
                        logger.warning(f"Invalid date format in task: {row[5]}")

        # Sort by due date, then urgency
        urgency_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        tasks.sort(
            key=lambda t: (
                t.due_date or date.max,
                urgency_order.get(t.urgency, 1),
            )
        )
        return tasks

    def get_high_urgency_items(self) -> list[ProcessedItem]:
        """
        Get all HIGH urgency items across tasks and events.

        Returns:
            List of ProcessedItem objects with HIGH urgency
        """
        items = []

        # Get high urgency tasks
        worksheet = self._get_worksheet(SHEET_TABS["tasks"])
        all_rows = self._retry_operation(worksheet.get_all_values)
        for row in all_rows[1:]:
            if len(row) >= len(TASKS_COLUMNS):
                if row[6] == "HIGH" and row[8] not in ("completed", "cancelled"):
                    try:
                        items.append(ProcessedItem.from_task_row(row))
                    except Exception as e:
                        logger.warning(f"Failed to parse task row: {e}")

        # Get high urgency events
        worksheet = self._get_worksheet(SHEET_TABS["events"])
        all_rows = self._retry_operation(worksheet.get_all_values)
        for row in all_rows[1:]:
            if len(row) >= len(EVENTS_COLUMNS):
                if row[7] == "HIGH":
                    try:
                        items.append(ProcessedItem.from_event_row(row))
                    except Exception as e:
                        logger.warning(f"Failed to parse event row: {e}")

        return items

    def get_items_due_between(
        self, start_date: date, end_date: date
    ) -> list[ProcessedItem]:
        """
        Get all items due between two dates (inclusive).

        Args:
            start_date: Start of date range
            end_date: End of date range

        Returns:
            List of ProcessedItem objects due in the range
        """
        items = []

        # Tasks
        worksheet = self._get_worksheet(SHEET_TABS["tasks"])
        all_rows = self._retry_operation(worksheet.get_all_values)
        for row in all_rows[1:]:
            if len(row) >= len(TASKS_COLUMNS) and row[5]:
                if row[8] in ("completed", "cancelled"):
                    continue
                try:
                    task_date = date.fromisoformat(row[5])
                    if start_date <= task_date <= end_date:
                        items.append(ProcessedItem.from_task_row(row))
                except ValueError:
                    pass

        # Events
        worksheet = self._get_worksheet(SHEET_TABS["events"])
        all_rows = self._retry_operation(worksheet.get_all_values)
        for row in all_rows[1:]:
            if len(row) >= len(EVENTS_COLUMNS) and row[4]:
                try:
                    event_date = date.fromisoformat(row[4])
                    if start_date <= event_date <= end_date:
                        items.append(ProcessedItem.from_event_row(row))
                except ValueError:
                    pass

        # Sort by date
        items.sort(key=lambda i: i.due_date or date.max)
        return items

    def get_items_needing_clarification(self) -> list[ProcessedItem]:
        """
        Get all items that need clarification.

        Note: This queries all tabs for items with needs_clarification = true.
        Since we don't store this flag directly in sheets, we check the notes
        field for a marker.

        Returns:
            List of ProcessedItem objects needing clarification
        """
        items = []

        # For now, check tasks with "[NEEDS CLARIFICATION]" in notes
        worksheet = self._get_worksheet(SHEET_TABS["tasks"])
        all_rows = self._retry_operation(worksheet.get_all_values)
        for row in all_rows[1:]:
            if len(row) >= len(TASKS_COLUMNS):
                if row[8] in ("completed", "cancelled"):
                    continue
                if row[9] and "[NEEDS CLARIFICATION]" in row[9].upper():
                    try:
                        item = ProcessedItem.from_task_row(row)
                        item.needs_clarification = True
                        items.append(item)
                    except Exception as e:
                        logger.warning(f"Failed to parse task row: {e}")

        return items

    def get_items_with_consequences_soon(self, days: int = 14) -> list[ProcessedItem]:
        """
        Get items with stated consequences due within the specified days.

        Args:
            days: Number of days to look ahead

        Returns:
            List of ProcessedItem objects with consequences approaching
        """
        end_date = date.today() + timedelta(days=days)
        items = []

        # Tasks with consequences
        worksheet = self._get_worksheet(SHEET_TABS["tasks"])
        all_rows = self._retry_operation(worksheet.get_all_values)
        for row in all_rows[1:]:
            if len(row) >= len(TASKS_COLUMNS):
                if row[8] in ("completed", "cancelled"):
                    continue
                # Has consequence and has due date
                if row[7] and row[5]:
                    try:
                        task_date = date.fromisoformat(row[5])
                        if task_date <= end_date:
                            items.append(ProcessedItem.from_task_row(row))
                    except ValueError:
                        pass

        # Events with consequences
        worksheet = self._get_worksheet(SHEET_TABS["events"])
        all_rows = self._retry_operation(worksheet.get_all_values)
        for row in all_rows[1:]:
            if len(row) >= len(EVENTS_COLUMNS):
                # Has consequence and has due date
                if row[8] and row[4]:
                    try:
                        event_date = date.fromisoformat(row[4])
                        if event_date <= end_date:
                            items.append(ProcessedItem.from_event_row(row))
                    except ValueError:
                        pass

        # Sort by date
        items.sort(key=lambda i: i.due_date or date.max)
        return items

    # =========================================================================
    # Update Operations
    # =========================================================================

    def update_task_status(self, item_id: str, status: str) -> None:
        """
        Update the status of a task.

        Args:
            item_id: The task ID
            status: New status (pending, in_progress, completed, cancelled)
        """
        worksheet = self._get_worksheet(SHEET_TABS["tasks"])
        all_rows = self._retry_operation(worksheet.get_all_values)

        for i, row in enumerate(all_rows[1:], start=2):
            if row[0] == item_id:
                # Status is column 9 (index 8, 1-indexed = 9)
                self._retry_operation(worksheet.update_cell, i, 9, status)
                logger.info(f"Updated task {item_id} status to {status}")
                return

        logger.warning(f"Task {item_id} not found")

    def update_calendar_event_id(
        self, item_id: str, item_type: str, event_id: str
    ) -> None:
        """
        Update the calendar_event_id for an item.

        Args:
            item_id: The item ID
            item_type: "Task" or "Event"
            event_id: The Google Calendar event ID
        """
        if item_type == "Task":
            worksheet = self._get_worksheet(SHEET_TABS["tasks"])
            col_index = 11  # calendar_event_id column
        elif item_type == "Event":
            worksheet = self._get_worksheet(SHEET_TABS["events"])
            col_index = 10  # calendar_event_id column
        else:
            logger.warning(f"Cannot update calendar_event_id for type: {item_type}")
            return

        all_rows = self._retry_operation(worksheet.get_all_values)

        for i, row in enumerate(all_rows[1:], start=2):
            if row[0] == item_id:
                self._retry_operation(worksheet.update_cell, i, col_index, event_id)
                logger.info(f"Updated {item_type} {item_id} calendar_event_id to {event_id}")
                return

        logger.warning(f"{item_type} {item_id} not found")

    # =========================================================================
    # Utility Methods
    # =========================================================================

    def ensure_headers(self) -> None:
        """
        Ensure all tabs have the correct header rows.
        Call this during initial setup.
        """
        headers = {
            SHEET_TABS["inbox"]: INBOX_COLUMNS,
            SHEET_TABS["tasks"]: TASKS_COLUMNS,
            SHEET_TABS["events"]: EVENTS_COLUMNS,
            SHEET_TABS["ideas"]: IDEAS_COLUMNS,
            SHEET_TABS["reference"]: REFERENCE_COLUMNS,
        }

        for tab_name, columns in headers.items():
            try:
                worksheet = self._get_worksheet(tab_name)
                current_row = self._retry_operation(worksheet.row_values, 1)
                if current_row != columns:
                    self._retry_operation(
                        worksheet.update, "A1", [columns], value_input_option="RAW"
                    )
                    logger.info(f"Updated headers for {tab_name}")
            except SheetNotFoundError:
                logger.warning(f"Tab {tab_name} not found, skipping header update")

    def test_connection(self) -> bool:
        """
        Test the connection to Google Sheets.

        Returns:
            True if connection successful, False otherwise
        """
        try:
            spreadsheet = self._get_spreadsheet()
            logger.info(f"Connected to spreadsheet: {spreadsheet.title}")
            return True
        except SheetsClientError as e:
            logger.error(f"Connection test failed: {e}")
            return False
