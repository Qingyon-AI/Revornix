from pathlib import Path

from schemas.document import DocumentAccessKeyUpdateRequest
from schemas.document import DocumentUpdateRequest
from schemas.section import SectionAccessKeyUpdateRequest
from schemas.section import SectionUpdateRequest


def test_document_update_request_accepts_public_status():
    request = DocumentUpdateRequest(document_id=1, is_public=True)

    assert request.is_public is True


def test_section_update_request_accepts_public_status():
    request = SectionUpdateRequest(section_id=1, is_public=False)

    assert request.is_public is False


def test_publish_access_key_requests_accept_optional_key():
    document_request = DocumentAccessKeyUpdateRequest(document_id=1, access_key="open-sesame")
    section_request = SectionAccessKeyUpdateRequest(section_id=2, access_key=None)

    assert document_request.access_key == "open-sesame"
    assert section_request.access_key is None


def test_tp_router_exposes_publish_access_key_routes():
    tp_router_source = Path(__file__).resolve().parents[1].joinpath("router", "tp.py").read_text()

    assert '@tp_router.post("/document/publish/access-key"' in tp_router_source
    assert "@tp_router.post('/section/publish/access-key'" in tp_router_source
