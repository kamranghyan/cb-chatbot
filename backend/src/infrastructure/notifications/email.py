"""
Email (SendGrid) — old notification module ka port. Fail-soft + optional:
SENDGRID_API_KEY khali ho to disabled, sirf log hota hai. Email failure
kabhi business flow nahi girata.
"""

import asyncio
import logging

from src.config import get_settings

log = logging.getLogger(__name__)


class EmailService:
    async def send(self, to: str, subject: str, body: str) -> bool:
        s = get_settings()
        if not s.SENDGRID_API_KEY:
            log.info("SendGrid disabled (no key) — email skipped: %s / %s", to, subject)
            return False
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            message = Mail(
                from_email=s.NOTIFICATION_FROM_EMAIL,
                to_emails=to, subject=subject, html_content=body,
            )
            client = SendGridAPIClient(s.SENDGRID_API_KEY)
            resp = await asyncio.to_thread(client.send, message)
            return 200 <= resp.status_code < 300
        except Exception as e:
            log.warning("Email send failed: %s", e)
            return False