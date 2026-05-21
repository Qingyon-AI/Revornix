import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import httpx
import pytest

from schemas.error import CustomException


def _install_stub(module_name: str, **attributes):
    module = ModuleType(module_name)
    for key, value in attributes.items():
        setattr(module, key, value)
    sys.modules[module_name] = module


class _ImageGenerateEngineBase:
    def __init__(self, *args, **kwargs):
        pass


class _PropagateAttributes:
    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class _EngineMeta:
    uuid = "openai-image"


class _EngineProvided:
    OpenAI_Image = type("OpenAIImage", (), {"meta": _EngineMeta})


_install_stub(
    "langfuse",
    propagate_attributes=_PropagateAttributes,
)
_install_stub(
    "base_implement.image_generate_engine_base",
    ImageGenerateEngineBase=_ImageGenerateEngineBase,
)
_install_stub(
    "common.usage_billing",
    extract_usage_details_from_completion=lambda data: None,
    persist_engine_usage=None,
)
_install_stub(
    "enums.engine_enums",
    EngineCategory=type("EngineCategory", (), {"IMAGE_GENERATE": "image_generate"}),
    EngineProvided=_EngineProvided,
)

_MODULE_PATH = Path(__file__).resolve().parents[1] / "engine/image_generate/openai_image.py"
_SPEC = importlib.util.spec_from_file_location("openai_image_under_test", _MODULE_PATH)
assert _SPEC is not None and _SPEC.loader is not None
openai_image = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(openai_image)


def _response(
    *,
    status_code: int = 200,
    content: str,
    content_type: str = "application/json",
) -> httpx.Response:
    return httpx.Response(
        status_code=status_code,
        content=content.encode("utf-8"),
        headers={"content-type": content_type},
        request=httpx.Request("POST", "https://api.openai.com/v1/images/generations"),
    )


def test_parse_json_response_returns_object_payload():
    response = _response(content='{"data": [], "usage": {"total_tokens": 1}}')

    assert openai_image._parse_json_response(response) == {
        "data": [],
        "usage": {"total_tokens": 1},
    }


def test_parse_json_response_rejects_non_json_body():
    response = _response(
        content="<html>bad gateway</html>",
        content_type="text/html",
    )

    with pytest.raises(CustomException) as exc_info:
        openai_image._parse_json_response(response)

    assert exc_info.value.code == 502
    assert "non-JSON response" in exc_info.value.message
    assert "<html>bad gateway</html>" in exc_info.value.message


def test_parse_json_response_truncates_long_body_preview():
    response = _response(
        content="x" * (openai_image.RESPONSE_PREVIEW_MAX_CHARS + 10),
        content_type="text/plain",
    )

    with pytest.raises(CustomException) as exc_info:
        openai_image._parse_json_response(response)

    assert ("x" * openai_image.RESPONSE_PREVIEW_MAX_CHARS) in exc_info.value.message
    assert ("x" * (openai_image.RESPONSE_PREVIEW_MAX_CHARS + 1)) not in exc_info.value.message
    assert exc_info.value.message.endswith("...")


def test_raise_for_openai_image_error_preserves_json_error_message():
    response = _response(
        status_code=400,
        content='{"error": {"message": "invalid image prompt"}}',
    )

    with pytest.raises(CustomException) as exc_info:
        openai_image._raise_for_openai_image_error(response)

    assert exc_info.value.code == 502
    assert "status=400" in exc_info.value.message
    assert "invalid image prompt" in exc_info.value.message
