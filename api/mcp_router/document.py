from data.milvus.search import naive_search
from mcp.server.fastmcp import FastMCP

# Initialize the MCP server with your tools
document_mcp_router = FastMCP(
    name="Document-MCP-Server"
)

@document_mcp_router.tool()
def search_document(keyword: str):
    "Search for documents in milvus with the given keyword"
    documents = naive_search(search_text=keyword)
    documents = list(map(lambda x: x.get('text'), documents))
    return f"The documents which related with '{keyword}' are {documents}"