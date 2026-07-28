events_log: list[dict] = []


def emit(event_name: str, properties: dict) -> None:
    events_log.append({"event": event_name, "properties": properties})


def get_events() -> list[dict]:
    return events_log


def clear_events() -> None:
    events_log.clear()
