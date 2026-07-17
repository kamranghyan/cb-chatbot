"""
SSM fallback source for pydantic-settings.

Priority chain mein sab se NEECHE baithta hai:
    OS env  >  .env file  >  [YEH: SSM]  >  code defaults

Matlab: agar koi value env/.env mein mil gayi, SSM ki value override
ho jayegi (pydantic higher-priority source ko prefer karta hai).
SSM call sirf tab hoti hai jab:
    - SSM_FALLBACK=true ho, YA
    - ENV local nahi hai (dev/qa/stage/prod pe by-default ON)

Old system se farq: import-time blocking call nahi — Settings()
instantiate hone pe ek dafa, batched (10 params/call), aur fail-soft
(SSM down ho to warning, crash nahi).
"""

import json
import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic.fields import FieldInfo
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource

log = logging.getLogger(__name__)

_MAPPING_FILE = Path(__file__).parent / "ssm_mapping.json"
_BATCH_SIZE = 10  # AWS get_parameters ka hard limit


def _ssm_enabled() -> bool:
    env = os.getenv("ENV", "local").lower()
    flag = os.getenv("SSM_FALLBACK", "").lower()
    if flag in ("true", "1", "yes"):
        return True
    if flag in ("false", "0", "no"):
        return False
    return env != "local"  # AWS envs pe default ON, local pe OFF


@lru_cache(maxsize=1)
def _fetch_ssm_values() -> dict[str, str]:
    """Ek dafa fetch, process lifetime ke liye cached."""
    env = os.getenv("ENV", "local").lower()
    if env == "local" and not _ssm_enabled():
        return {}

    try:
        mapping: dict[str, str] = json.loads(_MAPPING_FILE.read_text()).get(env, {})
    except (OSError, json.JSONDecodeError) as e:
        log.warning("ssm_mapping.json read failed: %s", e)
        return {}

    mapping = {k: v for k, v in mapping.items() if not k.startswith("_")}
    if not mapping:
        return {}

    try:
        import boto3

        client = boto3.client("ssm", region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
        param_to_field = {v: k for k, v in mapping.items()}
        names = list(mapping.values())
        values: dict[str, str] = {}

        for i in range(0, len(names), _BATCH_SIZE):
            resp = client.get_parameters(Names=names[i : i + _BATCH_SIZE], WithDecryption=True)
            for p in resp["Parameters"]:
                values[param_to_field[p["Name"]]] = p["Value"]
            for missing in resp.get("InvalidParameters", []):
                log.warning("SSM parameter not found: %s", missing)

        log.info("Loaded %d settings from SSM (env=%s)", len(values), env)
        return values
    except Exception as e:  # fail-soft: SSM issue app boot na rokay
        log.warning("SSM fetch failed, continuing with env/.env/defaults: %s", e)
        return {}


class SsmSettingsSource(PydanticBaseSettingsSource):
    """pydantic-settings custom source — dekho Settings.settings_customise_sources."""

    def __init__(self, settings_cls: type[BaseSettings]):
        super().__init__(settings_cls)
        self._values = _fetch_ssm_values() if _ssm_enabled() else {}

    def get_field_value(self, field: FieldInfo, field_name: str) -> tuple[Any, str, bool]:
        return self._values.get(field_name), field_name, False

    def __call__(self) -> dict[str, Any]:
        return {
            name: val
            for name in self.settings_cls.model_fields
            if (val := self._values.get(name)) is not None
        }
