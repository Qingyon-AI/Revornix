import json
from types import SimpleNamespace

import pytest

from router.ai import stream_ops_request
from router.document_ai import _stream_document_answer_request
from router.section_ai import _stream_section_answer_request
from schemas.ai import ChatItem
from schemas.document import DocumentAskRequest
from schemas.section import SectionAskRequest


def _decode_sse(event: str) -> dict:
    assert event.startswith("data: ")
    return json.loads(event.removeprefix("data: ").strip())


@pytest.mark.asyncio
async def test_ai_stream_reuses_client_assistant_chat_id():
    chat_id = "assistant-client-id"
    stream = stream_ops_request(
        user=SimpleNamespace(id=1),
        model_id=1,
        enable_mcp=False,
        messages=[
            ChatItem(chat_id="user-id", role="user", content="Hello"),
        ],
        chat_id=chat_id,
    )

    first_event = _decode_sse(await anext(stream))
    assert first_event["chat_id"] == chat_id
    await stream.aclose()


@pytest.mark.asyncio
async def test_document_stream_reuses_client_assistant_chat_id():
    chat_id = "document-assistant-client-id"
    request = DocumentAskRequest(
        document_id=1,
        messages=[
            ChatItem(chat_id="user-id", role="user", content="Hello"),
        ],
        assistant_chat_id=chat_id,
    )
    stream = _stream_document_answer_request(
        document_ask_request=request,
        user=SimpleNamespace(id=1, default_ai_interaction_language=None),
        messages=request.messages,
    )

    first_event = _decode_sse(await anext(stream))
    assert first_event["chat_id"] == chat_id
    await stream.aclose()


@pytest.mark.asyncio
async def test_section_stream_reuses_client_assistant_chat_id():
    chat_id = "section-assistant-client-id"
    request = SectionAskRequest(
        section_id=1,
        messages=[
            ChatItem(chat_id="user-id", role="user", content="Hello"),
        ],
        assistant_chat_id=chat_id,
    )
    stream = _stream_section_answer_request(
        section_ask_request=request,
        user=SimpleNamespace(id=1, default_ai_interaction_language=None),
        messages=request.messages,
    )

    first_event = _decode_sse(await anext(stream))
    assert first_event["chat_id"] == chat_id
    await stream.aclose()
