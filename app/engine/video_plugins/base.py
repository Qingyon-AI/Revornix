from dataclasses import dataclass


@dataclass(slots=True)
class SubtitleSegment:
    start_seconds: float
    text: str


class VideoPlugin:
    plugin_name = "base"
    priority = 100

    def supports(self, url: str) -> bool:
        raise NotImplementedError("Method not implemented")

    async def extract_subtitle(
        self,
        url: str,
    ) -> str | None:
        raise NotImplementedError("Method not implemented")
