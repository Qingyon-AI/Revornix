from collections.abc import Iterable

from common.logger import exception_logger

from .base import VideoPlugin


class VideoPluginGroup:

    def __init__(
        self,
        plugins: Iterable[VideoPlugin] | None = None,
    ) -> None:
        self._plugins: list[VideoPlugin] = []
        if plugins:
            for plugin in plugins:
                self.register(plugin)

    def register(self, plugin: VideoPlugin) -> None:
        self._plugins.append(plugin)
        self._plugins.sort(key=lambda item: item.priority)

    async def extract_subtitle(
        self,
        url: str,
    ) -> str | None:
        for plugin in self._plugins:
            if not plugin.supports(url):
                continue

            try:
                subtitle_markdown = await plugin.extract_subtitle(url=url)
            except Exception as e:
                exception_logger.warning(
                    f"Video subtitle plugin failed: plugin={plugin.plugin_name}, url={url}, error={e}"
                )
                continue

            if subtitle_markdown:
                return subtitle_markdown

        return None
