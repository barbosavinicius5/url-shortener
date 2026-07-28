from datetime import datetime

_events: list[dict] = []


def emit_event(name: str, payload: dict):
    _events.append(
        {"event": name, **payload, "timestamp": datetime.utcnow().isoformat()}
    )


def get_events() -> list[dict]:
    return list(_events)


def clear_events():
    _events.clear()
