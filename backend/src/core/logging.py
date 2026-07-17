"""JSON structured logging — old logging.conf + thread-local trace hack ki jagah."""

import logging
import sys

from pythonjsonlogger import jsonlogger


def setup_logging(debug: bool = False) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.DEBUG if debug else logging.INFO)
    # noisy libs
    for name in ("botocore", "boto3", "urllib3"):
        logging.getLogger(name).setLevel(logging.WARNING)
