from fastmcp import Context, FastMCP

import schemas
from common.dependencies import check_deployed_by_official_in_fuc
from data.neo4j.search import global_search
from mcp_router.auth import (
    UserAuthMiddleware,
    db_session,
    get_authorization_from_headers,
    get_raw_user_timezone_from_headers,
    get_user_from_ctx,
    get_user_id_from_ctx,
)
from router.document import (
    add_label as api_add_label,
    cancel_ai_summary as api_cancel_ai_summary,
    cancel_embedding as api_cancel_embedding,
    cancel_graph as api_cancel_graph,
    cancel_podcast as api_cancel_podcast,
    cancel_transcribe as api_cancel_transcribe,
    create_ai_summary as api_create_ai_summary,
    create_document as api_create_document,
    create_embedding as api_create_embedding,
    create_note as api_create_note,
    delete_label as api_delete_label,
    generate_graph as api_generate_graph,
    generate_podcast as api_generate_podcast,
    get_label_summary as api_get_label_summary,
    get_month_summary as api_get_month_summary,
    list_label as api_list_label,
    search_note as api_search_note,
    touch_document_content as api_touch_document_content,
    transcribe_audio_document as api_transcribe_audio_document,
    transform_markdown as api_transform_markdown,
    update_document as api_update_document,
)
from router.document_interaction_manage import (
    delete_document as api_delete_document,
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
async def search_document(
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
    documents = await global_search(
        user_id=user_id,
        search_text=keyword,
        time_start=time_start,
        time_end=time_end,
    )
    return documents["seed_chunks"] + documents["expanded_chunks"]


@document_mcp_router.tool()
async def search_document_vector(
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_search_knowledge_vector(
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_get_document_detail(
            document_detail_request=schemas.document.DocumentDetailRequest(document_id=document_id),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def list_document_labels(ctx: Context):
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_list_label(
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def get_document_label_summary(ctx: Context):
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_get_label_summary(
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def create_document_label(
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_add_label(
            label_add_request=schemas.document.LabelAddRequest(name=name),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def delete_document_labels(
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_delete_label(
            label_delete_request=schemas.document.LabelDeleteRequest(label_ids=label_ids),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def create_document_note(
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_create_note(
            note_create_request=schemas.document.DocumentNoteCreateRequest(
                document_id=document_id,
                content=content,
            ),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def search_document_notes(
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_search_note(
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
async def set_document_star_status(
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_star_document(
            star_request=schemas.document.StarRequest(
                document_id=document_id,
                status=status,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def set_document_read_status(
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
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_read_document(
            read_request=schemas.document.ReadRequest(
                document_id=document_id,
                status=status,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def create_document(
    category: int,
    from_plat: str,
    ctx: Context,
    sections: list[int] | None = None,
    labels: list[int] | None = None,
    title: str | None = None,
    description: str | None = None,
    cover: str | None = None,
    content: str | None = None,
    url: str | None = None,
    file_name: str | None = None,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    auto_transcribe: bool = False,
    auto_tag: bool = False,
):
    """
    Create a document in the current user's knowledge base.

    Use when the user asks to collect a link, create a quick note, register an uploaded file/audio
    document, or add source material to sections. This writes data and may enqueue automatic tasks.

    Args:
        category: Required Revornix document category enum.
        from_plat: Required source/platform label, for example "mcp", "web", or an integration name.
        sections: Optional section IDs to attach the document to.
        labels: Optional document label IDs.
        title: Optional title. Required or recommended for quick notes.
        description: Optional description.
        cover: Optional cover URL/path.
        content: Quick-note text content.
        url: Website URL for website documents.
        file_name: Uploaded file path/name for file or audio documents.
        auto_summary: Queue automatic summary when supported.
        auto_podcast: Queue automatic podcast when supported.
        auto_transcribe: Queue automatic transcription for audio when supported.
        auto_tag: Queue automatic tag generation when supported.

    Returns:
        Created `document_id`.

    When not to use:
        - Do not use this tool to update an existing document; use `update_document`.
        - Do not use this tool to upload binary content directly; upload first, then pass `file_name`.
        - Do not use this tool to create a section; use `create_section`.

    Examples:
        - Create a website document:
          `category=1, from_plat="mcp", url="https://example.com", title="Example"`
        - Create a quick note:
          `category=3, from_plat="mcp", title="Idea", content="Draft note", labels=[1]`
        - Register an uploaded file:
          `category=2, from_plat="mcp", file_name="uploads/report.pdf", sections=[10]`

    Notes:
        - Category values must match the backend `DocumentCategory` enum.
        - `sections` and `labels` are full lists of IDs to bind at creation time.
        - Automatic task flags may require configured models, engines, or file systems.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_create_document(
            document_create_request=schemas.document.DocumentCreateRequest(
                category=category,
                from_plat=from_plat,
                sections=sections or [],
                labels=labels or [],
                title=title,
                description=description,
                cover=cover,
                content=content,
                url=url,
                file_name=file_name,
                auto_summary=auto_summary,
                auto_podcast=auto_podcast,
                auto_transcribe=auto_transcribe,
                auto_tag=auto_tag,
            ),
            db=db,
            user=user,
            deployed_by_official=check_deployed_by_official_in_fuc(),
            authorization=get_authorization_from_headers(),
            x_user_timezone=get_raw_user_timezone_from_headers(),
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def update_document(
    document_id: int,
    ctx: Context,
    title: str | None = None,
    description: str | None = None,
    cover: str | None = None,
    labels: list[int] | None = None,
    sections: list[int] | None = None,
    content: str | None = None,
):
    """
    Update document metadata, labels, section bindings, or quick-note content.

    Use when the user asks to rename a document, edit description/cover, change labels, move it
    between sections, or edit quick-note text. Omitted optional fields are left unchanged.

    Args:
        document_id: Target document ID.
        title: Optional new title.
        description: Optional new description.
        cover: Optional new cover URL/path.
        labels: Complete desired document label ID list when provided.
        sections: Complete desired section ID list when provided.
        content: Only valid for quick-note documents.

    Returns:
        Standard success response.

    When not to use:
        - Do not use this tool to create a new document; use `create_document`.
        - Do not use this tool to modify non-quick-note source content directly.
        - Do not use this tool to mark external content as refreshed; use `touch_document_content`.

    Examples:
        - Rename a document: `document_id=128, title="Updated title"`
        - Replace labels: `document_id=128, labels=[1, 3]`
        - Move document to sections: `document_id=128, sections=[10, 11]`

    Notes:
        - Omitted fields remain unchanged.
        - `labels` and `sections`, when provided, are treated as complete desired lists.
        - Updating section bindings may trigger section processing according to section settings.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_update_document(
            document_update_request=schemas.document.DocumentUpdateRequest(
                document_id=document_id,
                title=title,
                description=description,
                cover=cover,
                labels=labels,
                sections=sections,
                content=content,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def delete_documents(document_ids: list[int], ctx: Context):
    """
    Delete one or more documents owned by the current user.

    Use only when the user explicitly wants deletion. This is destructive: it removes document
    records, labels, notes, user bindings, related task state, and graph/vector data.

    Args:
        document_ids: Document IDs to delete. The current user must own all documents.

    Returns:
        Standard success response.

    When not to use:
        - Do not use this tool to remove a document from a section only; use `update_document` with `sections`.
        - Do not use this tool for documents the user does not own.

    Examples:
        - Delete one document: `document_ids=[128]`
        - Delete multiple owned documents: `document_ids=[128, 129]`

    Notes:
        - This also deletes related graph/vector data from Neo4j and Milvus.
        - This operation should only be called after clear user confirmation.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_delete_document(
            documents_delete_request=schemas.document.DocumentDeleteRequest(document_ids=document_ids),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def touch_document_content(document_id: int, ctx: Context):
    """
    Mark a document's content as updated.

    Use after externally changing a document's source content so downstream section workflows can
    detect freshness changes. This does not edit the document body; it updates the content timestamp.

    Args:
        document_id: Target document ID.

    Returns:
        Standard success response.

    When not to use:
        - Do not use this tool to edit quick-note content; use `update_document`.
        - Do not use this tool to regenerate summaries, embeddings, or graphs directly.

    Examples:
        - Mark document 128 as content-updated: `document_id=128`

    Notes:
        - The authenticated user needs write access to the document.
        - This is a metadata freshness marker, not a content write operation.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_touch_document_content(
            request=schemas.document.DocumentDetailRequest(document_id=document_id),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def transform_document_markdown(document_id: int, ctx: Context):
    """
    Queue markdown conversion for a processed document.

    Use when a document has been processed but still needs Markdown output. The document must already
    have a process task. Returns a standard success response after enqueueing.

    Args:
        document_id: Target document ID.

    Returns:
        Standard success response after the conversion task is queued.

    When not to use:
        - Do not use this tool before the document has been processed.
        - Do not use this tool if Markdown conversion is already complete, queued, or running.

    Examples:
        - Convert document 128 to Markdown: `document_id=128`

    Notes:
        - The user must have a default file system configured.
        - Conversion is asynchronous; inspect document detail/task state later for progress.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_transform_markdown(
            transform_markdown_request=schemas.document.DocumentMarkdownConvertRequest(document_id=document_id),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def generate_document_summary(
    document_id: int,
    ctx: Context,
    model_id: int | None = None,
):
    """
    Queue AI summary generation for a processed document.

    Use when the user asks to summarize an existing document. The document must already be processed.
    `model_id` optionally overrides the user's default document reader model.

    Args:
        document_id: Target document ID.
        model_id: Optional model ID for summary generation.

    Returns:
        Standard success response after the summary task is queued.

    When not to use:
        - Do not use this tool before the document has been processed.
        - Do not use this tool if a summary task is already queued or running.
        - Do not use this tool to answer questions about document content; use document AI/chat flow.

    Examples:
        - Generate summary using defaults: `document_id=128`
        - Generate summary with model 5: `document_id=128, model_id=5`

    Notes:
        - The authenticated user needs write access to the document.
        - The selected model must be accessible to the user.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_create_ai_summary(
            ai_summary_request=schemas.document.DocumentAiSummaryRequest(
                document_id=document_id,
                model_id=model_id,
            ),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def generate_document_embedding(document_id: int, ctx: Context):
    """
    Queue embedding generation for a processed document.

    Use when the document should become available for vector/semantic retrieval. The document must
    already be processed.

    Args:
        document_id: Target document ID.

    Returns:
        Standard success response after the embedding task is queued.

    When not to use:
        - Do not use this tool before the document has been processed.
        - Do not use this tool if embedding is already complete, queued, or running.

    Examples:
        - Generate embeddings for document 128: `document_id=128`

    Notes:
        - Embedding generation is asynchronous.
        - Generated embeddings power semantic/vector document retrieval.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_create_embedding(
            embedding_request=schemas.document.DocumentEmbeddingRequest(document_id=document_id),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def transcribe_document_audio(
    document_id: int,
    ctx: Context,
    engine_id: int | None = None,
):
    """
    Queue transcription for a processed audio document.

    Use when the user asks to transcribe an audio document. `engine_id` optionally overrides the
    user's default audio transcription engine.

    Args:
        document_id: Target audio document ID.
        engine_id: Optional transcription engine ID.

    Returns:
        Standard success response after the transcription task is queued.

    When not to use:
        - Do not use this tool for non-audio documents.
        - Do not use this tool before the document has been processed.
        - Do not use this tool if transcription is already complete, queued, or running.

    Examples:
        - Transcribe with defaults: `document_id=128`
        - Transcribe with engine 4: `document_id=128, engine_id=4`

    Notes:
        - The selected engine must be accessible to the user.
        - Transcription is asynchronous.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_transcribe_audio_document(
            transcribe_request=schemas.document.DocumentTranscribeRequest(
                document_id=document_id,
                engine_id=engine_id,
            ),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def generate_document_graph(
    document_id: int,
    ctx: Context,
    model_id: int | None = None,
):
    """
    Queue knowledge graph generation for a processed document.

    Use when the user asks to build or refresh graph/entity relationships for a document. The
    document must already be processed. `model_id` optionally overrides the default reader model.

    Args:
        document_id: Target document ID.
        model_id: Optional model ID for entity/relation extraction.

    Returns:
        Standard success response after the graph task is queued.

    When not to use:
        - Do not use this tool before the document has been processed.
        - Do not use this tool if graph generation is already complete, queued, or running.
        - Do not use this tool to read an existing graph; use `search_document_graph`.

    Examples:
        - Generate graph using defaults: `document_id=128`
        - Generate graph with model 5: `document_id=128, model_id=5`

    Notes:
        - Generated graph data powers graph MCP tools.
        - The selected model must be accessible to the user.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_generate_graph(
            graph_generate_request=schemas.document.DocumentGraphGenerateRequest(
                document_id=document_id,
                model_id=model_id,
            ),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def generate_document_podcast(
    document_id: int,
    ctx: Context,
    engine_id: int | None = None,
):
    """
    Queue podcast generation for a processed document.

    Use when the user asks to create an audio podcast from a document. The document must already be
    processed and the user must have a default file system. `engine_id` optionally overrides the
    default podcast engine.

    Args:
        document_id: Target document ID.
        engine_id: Optional podcast engine ID.

    Returns:
        Standard success response after the podcast task is queued.

    When not to use:
        - Do not use this tool before the document has been processed.
        - Do not use this tool if a podcast task is already queued or generating.
        - Do not use this tool to generate a section podcast; use `generate_section_podcast`.

    Examples:
        - Generate podcast with defaults: `document_id=128`
        - Generate podcast with engine 7: `document_id=128, engine_id=7`

    Notes:
        - A default file system and podcast engine are required unless `engine_id` covers the engine.
        - Podcast generation is asynchronous.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_generate_podcast(
            generate_podcast_request=schemas.document.GenerateDocumentPodcastRequest(
                document_id=document_id,
                engine_id=engine_id,
            ),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def cancel_document_summary(document_id: int, ctx: Context):
    """
    Cancel an active queued/running document summary task.

    Use only when the user explicitly wants to stop summary generation.

    Args:
        document_id: Target document ID.

    Returns:
        Standard success response after cancellation.

    When not to use:
        - Do not use this tool for completed or failed summary tasks.
        - Do not use this tool without an explicit cancel/stop intent.

    Examples:
        - Cancel summary generation for document 128: `document_id=128`

    Notes:
        - The authenticated user needs write access to the document.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_cancel_ai_summary(
            cancel_request=schemas.document.CancelDocumentTaskRequest(document_id=document_id),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def cancel_document_embedding(document_id: int, ctx: Context):
    """
    Cancel an active queued/running document embedding task.

    Use only when the user explicitly wants to stop embedding generation.

    Args:
        document_id: Target document ID.

    Returns:
        Standard success response after cancellation.

    When not to use:
        - Do not use this tool for completed or failed embedding tasks.
        - Do not use this tool without an explicit cancel/stop intent.

    Examples:
        - Cancel embedding generation for document 128: `document_id=128`

    Notes:
        - The authenticated user needs write access to the document.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_cancel_embedding(
            cancel_request=schemas.document.CancelDocumentTaskRequest(document_id=document_id),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def cancel_document_transcription(document_id: int, ctx: Context):
    """
    Cancel an active queued/running document transcription task.

    Use only when the user explicitly wants to stop audio transcription.

    Args:
        document_id: Target document ID.

    Returns:
        Standard success response after cancellation.

    When not to use:
        - Do not use this tool for completed or failed transcription tasks.
        - Do not use this tool without an explicit cancel/stop intent.

    Examples:
        - Cancel transcription for document 128: `document_id=128`

    Notes:
        - The authenticated user needs write access to the document.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_cancel_transcribe(
            cancel_request=schemas.document.CancelDocumentTaskRequest(document_id=document_id),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def cancel_document_graph(document_id: int, ctx: Context):
    """
    Cancel an active queued/running document graph generation task.

    Use only when the user explicitly wants to stop graph generation.

    Args:
        document_id: Target document ID.

    Returns:
        Standard success response after cancellation.

    When not to use:
        - Do not use this tool for completed or failed graph tasks.
        - Do not use this tool without an explicit cancel/stop intent.

    Examples:
        - Cancel graph generation for document 128: `document_id=128`

    Notes:
        - The authenticated user needs write access to the document.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_cancel_graph(
            cancel_request=schemas.document.CancelDocumentTaskRequest(document_id=document_id),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def cancel_document_podcast(document_id: int, ctx: Context):
    """
    Cancel an active queued/running document podcast task.

    Use only when the user explicitly wants to stop podcast generation.

    Args:
        document_id: Target document ID.

    Returns:
        Standard success response after cancellation.

    When not to use:
        - Do not use this tool for completed or failed podcast tasks.
        - Do not use this tool without an explicit cancel/stop intent.

    Examples:
        - Cancel podcast generation for document 128: `document_id=128`

    Notes:
        - The authenticated user needs write access to the document.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_cancel_podcast(
            cancel_request=schemas.document.CancelDocumentTaskRequest(document_id=document_id),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@document_mcp_router.tool()
async def get_document_month_summary(ctx: Context):
    """
    Return monthly document creation statistics for the current user.

    Use for dashboards, activity summaries, and trend views. This is read-only.

    Returns:
        A list of monthly/date summary items with document totals.

    When not to use:
        - Do not use this tool to list actual documents; use document search tools.
        - Do not use this tool for section statistics.

    Examples:
        - Show the user's document creation activity summary.

    Notes:
        - The result is scoped to the authenticated user.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_get_month_summary(db=db, user=user)
        return res.model_dump(mode="json")
