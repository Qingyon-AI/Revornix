from fastmcp import Context, FastMCP

import schemas
from enums.section import UserSectionRole
from mcp_router.auth import (
    UserAuthMiddleware,
    db_session,
    get_request_timezone_from_headers,
    get_user_from_ctx,
)
from router.section import (
    cancel_podcast as api_cancel_podcast,
    cancel_ppt as api_cancel_ppt,
    cancel_process as api_cancel_process,
    create_section as api_create_section,
    delete_section as api_delete_section,
    generate_podcast as api_generate_podcast,
    generate_ppt as api_generate_ppt,
    retry_section_document_integration as api_retry_section_document_integration,
    trigger_section_process as api_trigger_section_process,
    update_section as api_update_section,
)
from router.section_detail_query import (
    get_date_section_info as api_get_date_section_info,
    get_section_detail as api_get_section_detail,
    get_section_markdown_content as api_get_section_markdown_content,
    section_document_request as api_section_document_request,
)
from router.section_label_manage import (
    add_label as api_add_label,
    delete_label as api_delete_label,
    list_label as api_list_label,
)
from router.section_search_query import (
    get_all_mine_sections as api_get_all_mine_sections,
    get_my_subscribed_sections as api_get_my_subscribed_sections,
    public_sections as api_public_sections,
    search_mine_sections as api_search_mine_sections,
    search_user_sections as api_search_user_sections,
)
from router.section_subscription_manage import subscribe_section as api_subscribe_section
from router.section_user_query import (
    get_mine_section_role_and_authority as api_get_mine_section_role_and_authority,
    get_section_user_role_and_authority as api_get_section_user_role_and_authority,
    section_user_request as api_section_user_request,
)


section_mcp_router = FastMCP(
    name="Section-MCP-Server"
)

section_mcp_router.add_middleware(UserAuthMiddleware())


def _plain_text_response_body(response) -> str:
    body = getattr(response, "body", None)
    if isinstance(body, bytes):
        return body.decode("utf-8")
    if body is None:
        return str(response)
    return str(body)


@section_mcp_router.tool()
async def search_my_sections(
    ctx: Context,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10,
    label_ids: list[int] | None = None,
    desc: bool = True,
):
    """
    Search sections the current user owns or can edit/read as a member.

    Use this tool when you need a paginated list of the authenticated user's own or collaborative
    sections, optionally filtered by keyword or section label IDs.

    Args:
        keyword: Optional title/description keyword.
        start: Optional pagination cursor from a previous `next_start`.
        limit: Page size.
        label_ids: Optional section label IDs.
        desc: `True` for newest first.

    Returns:
        Paginated section summaries with authority, labels, publish state, and task metadata.

    When not to use:
        - Do not use this tool for public community discovery; use `search_public_sections`.
        - Do not use this tool for subscribed sections only; use `search_my_subscribed_sections`.
        - Do not use this tool when you already know the section ID and need full detail; use `get_section_detail`.

    Examples:
        - Search the user's sections by keyword: `keyword="weekly review", limit=10`
        - Filter sections by labels: `label_ids=[1, 3], desc=True`

    Notes:
        - The result is scoped to sections the authenticated user can access as creator or member.
        - Use `next_start` from the response to request the next page.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_search_mine_sections(
            search_mine_sections_request=schemas.section.SearchMineSectionsRequest(
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


@section_mcp_router.tool()
async def list_my_sections(ctx: Context):
    """
    Return a compact list of all sections where the current user is creator or member.

    Use for selectors, quick lookups, or deciding which `section_id` to pass to another tool.
    This is not paginated and returns lightweight section records.

    Returns:
        A non-paginated list of lightweight section records with authority and publish metadata.

    When not to use:
        - Do not use this tool for large searchable lists; use `search_my_sections`.
        - Do not use this tool for public or subscribed section discovery.

    Examples:
        - Load all editable sections before attaching a document to a section.
        - Build a small section selector for the current user.

    Notes:
        - This tool returns only sections where the user is creator or member, not subscribed-only sections.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_get_all_mine_sections(db=db, user=user)
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def search_my_subscribed_sections(
    ctx: Context,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10,
    label_ids: list[int] | None = None,
    desc: bool = True,
):
    """
    Search sections the current user subscribed to.

    Use this tool when you need a paginated reading/subscription feed for the authenticated user.

    Args:
        keyword: Optional title/description keyword.
        start: Optional pagination cursor.
        limit: Page size.
        label_ids: Optional section label IDs.
        desc: `True` for newest first.

    Returns:
        Paginated subscribed section summaries.

    When not to use:
        - Do not use this tool for sections the user owns or edits; use `search_my_sections`.
        - Do not use this tool for all public sections; use `search_public_sections`.

    Examples:
        - Find subscribed sections related to AI: `keyword="AI", limit=10`
        - Continue a subscribed-section page: `start=42, limit=10`

    Notes:
        - Results are limited to sections where the authenticated user has subscriber role.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_get_my_subscribed_sections(
            search_subscribed_section_request=schemas.section.SearchSubscribedSectionRequest(
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


@section_mcp_router.tool()
async def search_public_sections(
    ctx: Context,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10,
    label_ids: list[int] | None = None,
    desc: bool = True,
):
    """
    Search published public sections across Revornix.

    Use for community discovery or finding shareable public knowledge sections. The result may
    include current-user subscription/authority state when available.

    Args:
        keyword: Optional title/description keyword.
        start: Optional pagination cursor.
        limit: Page size.
        label_ids: Optional section label IDs.
        desc: `True` for newest first.

    Returns:
        Paginated public section summaries.

    When not to use:
        - Do not use this tool to search the user's private sections; use `search_my_sections`.
        - Do not use this tool when you already know the section ID; use `get_section_detail`.

    Examples:
        - Discover public sections about product research: `keyword="product research"`
        - List newest public sections: `limit=20, desc=True`

    Notes:
        - Only published sections are returned.
        - Authenticated-user subscription state may be included when available.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_public_sections(
            search_public_sections_request=schemas.section.SearchPublicSectionsRequest(
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


@section_mcp_router.tool()
async def search_user_sections(
    user_id: int,
    ctx: Context,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10,
    label_ids: list[int] | None = None,
    desc: bool = True,
):
    """
    Search sections created by a specific user.

    Use when the caller knows `user_id`. For other users, private sections are hidden. For the
    authenticated user's own ID, accessible private sections are included.

    Args:
        user_id: Target creator/user ID.
        keyword: Optional title/description keyword.
        start: Optional pagination cursor.
        limit: Page size.
        label_ids: Optional section label IDs.
        desc: `True` for newest first.

    Returns:
        Paginated section summaries for the requested user.

    When not to use:
        - Do not use this tool without a known user ID; use `search_public_sections` or `search_my_sections`.
        - Do not use this tool for subscribed-only sections.

    Examples:
        - Search user 8's public sections: `user_id=8, keyword="design"`
        - List your own sections by user ID when known: `user_id=3, limit=10`

    Notes:
        - Private sections from other users are not returned unless access rules allow it.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_search_user_sections(
            search_user_sections_request=schemas.section.SearchUserSectionsRequest(
                user_id=user_id,
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


@section_mcp_router.tool()
async def get_section_detail(section_id: int, ctx: Context):
    """
    Get complete metadata for one section.

    Use after selecting a `section_id` to inspect labels, publish state, document integration
    counts, process task, podcast task, PPT preview, graph freshness, and current-user authority.

    Args:
        section_id: Target section ID.

    Returns:
        Full section metadata, including creator, labels, document counts, task state, publish UUID,
        markdown/podcast/PPT file references, and current-user authority.

    When not to use:
        - Do not use this tool to list documents in the section; use `list_section_documents`.
        - Do not use this tool to read generated markdown; use `get_section_markdown_content`.

    Examples:
        - Inspect section 32: `section_id=32`
        - Check whether a section has finished processing before reading markdown.

    Notes:
        - Private sections require access permission.
        - File fields may be signed URLs depending on storage configuration.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_get_section_detail(
            section_detail_request=schemas.section.SectionDetailRequest(section_id=section_id),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def get_section_markdown_content(section_id: int, ctx: Context):
    """
    Read the generated markdown body for one section.

    Use only when section detail shows markdown is ready. Returns plain markdown text. Use
    `get_section_detail` first if you need metadata or readiness state.

    Args:
        section_id: Target section ID.

    Returns:
        Plain markdown text for the generated section content.

    When not to use:
        - Do not use this tool for section metadata; use `get_section_detail`.
        - Do not use this tool before section processing has produced markdown.

    Examples:
        - Read generated markdown for section 32: `section_id=32`

    Notes:
        - The section must have an `md_file_name`; otherwise the API returns an error.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_get_section_markdown_content(
            section_detail_request=schemas.section.SectionDetailRequest(section_id=section_id),
            user=user,
            db=db,
        )
        return _plain_text_response_body(res)


@section_mcp_router.tool()
async def list_section_documents(
    section_id: int,
    ctx: Context,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10,
    desc: bool = True,
):
    """
    List documents included in a section.

    Use this tool when you need to inspect the source documents attached to a section, including each
    document's section integration status.

    Args:
        section_id: Section ID to inspect.
        keyword: Optional document title/description keyword.
        start: Optional pagination cursor.
        limit: Page size.
        desc: `True` for newest first.

    Returns:
        Paginated document summaries with section integration status and labels.

    When not to use:
        - Do not use this tool for full document details; use `get_document_detail`.
        - Do not use this tool for section metadata; use `get_section_detail`.
        - Do not use this tool to search all user documents; use document search tools.

    Examples:
        - List the first page of section documents: `section_id=32, limit=10`
        - Search documents inside a section: `section_id=32, keyword="market"`

    Notes:
        - Public/private visibility follows the section access rules.
        - The `status` field describes section-document integration state.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_section_document_request(
            section_document_request=schemas.section.SectionDocumentRequest(
                section_id=section_id,
                keyword=keyword,
                start=start,
                limit=limit,
                desc=desc,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def get_day_section(date: str, ctx: Context):
    """
    Get the current user's daily section for a calendar date.

    Use this tool when working with daily sections, daily summaries, or date-based section workflows.

    Args:
        date: Required date string in `YYYY-MM-DD` format.

    Returns:
        Existing daily section data, or default daily-section settings with `is_created=False`
        when no daily section exists for that date.

    When not to use:
        - Do not use this tool for arbitrary section lookup; use `get_section_detail`.
        - Do not use this tool to create the daily section; use `create_section` if creation is needed.

    Examples:
        - Get today's daily section: `date="2026-04-30"`
        - Check whether a daily section exists for a date before creating one.

    Notes:
        - The date is interpreted as a calendar date string; pass the user's intended local date.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_get_date_section_info(
            day_section_request=schemas.section.DaySectionRequest(date=date),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def list_section_labels(ctx: Context):
    """
    List section labels owned by the current user.

    Use before `search_my_sections`, `create_section`, or `update_section` when the client needs
    valid section label IDs.

    Returns:
        A list of section labels with `id` and `name`.

    When not to use:
        - Do not use this tool for document labels; use `list_document_labels`.

    Examples:
        - Fetch labels before creating a section with `labels=[...]`.

    Notes:
        - Only labels owned by the authenticated user are returned.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_list_label(db=db, user=user)
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def create_section_label(name: str, ctx: Context):
    """
    Create a section label for the current user.

    Use this tool when the user needs a new section category/tag before creating or filtering sections.

    Args:
        name: Label name to create.

    Returns:
        Created label ID and name.

    When not to use:
        - Do not use this tool to label a document; use document label tools.
        - Do not use this tool to attach a label to a section; use `create_section` or `update_section`.

    Examples:
        - Create a label for research sections: `name="Research"`

    Notes:
        - This creates the label definition only.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_add_label(
            label_add_request=schemas.section.LabelAddRequest(name=name),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def delete_section_labels(label_ids: list[int], ctx: Context):
    """
    Delete section labels owned by the current user.

    Use this tool when the user explicitly asks to remove obsolete section labels.

    Args:
        label_ids: Label IDs to delete. This removes the label definitions and their bindings.

    Returns:
        Standard success response.

    When not to use:
        - Do not use this tool to remove labels from one section only; use `update_section`.
        - Do not use this tool for document labels.

    Examples:
        - Delete unused section labels: `label_ids=[4, 7]`

    Notes:
        - This is destructive for the label definitions owned by the authenticated user.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_delete_label(
            label_delete_request=schemas.section.LabelDeleteRequest(label_ids=label_ids),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def create_section(
    title: str,
    description: str,
    labels: list[int],
    process_task_trigger_type: int,
    ctx: Context,
    cover: str | None = None,
    auto_publish: bool = False,
    auto_podcast: bool = False,
    auto_illustration: bool = False,
    process_task_trigger_scheduler: str | None = None,
):
    """
    Create a new section.

    Use when the user asks to create a knowledge section/collection. This writes data and may create
    a scheduled processing job.

    Args:
        title: Required section title.
        description: Required section description.
        labels: Section label IDs; pass `[]` when no labels are needed.
        process_task_trigger_type: Section trigger enum. Use scheduler only with `process_task_trigger_scheduler`.
        cover: Optional cover URL/path.
        auto_publish: Whether to publish immediately.
        auto_podcast: Whether processing should also generate podcasts.
        auto_illustration: Whether processing should generate illustrations.
        process_task_trigger_scheduler: Optional cron expression, interpreted in `x-user-timezone`.

    Returns:
        Created section ID.

    When not to use:
        - Do not use this tool to create a document; use `create_document`.
        - Do not use this tool to update an existing section; use `update_section`.

    Examples:
        - Create a private section: `title="AI Research", description="Papers and notes", labels=[]`
        - Create an auto-published scheduled section with a cron expression.

    Notes:
        - `process_task_trigger_type` must match the backend enum values.
        - Scheduler cron expressions use the `x-user-timezone` request header when present.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_create_section(
            section_create_request=schemas.section.SectionCreateRequest(
                title=title,
                description=description,
                cover=cover,
                labels=labels,
                auto_publish=auto_publish,
                auto_podcast=auto_podcast,
                auto_illustration=auto_illustration,
                process_task_trigger_type=process_task_trigger_type,
                process_task_trigger_scheduler=process_task_trigger_scheduler,
            ),
            db=db,
            user=user,
            request_timezone=get_request_timezone_from_headers(),
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def update_section(
    section_id: int,
    ctx: Context,
    title: str | None = None,
    description: str | None = None,
    cover: str | None = None,
    labels: list[int] | None = None,
    auto_podcast: bool | None = None,
    auto_illustration: bool | None = None,
    process_task_trigger_type: int | None = None,
    process_task_trigger_scheduler: str | None = None,
):
    """
    Update section metadata, labels, and automation settings.

    Use when the user asks to rename/edit a section, change labels, toggle auto podcast/illustration,
    or update processing trigger settings. Omitted optional fields are left unchanged.

    Args:
        section_id: Target section ID.
        title: Optional new title.
        description: Optional new description.
        cover: Optional new cover URL/path.
        labels: Complete desired label ID list when provided.
        auto_podcast: Optional toggle for automatic podcast generation.
        auto_illustration: Optional toggle for automatic illustration generation.
        process_task_trigger_type: Optional trigger enum value.
        process_task_trigger_scheduler: Optional cron expression for scheduled processing.

    Returns:
        Standard success response.

    When not to use:
        - Do not use this tool to change section documents; update document section bindings instead.
        - Do not use this tool to trigger immediate processing; use `trigger_section_process`.

    Examples:
        - Rename a section: `section_id=32, title="Updated title"`
        - Replace labels: `section_id=32, labels=[1, 5]`

    Notes:
        - Omitted fields are not changed.
        - Updating labels uses the provided list as the complete desired set.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_update_section(
            section_update_request=schemas.section.SectionUpdateRequest(
                section_id=section_id,
                title=title,
                description=description,
                cover=cover,
                labels=labels,
                auto_podcast=auto_podcast,
                auto_illustration=auto_illustration,
                process_task_trigger_type=process_task_trigger_type,
                process_task_trigger_scheduler=process_task_trigger_scheduler,
            ),
            db=db,
            user=user,
            request_timezone=get_request_timezone_from_headers(),
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def delete_section(section_id: int, ctx: Context):
    """
    Delete a section owned by the current user.

    This is destructive: it removes the section, user bindings, labels, comments, and document
    associations for the section. It does not delete the source documents themselves.

    Args:
        section_id: Section ID to delete.

    Returns:
        Standard success response.

    When not to use:
        - Do not use this tool to remove one document from a section; update document section bindings.
        - Do not use this tool unless the user explicitly asked to delete the section.

    Examples:
        - Delete section 32: `section_id=32`

    Notes:
        - Only the section creator can delete the section.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_delete_section(
            section_delete_request=schemas.section.SectionDeleteRequest(section_id=section_id),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def set_section_subscription_status(section_id: int, status: bool, ctx: Context):
    """
    Subscribe or unsubscribe the current user from a section.

    Use this tool when the user asks to follow/unfollow or subscribe/unsubscribe a public section.

    Args:
        section_id: Target section ID.
        status: `True` to subscribe, `False` to unsubscribe.

    Returns:
        Standard success response.

    When not to use:
        - Do not use this tool for creator/member management.
        - Do not use this tool to inspect subscription state; use `get_section_detail`.

    Examples:
        - Subscribe to a section: `section_id=32, status=True`
        - Unsubscribe from a section: `section_id=32, status=False`

    Notes:
        - Creator/member roles are not converted into subscriber role by this tool.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_subscribe_section(
            section_subscribe_request=schemas.section.SectionSubscribeRequest(
                section_id=section_id,
                status=status,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def trigger_section_process(
    section_id: int,
    ctx: Context,
    model_id: int | None = None,
    image_engine_id: int | None = None,
    podcast_engine_id: int | None = None,
):
    """
    Queue a full rebuild/process task for a section.

    Use when the section content should be regenerated from its documents. Optional engine/model IDs
    override the user's defaults for this run.

    Args:
        section_id: Target section ID.
        model_id: Optional document reader model ID.
        image_engine_id: Optional image generation engine ID for illustrations.
        podcast_engine_id: Optional podcast engine ID when the section has auto podcast enabled.

    Returns:
        Standard success response after the process task is queued.

    When not to use:
        - Do not use this tool merely to read section content; use `get_section_markdown_content`.
        - Do not use this tool if a section process task is already queued or running.

    Examples:
        - Trigger processing with defaults: `section_id=32`
        - Trigger processing with a specific model: `section_id=32, model_id=5`

    Notes:
        - Only the section creator can trigger processing.
        - The user must have configured required default engines/models unless IDs are provided.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_trigger_section_process(
            trigger_process_request=schemas.section.TriggerSectionProcessRequest(
                section_id=section_id,
                model_id=model_id,
                image_engine_id=image_engine_id,
                podcast_engine_id=podcast_engine_id,
            ),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def retry_section_document(section_id: int, document_id: int, ctx: Context):
    """
    Retry integrating one document into a section.

    Use when `list_section_documents` or `get_section_detail` shows a section document integration
    failed or is not complete. This queues section processing for the affected document.

    Args:
        section_id: Target section ID.
        document_id: Document ID inside that section.

    Returns:
        Standard success response after retry is queued.

    When not to use:
        - Do not use this tool for documents already integrated successfully.
        - Do not use this tool if the section is already processing.

    Examples:
        - Retry document 128 in section 32: `section_id=32, document_id=128`

    Notes:
        - The authenticated user needs write/full authority for the section.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_retry_section_document_integration(
            retry_request=schemas.section.RetrySectionDocumentRequest(
                section_id=section_id,
                document_id=document_id,
            ),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def generate_section_podcast(
    section_id: int,
    ctx: Context,
    engine_id: int | None = None,
):
    """
    Queue podcast generation for a processed section.

    Use after section markdown is ready. `engine_id` optionally overrides the user's default podcast
    engine for this task.

    Args:
        section_id: Target section ID.
        engine_id: Optional podcast engine ID.

    Returns:
        Standard success response after the podcast task is queued.

    When not to use:
        - Do not use this tool before section markdown is ready.
        - Do not use this tool if a podcast task is already queued or generating.

    Examples:
        - Generate podcast using defaults: `section_id=32`
        - Generate podcast with engine 9: `section_id=32, engine_id=9`

    Notes:
        - Only the section creator can generate a section podcast.
        - A default file system and podcast engine are required.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_generate_podcast(
            generate_podcast_request=schemas.section.GenerateSectionPodcastRequest(
                section_id=section_id,
                engine_id=engine_id,
            ),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def generate_section_ppt(
    section_id: int,
    ctx: Context,
    model_id: int | None = None,
    image_engine_id: int | None = None,
):
    """
    Queue PPT generation for a processed section.

    Use after section markdown is ready. Optional `model_id` and `image_engine_id` override the
    user's defaults for slide planning and image generation.

    Args:
        section_id: Target section ID.
        model_id: Optional model ID for slide planning.
        image_engine_id: Optional image generation engine ID.

    Returns:
        Standard success response after the PPT task is queued.

    When not to use:
        - Do not use this tool before section markdown is ready.
        - Do not use this tool if a PPT task is already queued or processing.

    Examples:
        - Generate PPT using defaults: `section_id=32`
        - Generate PPT with specific model and image engine.

    Notes:
        - Only the section creator can generate PPT.
        - The generated PPT status can be inspected through `get_section_detail`.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_generate_ppt(
            generate_ppt_request=schemas.section.GenerateSectionPptRequest(
                section_id=section_id,
                model_id=model_id,
                image_engine_id=image_engine_id,
            ),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def cancel_section_process(section_id: int, ctx: Context):
    """
    Cancel an active queued/running section process task.

    Use only when the user explicitly wants to stop section processing.

    Args:
        section_id: Target section ID.

    Returns:
        Standard success response after cancellation.

    When not to use:
        - Do not use this tool for completed or failed tasks.
        - Do not use this tool without an explicit cancel/stop intent.

    Examples:
        - Cancel section processing: `section_id=32`

    Notes:
        - Only the section creator can cancel the process task.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_cancel_process(
            cancel_request=schemas.section.CancelSectionTaskRequest(section_id=section_id),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def cancel_section_podcast(section_id: int, ctx: Context):
    """
    Cancel an active queued/running section podcast task.

    Use only when the user explicitly wants to stop podcast generation.

    Args:
        section_id: Target section ID.

    Returns:
        Standard success response after cancellation.

    When not to use:
        - Do not use this tool for completed podcast tasks.
        - Do not use this tool to delete generated podcast files.

    Examples:
        - Cancel section podcast generation: `section_id=32`

    Notes:
        - Only the section creator can cancel podcast generation.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_cancel_podcast(
            cancel_request=schemas.section.CancelSectionTaskRequest(section_id=section_id),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def cancel_section_ppt(section_id: int, ctx: Context):
    """
    Cancel an active queued/running section PPT task.

    Use only when the user explicitly wants to stop PPT generation.

    Args:
        section_id: Target section ID.

    Returns:
        Standard success response after cancellation.

    When not to use:
        - Do not use this tool for completed PPT tasks.
        - Do not use this tool to delete generated PPT files.

    Examples:
        - Cancel section PPT generation: `section_id=32`

    Notes:
        - Only the section creator can cancel PPT generation.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_cancel_ppt(
            cancel_request=schemas.section.CancelSectionTaskRequest(section_id=section_id),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def get_my_section_role_and_authority(section_id: int, ctx: Context):
    """
    Get the authenticated user's role and authority in a section.

    Use before write operations when the client needs to confirm whether the user can edit/manage
    the section.

    Args:
        section_id: Target section ID.

    Returns:
        Role and authority for the authenticated user in the section.

    When not to use:
        - Do not use this tool to list all section members; use `list_section_users`.
        - Do not use this tool for another user's authority; use `get_section_user_role_and_authority`.

    Examples:
        - Check my permission in section 32: `section_id=32`

    Notes:
        - Returns an error if the authenticated user is not associated with the section.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_get_mine_section_role_and_authority(
            section_user_get_request=schemas.section.MineSectionRoleAndAuthorityRequest(
                section_id=section_id,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def get_section_user_role_and_authority(section_id: int, user_id: int, ctx: Context):
    """
    Get a specific user's role and authority in a section.

    Use for member-management flows when both `section_id` and `user_id` are known.

    Args:
        section_id: Target section ID.
        user_id: Target user ID.

    Returns:
        Role and authority for the requested user in the section.

    When not to use:
        - Do not use this tool to search users; use `list_section_users`.
        - Do not use this tool for the current user when `get_my_section_role_and_authority` is sufficient.

    Examples:
        - Check user 8 in section 32: `section_id=32, user_id=8`

    Notes:
        - The authenticated caller must be authorized to inspect the section.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_get_section_user_role_and_authority(
            section_user_get_request=schemas.section.SectionUserRoleAndAuthorityRequest(
                section_id=section_id,
                user_id=user_id,
            ),
            db=db,
            _user=user,
        )
        return res.model_dump(mode="json")


@section_mcp_router.tool()
async def list_section_users(
    section_id: int,
    ctx: Context,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10,
    filter_roles: list[UserSectionRole] | None = None,
):
    """
    List users associated with a section.

    Use this tool for section member/subscriber lists, member management screens, or permission audits.

    Args:
        section_id: Target section ID.
        keyword: Optional user search keyword.
        start: Optional pagination cursor.
        limit: Page size.
        filter_roles: Optional role enum values to include.

    Returns:
        Paginated users with role and authority fields.

    When not to use:
        - Do not use this tool to check only the current user's permission; use `get_my_section_role_and_authority`.
        - Do not use this tool for document collaborators.

    Examples:
        - List section users: `section_id=32, limit=10`
        - Filter by role enum values: `section_id=32, filter_roles=[1, 2]`

    Notes:
        - Private sections require creator/member access to inspect users.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_section_user_request(
            section_user_request=schemas.section.SectionUserRequest(
                section_id=section_id,
                keyword=keyword,
                start=start,
                limit=limit,
                filter_roles=filter_roles,
            ),
            db=db,
            user=user,
        )
        return res.model_dump(mode="json")
