"""
Life OS Email Client

Sends daily briefs via email. Supports Gmail SMTP or Gmail API.
"""

import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class EmailClientError(Exception):
    """Base exception for email client errors."""
    pass


class EmailClient:
    """
    Email client for sending daily briefs.

    Uses Gmail SMTP with App Password for simplicity.
    To set up:
    1. Enable 2FA on your Google account
    2. Generate an App Password at https://myaccount.google.com/apppasswords
    3. Set GMAIL_APP_PASSWORD in your .env
    """

    def __init__(
        self,
        sender_email: Optional[str] = None,
        app_password: Optional[str] = None,
        recipient_email: Optional[str] = None,
    ):
        """
        Initialize the email client.

        Args:
            sender_email: Gmail address to send from
            app_password: Gmail App Password
            recipient_email: Email address to send briefs to
        """
        self.sender_email = sender_email or os.getenv("GMAIL_ADDRESS")
        self.app_password = app_password or os.getenv("GMAIL_APP_PASSWORD")
        self.recipient_email = recipient_email or os.getenv("RECIPIENT_EMAIL")

        if not self.recipient_email:
            raise EmailClientError("RECIPIENT_EMAIL not set")

    def send_brief(self, brief_content: str, subject: str) -> bool:
        """
        Send a daily brief via email.

        Args:
            brief_content: The formatted brief text
            subject: Email subject line

        Returns:
            True if sent successfully
        """
        if not self.sender_email or not self.app_password:
            logger.warning(
                "Gmail credentials not configured. Brief will be printed instead.\n"
                "To enable email: set GMAIL_ADDRESS and GMAIL_APP_PASSWORD in .env"
            )
            print(f"\n{'='*50}")
            print(f"SUBJECT: {subject}")
            print(f"{'='*50}\n")
            print(brief_content)
            return False

        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Life OS <{self.sender_email}>"
            msg["To"] = self.recipient_email

            # Plain text version
            text_part = MIMEText(brief_content, "plain", "utf-8")
            msg.attach(text_part)

            # Send via Gmail SMTP
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(self.sender_email, self.app_password)
                server.send_message(msg)

            logger.info(f"Sent brief to {self.recipient_email}: {subject}")
            return True

        except smtplib.SMTPAuthenticationError:
            raise EmailClientError(
                "Gmail authentication failed. Check your App Password.\n"
                "Generate one at: https://myaccount.google.com/apppasswords"
            )
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            raise EmailClientError(f"Failed to send email: {e}")

    def send_morning_brief(self, brief_content: str) -> bool:
        """Send the morning brief."""
        from datetime import date
        today = date.today()
        subject = f"☀️ Morning Brief — {today.strftime('%A, %B %d')}"
        return self.send_brief(brief_content, subject)

    def send_night_brief(self, brief_content: str) -> bool:
        """Send the night brief."""
        from datetime import date
        today = date.today()
        subject = f"🌙 Night Brief — {today.strftime('%A, %B %d')}"
        return self.send_brief(brief_content, subject)


def send_brief(brief_type: str = "morning"):
    """
    Generate and send a daily brief.

    Args:
        brief_type: "morning" or "night"
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    from src.brief_generator import BriefGenerator

    generator = BriefGenerator()
    email_client = EmailClient()

    if brief_type == "morning":
        brief = generator.generate_morning_brief()
        email_client.send_morning_brief(brief)
    elif brief_type == "night":
        brief = generator.generate_night_brief()
        email_client.send_night_brief(brief)
    else:
        raise ValueError(f"Unknown brief type: {brief_type}")


if __name__ == "__main__":
    import sys
    brief_type = sys.argv[1] if len(sys.argv) > 1 else "morning"
    send_brief(brief_type)
