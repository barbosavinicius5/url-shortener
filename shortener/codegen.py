"""Code generation layer (TASK-001).

Generates a random, URL-safe short code of a configurable length.
"""

import random
import string

_ALPHABET = string.ascii_letters + string.digits  # [a-zA-Z0-9]
_CODE_LENGTH = 6


def generate_code(length: int = _CODE_LENGTH) -> str:
    """Return a random alphanumeric short code of *length* characters."""
    return "".join(random.choices(_ALPHABET, k=length))