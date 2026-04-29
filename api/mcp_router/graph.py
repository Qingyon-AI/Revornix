from fastmcp import Context, FastMCP

import schemas
from mcp_router.auth import UserAuthMiddleware, db_session, get_user_from_ctx
from router.graph import (
    document_graph as api_document_graph,
    graph as api_graph_search,
    section_graph as api_section_graph,
)


graph_mcp_router = FastMCP(
    name="Graph-MCP-Server"
)

graph_mcp_router.add_middleware(UserAuthMiddleware())


@graph_mcp_router.tool()
async def search_mine_graph(ctx: Context):
    """
    Query the full entity-relation graph for the current user's knowledge base.

    Use this tool when you need a global graph view across the user's documents for clustering,
    relationship discovery, visualization, or high-level structure analysis.

    Returns:
        A graph object containing `nodes` and `edges`. Nodes commonly include entity ID, text,
        degree, and source document or chunk references.

    When not to use:
        - Do not use this tool to fetch document body text or document metadata.
        - Do not use this tool for keyword or semantic content retrieval; use document search tools instead.
        - Do not use this tool when you only need the graph for a single document or section.

    Examples:
        - Fetch the current user's global knowledge graph.
        - Build a relationship overview across all accessible documents.

    Notes:
        - The scope is limited to graph data owned by or accessible to the authenticated user.
        - Large knowledge bases may produce a large number of nodes and edges.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_graph_search(user=user)
        return res.model_dump(mode="json")


@graph_mcp_router.tool()
async def search_document_graph(
    document_id: int,
    ctx: Context,
):
    """
    Query the entity-relation graph for a single document.

    Use this tool when you need to analyze which entities appear inside a document and how they relate
    to each other, or when you want a document-specific graph view for visualization or structured analysis.

    Args:
        document_id: Target document ID. The authenticated user must have access to this document.

    Returns:
        A graph object containing `nodes` and `edges`. Node sources point back to related document chunks,
        which helps with evidence tracing.

    When not to use:
        - Do not use this tool for document metadata; use `get_document_detail`.
        - Do not use this tool for semantic search; use `search_document` or `search_document_vector`.
        - Do not use this tool for cross-document graph analysis; use `search_mine_graph` or `search_section_graph`.

    Examples:
        - Fetch the graph for document 128: `document_id=128`
        - Inspect entity relationships in a specific source document.

    Notes:
        - This tool is document-scoped and does not provide a global graph view.
        - If the graph has not been generated for the document, the result may be empty.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_document_graph(
            document_graph_request=schemas.graph.DocumentGraphRequest(document_id=document_id),
            user=user,
        )
        return res.model_dump(mode="json")


@graph_mcp_router.tool()
async def search_section_graph(
    section_id: int,
    ctx: Context,
):
    """
    Query the aggregated entity-relation graph for all documents in a section.

    Use this tool when you need to analyze the knowledge structure of a section,
    inspect shared entities across multiple documents, or build a section-level graph visualization.

    Args:
        section_id: Target section ID. The authenticated user must have access to this section.

    Returns:
        A graph object containing `nodes` and `edges`. Nodes include source document and chunk references
        so the caller can trace graph evidence back to section content.

    When not to use:
        - Do not use this tool to fetch section metadata or section document lists.
        - Do not use this tool when you only need the graph for a single document.
        - Do not use this tool for keyword retrieval over section content.

    Examples:
        - Fetch the aggregated graph for section 32: `section_id=32`
        - Compare entities shared across documents in one section.

    Notes:
        - If the section is private, the authenticated user must be a member or creator.
        - This tool returns a section-level aggregated graph, not a single-document detail response.
    """
    async with db_session() as db:
        user = await get_user_from_ctx(ctx, db)
        res = await api_section_graph(
            section_graph_request=schemas.graph.SectionGraphRequest(section_id=section_id),
            user=user,
            db=db,
        )
        return res.model_dump(mode="json")
