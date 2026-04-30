import asyncio
import logging
import json
import os
from dataclasses import dataclass
from typing import List, Callable, Any
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class AlertPayload:
    message: str
    severity: str
    timestamp: str = datetime.utcnow().isoformat()

class AlertService:
    """Async alerting service with retry logic and dead-letter log."""
    
    def __init__(self, max_retries: int = 3, retry_delay: float = 1.0, dead_letter_path: str = "logs/dead_letter_alerts.jsonl"):
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.dead_letter_path = dead_letter_path
        os.makedirs(os.path.dirname(self.dead_letter_path), exist_ok=True)

    async def send_webhook(self, url: str, payload: AlertPayload) -> bool:
        """Simulate async webhook call with retry."""
        for attempt in range(self.max_retries):
            try:
                # In real scenario, use httpx or aiohttp
                logger.info(f"Attempting to send webhook to {url} (Attempt {attempt + 1})")
                # Simulate success for testing
                if "fail" in url and attempt < 2:
                    raise Exception("Network error")
                logger.info(f"Webhook sent successfully to {url}")
                return True
            except Exception as e:
                logger.warning(f"Failed to send webhook to {url}: {e}")
                await asyncio.sleep(self.retry_delay * (2 ** attempt)) # Exponential backoff
        
        self._log_to_dead_letter("webhook", url, payload)
        return False

    async def send_email(self, recipient: str, payload: AlertPayload) -> bool:
        """Simulate async email sending with retry."""
        for attempt in range(self.max_retries):
            try:
                logger.info(f"Attempting to send email to {recipient} (Attempt {attempt + 1})")
                if "fail" in recipient and attempt < 2:
                    raise Exception("SMTP error")
                logger.info(f"Email sent successfully to {recipient}")
                return True
            except Exception as e:
                logger.warning(f"Failed to send email to {recipient}: {e}")
                await asyncio.sleep(self.retry_delay * (2 ** attempt))
        
        self._log_to_dead_letter("email", recipient, payload)
        return False

    def _log_to_dead_letter(self, channel: str, target: str, payload: AlertPayload):
        """Log failed alerts for manual review."""
        entry = {
            "channel": channel,
            "target": target,
            "payload": payload.__dict__,
            "failed_at": datetime.utcnow().isoformat()
        }
        with open(self.dead_letter_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
        logger.error(f"Alert failed across all retries. Logged to dead-letter: {self.dead_letter_path}")
