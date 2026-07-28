"""Code generation layer (TASK-001).

Generates a random, URL-safe short code of a configurable length.
"""

import re
import random
import string

_ALPHABET = string.ascii_letters + string.digits  # [a-zA-Z0-9]
_CODE_LENGTH = 6

# Regex that matches exactly the code format: _CODE_LENGTH alphanumeric chars.
_CODE_PATTERN = re.compile(r'^[a-zA-Z0-9]{6}$')


def generate_code(length: int = _CODE_LENGTH) -> str:
    """Return a random alphanumeric short code of *length* characters."""
    return "".join(random.choices(_ALPHABET, k=length))


def is_valid_code(code: str) -> bool:
    """Return ``True`` if *code* matches the expected short-code format.

    Valid code: exactly ``_CODE_LENGTH`` alphanumeric characters ``[a-zA-Z0-9]``.
    """
    return bool(_CODE_PATTERN.match(code))