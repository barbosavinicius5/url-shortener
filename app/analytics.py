import logging

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Serviço de analytics que emite eventos para stdout/log."""

    def emit(self, event_name: str, properties: dict) -> None:
        """Registra um evento de analytics.

        Args:
            event_name: Nome do evento (ex.: "url_encurtada").
            properties: Dicionário com as propriedades do evento.
        """
        logger.info("[analytics] evento=%s propriedades=%s", event_name, properties)
        print(f"[analytics] evento={event_name!r} propriedades={properties}")