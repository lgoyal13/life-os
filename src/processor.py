"""
Life OS Processor

Main orchestration module that:
1. Reads unprocessed items from Inbox
2. Sends to AI for extraction
3. Routes to correct sheet tabs
4. Creates calendar events
5. Marks items as processed
"""

import logging
import os
import time
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv

from src.ai_client import AIClient, AIClientError
from src.models import InboxItem, ProcessedItem
from src.sheets_client import SheetsClient, SheetsClientError

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class ProcessorError(Exception):
    """Base exception for processor errors."""
    pass


class Processor:
    """
    Main processor for Life OS.

    Orchestrates the flow from raw captures to organized, actionable items.
    """

    def __init__(
        self,
        sheets_client: Optional[SheetsClient] = None,
        ai_client: Optional[AIClient] = None,
        calendar_client: Optional["CalendarClient"] = None,
        max_retries: int = 3,
        retry_delay: float = 2.0,
    ):
        """
        Initialize the processor.

        Args:
            sheets_client: Google Sheets client (creates one if not provided)
            ai_client: AI client (creates one if not provided)
            calendar_client: Calendar client (creates one if not provided)
            max_retries: Number of retries for failed items
            retry_delay: Initial delay between retries
        """
        self.sheets_client = sheets_client or self._create_sheets_client()
        self.ai_client = ai_client or AIClient()
        self.calendar_client = calendar_client
        self.max_retries = max_retries
        self.retry_delay = retry_delay

        # Stats for this run
        self.stats = {
            "processed": 0,
            "failed": 0,
            "tasks_created": 0,
            "events_created": 0,
            "ideas_created": 0,
            "references_created": 0,
            "calendar_events_created": 0,
        }

    def _create_sheets_client(self) -> SheetsClient:
        """Create a sheets client from environment variables."""
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        credentials_path = os.getenv("GOOGLE_CREDENTIALS_PATH", "./credentials.json")

        if not sheet_id:
            raise ProcessorError(
                "GOOGLE_SHEET_ID not set. Please set it in your .env file."
            )

        return SheetsClient(sheet_id=sheet_id, credentials_path=credentials_path)

    def process_inbox(self) -> dict:
        """
        Process all unprocessed items in the inbox.

        Returns:
            Dictionary with processing statistics
        """
        logger.info("Starting inbox processing...")

        # Get unprocessed items
        try:
            inbox_items = self.sheets_client.get_unprocessed_items()
        except SheetsClientError as e:
            logger.error(f"Failed to read inbox: {e}")
            raise ProcessorError(f"Failed to read inbox: {e}")

        if not inbox_items:
            logger.info("No unprocessed items in inbox")
            return self.stats

        logger.info(f"Found {len(inbox_items)} unprocessed items")

        # Process each item
        for item in inbox_items:
            self._process_single_item(item)

        logger.info(
            f"Processing complete. "
            f"Processed: {self.stats['processed']}, "
            f"Failed: {self.stats['failed']}"
        )

        return self.stats

    def _process_single_item(self, item: InboxItem) -> Optional[ProcessedItem]:
        """
        Process a single inbox item.

        Args:
            item: The inbox item to process

        Returns:
            The processed item, or None if processing failed
        """
        logger.info(f"Processing: {item.raw_text[:50]}...")

        for attempt in range(self.max_retries):
            try:
                # Extract structure using AI
                processed = self.ai_client.extract_to_processed_item(
                    raw_text=item.raw_text,
                    captured_at=item.captured_at,
                )

                # Route to correct tab
                self._route_item(processed)

                # Create calendar event if needed
                if processed.calendar_action in ("CREATE_EVENT", "CREATE_REMINDER"):
                    self._create_calendar_event(processed)

                # Mark as processed in inbox
                self.sheets_client.mark_processed(item.id)

                self.stats["processed"] += 1
                logger.info(f"Successfully processed: {processed.description[:50]}...")

                return processed

            except AIClientError as e:
                logger.warning(
                    f"AI extraction failed (attempt {attempt + 1}/{self.max_retries}): {e}"
                )
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    self._handle_failed_item(item, str(e))

            except SheetsClientError as e:
                logger.error(f"Sheets operation failed: {e}")
                self._handle_failed_item(item, str(e))
                break

            except Exception as e:
                logger.error(f"Unexpected error processing item: {e}")
                self._handle_failed_item(item, str(e))
                break

        return None

    def _route_item(self, item: ProcessedItem) -> None:
        """Route a processed item to the correct sheet tab."""
        if item.item_type == "Task":
            self.sheets_client.add_to_tasks(item)
            self.stats["tasks_created"] += 1

        elif item.item_type == "Event":
            self.sheets_client.add_to_events(item)
            self.stats["events_created"] += 1

        elif item.item_type == "Idea":
            self.sheets_client.add_to_ideas(item)
            self.stats["ideas_created"] += 1

        elif item.item_type == "Reference":
            self.sheets_client.add_to_reference(item)
            self.stats["references_created"] += 1

        else:
            logger.warning(f"Unknown item type: {item.item_type}")

    def _create_calendar_event(self, item: ProcessedItem) -> None:
        """Create a Google Calendar event for the item."""
        if not self.calendar_client:
            logger.debug("No calendar client configured, skipping calendar event")
            return

        if not item.due_date:
            logger.debug("No due date, skipping calendar event")
            return

        try:
            event_id = self.calendar_client.create_event(item)
            if event_id:
                # Update the sheet with the calendar event ID
                self.sheets_client.update_calendar_event_id(
                    item.id, item.item_type, event_id
                )
                self.stats["calendar_events_created"] += 1
                logger.info(f"Created calendar event: {event_id}")
        except Exception as e:
            logger.error(f"Failed to create calendar event: {e}")
            # Don't fail the whole item for calendar errors

    def _handle_failed_item(self, item: InboxItem, error: str) -> None:
        """Handle a failed item."""
        self.stats["failed"] += 1
        try:
            self.sheets_client.mark_failed(item.id, error)
        except Exception as e:
            logger.error(f"Failed to mark item as failed: {e}")


def process_inbox():
    """
    Main entry point for inbox processing.

    Can be called from command line or GitHub Actions.
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    try:
        # Try to import calendar client (may not be available yet)
        try:
            from src.calendar_client import CalendarClient
            calendar_client = CalendarClient()
        except ImportError:
            logger.info("Calendar client not available, running without calendar sync")
            calendar_client = None

        processor = Processor(calendar_client=calendar_client)
        stats = processor.process_inbox()

        print("\n" + "=" * 50)
        print("PROCESSING COMPLETE")
        print("=" * 50)
        print(f"Items processed: {stats['processed']}")
        print(f"Items failed:    {stats['failed']}")
        print(f"Tasks created:   {stats['tasks_created']}")
        print(f"Events created:  {stats['events_created']}")
        print(f"Ideas created:   {stats['ideas_created']}")
        print(f"References:      {stats['references_created']}")
        print(f"Calendar events: {stats['calendar_events_created']}")
        print("=" * 50)

        return stats

    except Exception as e:
        logger.error(f"Processing failed: {e}")
        raise


if __name__ == "__main__":
    process_inbox()
