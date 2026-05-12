from schemas.document import DocumentUpdateRequest
from schemas.section import SectionUpdateRequest


def test_document_update_request_accepts_public_status():
    request = DocumentUpdateRequest(document_id=1, is_public=True)

    assert request.is_public is True


def test_section_update_request_accepts_public_status():
    request = SectionUpdateRequest(section_id=1, is_public=False)

    assert request.is_public is False
