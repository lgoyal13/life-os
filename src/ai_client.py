"""
Life OS AI Client

Uses Google Gemini 3 Flash for extracting structure from freeform captures.
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from google import genai
from google.genai import types

from src.models import AIExtractionResponse, ProcessedItem

logger = logging.getLogger(__name__)

# Load the processor prompt
PROMPT_PATH = Path(__file__).parent.parent / "config" / "prompts" / "processor_prompt.txt"


class AIClientError(Exception):
    """Base exception for AI client errors."""
    pass


class AIClient:
    """
    AI client for Life OS using Gemini 3 Flash.

    Handles extraction of structured data from freeform text input.
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the AI client.

        Args:
            api_key: Google API key. If not provided, reads from GOOGLE_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise AIClientError(
                "Google API key not found. Set GOOGLE_API_KEY environment variable "
                "or pass api_key to constructor."
            )

        self._client = genai.Client(api_key=self.api_key)
        self._prompt = self._load_prompt()

    def _load_prompt(self) -> str:
        """Load the processor prompt from file."""
        try:
            return PROMPT_PATH.read_text()
        except FileNotFoundError:
            raise AIClientError(f"Processor prompt not found at {PROMPT_PATH}")

    def extract_structure(
        self,
        raw_text: str,
        current_date: Optional[datetime] = None
    ) -> dict:
        """
        Extract structured data from freeform text.

        Args:
            raw_text: The raw capture text to process
            current_date: Current date for context (defaults to now)

        Returns:
            Dictionary matching the AIExtractionResponse schema
        """
        if current_date is None:
            current_date = datetime.now()

        # Add current date context to help with relative date parsing
        date_context = f"Today's date is {current_date.strftime('%Y-%m-%d')} ({current_date.strftime('%A')})."

        full_prompt = f"{self._prompt}\n\n{date_context}\n\nInput: {raw_text}"

        try:
            response = self._client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )

            # Check for empty response
            if not response.text:
                logger.error(f"AI returned empty response. Candidates: {response.candidates}")
                raise AIClientError("AI returned empty response")

            result = json.loads(response.text)
            logger.info(f"Successfully extracted structure for: {raw_text[:50]}...")
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"Raw response: {response.text[:500] if response and response.text else 'No response'}")
            raise AIClientError(f"AI returned invalid JSON: {e}")
        except AIClientError:
            raise
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
            raise AIClientError(f"AI extraction failed: {e}")

    def extract_to_processed_item(
        self,
        raw_text: str,
        captured_at: datetime,
        current_date: Optional[datetime] = None
    ) -> ProcessedItem:
        """
        Extract structure and return a ProcessedItem.

        Args:
            raw_text: The raw capture text to process
            captured_at: When the item was originally captured
            current_date: Current date for context (defaults to now)

        Returns:
            ProcessedItem with extracted data
        """
        extracted = self.extract_structure(raw_text, current_date)

        # Validate through Pydantic model
        ai_response = AIExtractionResponse(**extracted)

        # Convert to ProcessedItem
        return ai_response.to_processed_item(raw_text, captured_at)


# Convenience function for simple usage
def extract_structure(raw_text: str, api_key: Optional[str] = None) -> dict:
    """
    Extract structured data from freeform text.

    Convenience function that creates a client and extracts in one call.

    Args:
        raw_text: The raw capture text to process
        api_key: Optional Google API key

    Returns:
        Dictionary matching the AIExtractionResponse schema
    """
    client = AIClient(api_key=api_key)
    return client.extract_structure(raw_text)
