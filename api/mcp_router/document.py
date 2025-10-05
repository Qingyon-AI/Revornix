import os
from dotenv import load_dotenv
if os.environ.get("ENV") == "dev":
    load_dotenv(override=True)
    
from data.neo4j.search import global_search
from mcp.server.fastmcp import FastMCP

# Initialize the MCP server with your tools
document_mcp_router = FastMCP(
    name="Document-MCP-Server"
)

@document_mcp_router.tool()
def search_document(keyword: str, time_start: str | None = None, time_end: str | None = None):
    "Search for documents in milvus with the given keyword"
    documents = global_search(search_text=keyword, 
                              time_start=time_start, 
                              time_end=time_end)
    return documents['seed_chunks'] + documents['expanded_chunks']
