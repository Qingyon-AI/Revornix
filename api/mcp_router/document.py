from fastmcp import Context, FastMCP

import schemas
from data.neo4j.search import global_search
from mcp_router.auth import UserAuthMiddleware, db_session, get_user_from_ctx, get_user_id_from_ctx
from router.document import (
    add_label as api_add_label,
    create_note as api_create_note,
    delete_label as api_delete_label,
    get_label_summary as api_get_label_summary,
    list_label as api_list_label,
    search_note as api_search_note,
)
from router.document_interaction_manage import (
    read_document as api_read_document,
    star_document as api_star_document,
)
from router.document_query import (
    get_document_detail as api_get_document_detail,
    recent_read_document as api_recent_read_document,
    search_all_mine_documents as api_search_all_mine_documents,
    search_knowledge_vector as api_search_knowledge_vector,
    search_my_star_documents as api_search_my_star_documents,
    search_user_unread_documents as api_search_user_unread_documents,
)

# Initialize the MCP server
document_mcp_router = FastMCP(
    name="Document-MCP-Server"
)

document_mcp_router.add_middleware(UserAuthMiddleware())

@document_mcp_router.tool()
def search_document(
    keyword: str,
    ctx: Context,
    time_start: str | None = None,
    time_end: str | None = None,
):
    """
    Run content-level hybrid retrieval over the current user's knowledge base.

    Use this tool when you need the most relevant source chunks rather than a document list.
    It combines vector retrieval and graph expansion, so it is a good fit for downstream
    question answering, summarization, evidence gathering, or analysis workflows.

    Args:
        keyword: Search keyword or natural-language query.
        time_start: Optional ISO 8601 start time used to limit the retrieval window.
        time_end: Optional ISO 8601 end time used to limit the retrieval window.

    Returns:
        A list of chunks. Each item commonly includes fields such as `chunk_id`, `text`,
        `doc_id`, and `idx`. The combined result includes both seed chunks and graph-expanded chunks.

    When not to use:
        - Do not use this tool when you only need document-level metadata such as title, tags, or author.
          Prefer `search_document_vector` or `get_document_detail` instead.
        - Do not use this tool for status-based browsing such as unread, recent, or starred documents.

    Examples:
        - Search for chunks related to OKR reviews: `keyword="OKR review"`
        - Search only within the last week:
          `keyword="release launch", time_start="2026-03-01T00:00:00+08:00", time_end="2026-03-08T23:59:59+08:00"`

    Notes:
        - This tool only searches data accessible to the authenticated user.
        - It is optimized for content retrieval, not full document metadata retrieval.
    """
    user_id = get_user_id_from_ctx(ctx)
    documents = global_search(
        user_id=user_id,
        search_text=keyword,
        time_start=time_start,
        time_end=time_end,
    )
    return documents["seed_chunks"] + documents["expanded_chunks"]


@document_mcp_router.tool()
def search_document_vector(
    query: str,
    ctx: Context,
):
    """
    Run document-level vector retrieval over the current user's knowledge base.

    Use this tool when you already have a query and want relevant documents rather than raw source chunks.
    It is useful for locating candidate documents before reading details or performing follow-up actions.

    Args:
        query: Natural-language search query.

    Returns:
        A response containing a `documents` array. Each document commonly includes metadata such as
        title, category, source platform, tags, and processing task status.

    When not to use:
        - Do not use this tool when you need raw evidence chunks. Use `search_document` instead.
        - Do not use this tool when you need the full detail of a known document. Use `get_document_detail`.

    Examples:
        - Find documents related to quarterly summaries: `query="quarterly summary"`
        - Find documents related to user growth strategy: `query="user growth strategy"`

    Notes:
        - This is document-level retrieval and does not return chunk text.
        - Only documents accessible to the current user are searched.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = api_search_knowledge_vector(
            vector_search_request=schemas.document.VectorSearchRequest(query=query),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def search_my_documents(
    ctx: Context,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10,
    label_ids: list[int] | None = None,
    desc: bool = True,
):
    """
    Paginate through the current user's own documents.

    Use this tool when you need to browse the full document list, filter by keyword or tags,
    or drive a paginated workflow over the user's documents.

    Args:
        keyword: Optional keyword filter.
        start: Optional pagination cursor, usually the previous page's `next_start`.
        limit: Page size. Defaults to 10.
        label_ids: Optional list of tag IDs used for filtering.
        desc: Whether to return results in descending order. `True` typically means newest first.

    Returns:
        A standard paginated response containing `total`, `elements`, `has_more`, and `next_start`.
        Each item in `elements` is a document summary with task status information.

    When not to use:
        - Do not use this tool when you only want unread, recent, or starred documents.
        - Do not use this tool when you need full detail for a single document.

    Examples:
        - Fetch the first page: `limit=10`
        - Continue pagination with label filtering: `label_ids=[1, 3], start=120, limit=20`

    Notes:
        - This tool returns list-level summaries, not full document detail records.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = await api_search_all_mine_documents(
            search_all_my_document_request=schemas.document.SearchAllMyDocumentsRequest(
                keyword=keyword,
                start=start,
                limit=limit,
                label_ids=label_ids,
                desc=desc,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def search_my_unread_documents(
    ctx: Context,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10,
    label_ids: list[int] | None = None,
    desc: bool = True,
):
    """
    Paginate through documents that the current user has not marked as read.

    Use this tool when you need a backlog of unread material for reminders, prioritization,
    or reading workflows.

    Args:
        keyword: Optional keyword filter.
        start: Optional pagination cursor.
        limit: Page size. Defaults to 10.
        label_ids: Optional tag filter.
        desc: Sort direction.

    Returns:
        A paginated response whose `elements` contain unread documents.

    When not to use:
        - Do not use this tool to list all documents.
        - Do not use this tool to change read state. Use `set_document_read_status`.

    Examples:
        - Fetch the first unread page: `limit=10`
        - Filter unread documents by tag: `label_ids=[2], limit=20`

    Notes:
        - Documents already marked as read will not appear in the results.
        - Combine this with `set_document_read_status` when managing reading workflows.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = await api_search_user_unread_documents(
            search_unread_list_request=schemas.document.SearchUnreadListRequest(
                keyword=keyword,
                start=start,
                limit=limit,
                label_ids=label_ids,
                desc=desc,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def search_my_recent_documents(
    ctx: Context,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10,
    label_ids: list[int] | None = None,
    desc: bool = True,
):
    """
    Paginate through documents that the current user has read recently.

    Use this tool when you need reading history, want to reconstruct recent context,
    or generate recent-activity views.

    Args:
        keyword: Optional keyword filter.
        start: Optional pagination cursor.
        limit: Page size. Defaults to 10.
        label_ids: Optional tag filter.
        desc: Sort direction.

    Returns:
        A paginated response whose `elements` contain recently read document summaries.

    When not to use:
        - Do not use this tool to find recently created documents. This is based on reading activity.
        - Do not use this tool to change read state.

    Examples:
        - View recently read documents: `limit=10`
        - Filter reading history by keyword: `keyword="architecture design", limit=10`

    Notes:
        - This tool depends on read-state records.
        - A document that has never been marked as read will not appear here.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = await api_recent_read_document(
            search_recent_read_request=schemas.document.SearchRecentReadRequest(
                keyword=keyword,
                start=start,
                limit=limit,
                label_ids=label_ids,
                desc=desc,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def search_my_starred_documents(
    ctx: Context,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10,
    label_ids: list[int] | None = None,
    desc: bool = True,
):
    """
    Paginate through documents starred by the current user.

    Use this tool when you need a favorites list, a high-priority document set,
    or a workflow centered around bookmarked documents.

    Args:
        keyword: Optional keyword filter.
        start: Optional pagination cursor.
        limit: Page size. Defaults to 10.
        label_ids: Optional tag filter.
        desc: Sort direction.

    Returns:
        A paginated response whose `elements` contain starred document summaries.

    When not to use:
        - Do not use this tool to list all documents or unread documents.
        - Do not use this tool to change star state. Use `set_document_star_status`.

    Examples:
        - Fetch the first page of favorites: `limit=10`
        - Find starred documents related to AI: `keyword="AI", limit=20`

    Notes:
        - Use `set_document_star_status` to add or remove stars.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = await api_search_my_star_documents(
            search_my_star_documents_request=schemas.document.SearchMyStarDocumentsRequest(
                keyword=keyword,
                start=start,
                limit=limit,
                label_ids=label_ids,
                desc=desc,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def get_document_detail(
    document_id: int,
    ctx: Context,
):
    """
    Get the full detail for a single document.

    Use this tool when you already know the target document ID and need complete metadata,
    including tags, sections, creator info, task states, read/star state, and type-specific fields.

    Args:
        document_id: Target document ID.

    Returns:
        A single document detail object. Depending on document type, the result may also include
        `website_info`, `file_info`, `audio_info`, or `quick_note_info`, in addition to base fields
        and task status fields.

    When not to use:
        - Do not use this tool for bulk browsing across many documents.
        - Do not use this tool for semantic retrieval.

    Examples:
        - Get detail for document 128: `document_id=128`

    Notes:
        - The request only succeeds if the current user has permission to access the document.
        - This is a detail endpoint and is not designed for large-scale listing workflows.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = await api_get_document_detail(
            document_detail_request=schemas.document.DocumentDetailRequest(document_id=document_id),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
def list_document_labels(ctx: Context):
    """
    List all document tags created by the current user.

    Use this tool when you need the user's tag catalog before filtering documents,
    building a selector, or performing tag-related workflows.

    Returns:
        A response containing a `data` array. Each item commonly includes tag `id` and `name`.

    When not to use:
        - Do not use this tool when you need document counts per tag. Use `get_document_label_summary`.
        - Do not use this tool to create or delete tags.

    Examples:
        - Fetch all tags owned by the current user

    Notes:
        - The result only contains tags owned by the current user.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = api_list_label(
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
def get_document_label_summary(ctx: Context):
    """
    Get aggregate statistics for the current user's document tags.

    Use this tool when you want to know how many documents belong to each tag,
    or when you need a tag-level summary for ranking or display.

    Returns:
        A response containing a `data` array. Each item commonly includes `label_info`
        and a document count in `count`.

    When not to use:
        - Do not use this tool when you need the actual documents under a tag.
        - Do not use this tool for tag creation or deletion.

    Examples:
        - Fetch a summary overview of the current user's tags

    Notes:
        - This is an aggregate summary and does not return document lists.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = api_get_label_summary(
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
def create_document_label(
    name: str,
    ctx: Context,
):
    """
    Create a new document tag for the current user.

    Use this tool when a new category or topic label is needed before organizing documents.

    Args:
        name: Tag name.

    Returns:
        The newly created tag, typically including `id` and `name`.

    When not to use:
        - Do not use this tool to attach an existing tag to a document.
        - Do not use this tool to rename an existing tag.

    Examples:
        - Create a tag named "architecture design": `name="architecture design"`

    Notes:
        - This creates the tag definition only. It does not attach the tag to any document.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = api_add_label(
            label_add_request=schemas.document.LabelAddRequest(name=name),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
def delete_document_labels(
    label_ids: list[int],
    ctx: Context,
):
    """
    Delete one or more tags owned by the current user.

    Use this tool when cleaning up obsolete tags or removing tags created by mistake.

    Args:
        label_ids: List of tag IDs to delete.

    Returns:
        A standard success response.

    When not to use:
        - Do not use this tool to remove tag bindings from a single document.
        - Do not use this tool for read-only inspection or summary queries.

    Examples:
        - Delete two unused tags: `label_ids=[5, 7]`

    Notes:
        - Only tags owned by the current user can be deleted.
        - This deletes tag definitions and should be used carefully.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = api_delete_label(
            label_delete_request=schemas.document.LabelDeleteRequest(label_ids=label_ids),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
def create_document_note(
    document_id: int,
    content: str,
    ctx: Context,
):
    """
    Create a note for a specific document.

    Use this tool when you need to record reading notes, summaries, TODO items,
    or manual annotations tied to a document.

    Args:
        document_id: Target document ID.
        content: Note body.

    Returns:
        A standard success response.

    When not to use:
        - Do not use this tool to edit existing notes.
        - Do not use this tool to search note history.

    Examples:
        - Add a follow-up note:
          `document_id=128, content="Add the source citation for this section later"`

    Notes:
        - This tool only creates a note and does not return note detail.
        - Use `search_document_notes` after creation if you need to read notes back.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = api_create_note(
            note_create_request=schemas.document.DocumentNoteCreateRequest(
                document_id=document_id,
                content=content,
            ),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
def search_document_notes(
    document_id: int,
    ctx: Context,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10,
):
    """
    Paginate through notes attached to a document.

    Use this tool when you want to inspect existing notes, filter notes by keyword,
    or read note history page by page.

    Args:
        document_id: Target document ID.
        keyword: Optional keyword filter over note content.
        start: Optional pagination cursor.
        limit: Page size. Defaults to 10.

    Returns:
        A paginated response whose `elements` are note items. Each note commonly includes
        an ID, content, user info, and timestamps.

    When not to use:
        - Do not use this tool to search document body text.
        - Do not use this tool to create or edit notes.

    Examples:
        - Read the first page of notes: `document_id=128, limit=10`
        - Filter notes by TODO: `document_id=128, keyword="TODO", limit=20`

    Notes:
        - This tool queries notes, not document content.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = api_search_note(
            search_note_request=schemas.document.SearchDocumentNoteRequest(
                document_id=document_id,
                keyword=keyword,
                start=start,
                limit=limit,
            ),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
def set_document_star_status(
    document_id: int,
    status: bool,
    ctx: Context,
):
    """
    Set the star state of a document for the current user.

    Use this tool when you need to bookmark a document or remove it from favorites.

    Args:
        document_id: Target document ID.
        status: `True` to star the document, `False` to remove the star.

    Returns:
        A standard success response.

    When not to use:
        - Do not use this tool to inspect which documents are currently starred.
        - Do not use this tool for bulk state updates across many documents.

    Examples:
        - Star a document: `document_id=128, status=True`
        - Unstar a document: `document_id=128, status=False`

    Notes:
        - This only updates the current user's own star state.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = api_star_document(
            star_request=schemas.document.StarRequest(
                document_id=document_id,
                status=status,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
def set_document_read_status(
    document_id: int,
    status: bool,
    ctx: Context,
):
    """
    Set the read state of a document for the current user.

    Use this tool when you need to mark a document as read, move it back to unread,
    or maintain reading-progress workflows.

    Args:
        document_id: Target document ID.
        status: `True` to mark the document as read, `False` to clear the read state.

    Returns:
        A standard success response.

    When not to use:
        - Do not use this tool to inspect unread lists or recent-reading history.
        - Do not use this tool for bulk updates across many documents.

    Examples:
        - Mark a document as read: `document_id=128, status=True`
        - Clear the read state: `document_id=128, status=False`

    Notes:
        - This only updates the current user's own read state.
        - It affects the results of `search_my_unread_documents` and `search_my_recent_documents`.
    """
    with db_session() as db:
        user = get_user_from_ctx(ctx, db)
        res = api_read_document(
            read_request=schemas.document.ReadRequest(
                document_id=document_id,
                status=status,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")
