"""
Salesforce case creation — old chat.py ke andar inline tha, ab adapter.
Optional: SALESFORCE_* env khali -> disabled (fail-soft). OAuth
username-password flow, wohi jo old system use karta tha.
"""

import asyncio
import logging

import httpx

from src.config import get_settings

log = logging.getLogger(__name__)


class SalesforceService:
    async def create_case(self, subject: str, description: str, email: str) -> str | None:
        s = get_settings()
        if not (s.SALESFORCE_CLIENT_ID and s.SALESFORCE_USERNAME):
            log.info("Salesforce disabled — case skipped: %s", subject)
            return None
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                auth = await client.post(
                    f"{s.SALESFORCE_DOMAIN}/services/oauth2/token",
                    data={
                        "grant_type": "password",
                        "client_id": s.SALESFORCE_CLIENT_ID,
                        "client_secret": s.SALESFORCE_CLIENT_SECRET,
                        "username": s.SALESFORCE_USERNAME,
                        "password": s.SALESFORCE_PASSWORD,
                    },
                )
                auth.raise_for_status()
                token = auth.json()["access_token"]
                instance = auth.json()["instance_url"]

                resp = await client.post(
                    f"{instance}/services/data/v59.0/sobjects/Case",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "Subject": subject[:255],
                        "Description": description[:32000],
                        "SuppliedEmail": email,
                        "Origin": "Chatbot",
                    },
                )
                resp.raise_for_status()
                case_id = resp.json().get("id")
                log.info("Salesforce case created: %s", case_id)
                return case_id
        except Exception as e:
            log.warning("Salesforce case failed: %s", e)
            return None