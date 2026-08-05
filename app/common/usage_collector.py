from __future__ import annotations

import json
from dataclasses import asdict, is_dataclass
from collections.abc import Mapping
from collections import defaultdict
from typing import Any, cast


class UsageCollector:
    """
    Collect token usage from LangChain / MCP streaming events.
    """

    _USAGE_DICT_KEYS = ("usage_metadata", "token_usage", "usage")
    _USAGE_PATHS = (
        ("output", "usage_metadata"),
        ("output", "response_metadata", "token_usage"),
        ("output", "token_usage"),
        ("chunk", "usage_metadata"),
        ("chunk", "response_metadata", "token_usage"),
        ("chunk", "token_usage"),
        ("llm_output", "token_usage"),
        ("usage",),
    )
    _ALIASES = {
        "prompt_tokens": "input_tokens",
        "completion_tokens": "output_tokens",
        "input_text_tokens": "input_tokens",
        "output_text_tokens": "output_tokens",
    }

    def __init__(self) -> None:
        self._usage_totals: dict[str, int] = defaultdict(int)
        self._usage_event_count = 0
        self._seen_fingerprints: set[str] = set()
        self._model_names: set[str] = set()

    def collect(self, event: dict[str, Any]) -> None:
        if not isinstance(event, dict):
            return

        data = event.get("data")
        run_id = str(event.get("run_id") or "")
        node_name = str(event.get("name") or "")

        data_mapping = self._as_mapping(data)
        if data_mapping is None:
            return

        model_name = self._extract_model_name(data_mapping)
        if model_name:
            self._model_names.add(model_name)

        for usage in self._extract_usage_dicts(data_mapping):
            normalized = self._normalize_usage(usage)
            if not normalized:
                continue

            fingerprint = self._build_fingerprint(
                run_id=run_id,
                node_name=node_name,
                normalized_usage=normalized,
            )
            if fingerprint in self._seen_fingerprints:
                continue
            self._seen_fingerprints.add(fingerprint)

            self._usage_event_count += 1
            for key, value in normalized.items():
                self._usage_totals[key] += value

    def snapshot(self) -> dict[str, Any] | None:
        if not self._usage_totals:
            return None

        usage = dict(self._usage_totals)
        if "total_tokens" not in usage:
            usage["total_tokens"] = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)

        return {
            "usage": usage,
            "usage_event_count": self._usage_event_count,
            "models": sorted(self._model_names),
        }

    def _extract_usage_dicts(self, data: Mapping[str, Any]) -> list[Mapping[str, Any]]:
        usage_dicts: list[Mapping[str, Any]] = []

        for path in self._USAGE_PATHS:
            value = self._get_path(data, path)
            value_mapping = self._as_mapping(value)
            if value_mapping is not None:
                usage_dicts.append(value_mapping)

        queue: list[tuple[Any, int]] = [(data, 0)]
        seen_ids: set[int] = set()
        while queue:
            current, depth = queue.pop(0)
            current_id = id(current)
            if current_id in seen_ids:
                continue
            seen_ids.add(current_id)

            if depth > 4:
                continue

            mapping = self._as_mapping(current)
            if mapping is None:
                continue

            for key in self._USAGE_DICT_KEYS:
                candidate = mapping.get(key)
                candidate_mapping = self._as_mapping(candidate)
                if candidate_mapping is not None:
                    usage_dicts.append(candidate_mapping)

            for value in mapping.values():
                if isinstance(value, Mapping):
                    queue.append((value, depth + 1))
                elif isinstance(value, list):
                    for item in value:
                        item_mapping = self._as_mapping(item)
                        if item_mapping is not None:
                            queue.append((item_mapping, depth + 1))

        deduped: list[Mapping[str, Any]] = []
        seen: set[str] = set()
        for usage in usage_dicts:
            signature = self._mapping_signature(usage)
            if signature in seen:
                continue
            seen.add(signature)
            deduped.append(usage)
        return deduped

    def _normalize_usage(self, usage: Mapping[str, Any]) -> dict[str, int]:
        normalized: dict[str, int] = {}
        for key, value in usage.items():
            if isinstance(value, bool):
                continue
            if isinstance(value, (int, float)):
                canonical_key = self._ALIASES.get(key, key)
                normalized[canonical_key] = normalized.get(canonical_key, 0) + int(value)
        return normalized

    def _extract_model_name(self, data: Mapping[str, Any]) -> str | None:
        candidates = (
            self._get_path(data, ("output", "response_metadata", "model_name")),
            self._get_path(data, ("output", "response_metadata", "model")),
            self._get_path(data, ("chunk", "response_metadata", "model_name")),
            self._get_path(data, ("chunk", "response_metadata", "model")),
        )
        for candidate in candidates:
            if isinstance(candidate, str) and candidate:
                return candidate
        return None

    def _build_fingerprint(
        self,
        *,
        run_id: str,
        node_name: str,
        normalized_usage: Mapping[str, int],
    ) -> str:
        return f"{run_id}|{node_name}|{self._mapping_signature(normalized_usage)}"

    @staticmethod
    def _get_path(data: Mapping[str, Any], path: tuple[str, ...]) -> Any:
        current: Any = data
        for key in path:
            mapping = UsageCollector._as_mapping(current)
            if mapping is not None and key in mapping:
                current = mapping[key]
                continue

            if hasattr(current, key):
                current = getattr(current, key)
                continue

            return None
        return current

    @staticmethod
    def _mapping_signature(mapping: Mapping[str, Any]) -> str:
        try:
            return json.dumps(dict(mapping), sort_keys=True, ensure_ascii=False, default=str)
        except Exception:
            return str(sorted((str(k), str(v)) for k, v in mapping.items()))

    @staticmethod
    def _as_mapping(value: Any) -> Mapping[str, Any] | None:
        if isinstance(value, Mapping):
            return value
        if value is None:
            return None

        if is_dataclass(value) and not isinstance(value, type):
            try:
                dumped = asdict(cast(Any, value))
                if isinstance(dumped, Mapping):
                    return dumped
            except Exception:
                pass

        model_dump = getattr(value, "model_dump", None)
        if callable(model_dump):
            try:
                dumped = model_dump(exclude_none=True)
                if isinstance(dumped, Mapping):
                    return dumped
            except Exception:
                pass

        dict_method = getattr(value, "dict", None)
        if callable(dict_method):
            try:
                dumped = dict_method()
                if isinstance(dumped, Mapping):
                    return dumped
            except Exception:
                pass

        if hasattr(value, "__dict__"):
            try:
                dumped = {
                    key: val
                    for key, val in vars(value).items()
                    if not key.startswith("_")
                }
                if dumped:
                    return dumped
            except Exception:
                pass

        return None
