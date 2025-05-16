from common.vector import hybrid_search, milvus_client, process_query
from mcp.server.fastmcp import FastMCP

# Initialize the MCP server with your tools
document_mcp_router = FastMCP(
    name="Document-MCP-Server"
)

@document_mcp_router.tool()
def search_document(keyword: str):
    "Search for documents in milvus with the given keyword"
    query_dense_embedding, query_sparse_embedding = process_query(query=keyword)
    documents = hybrid_search(milvus_client=milvus_client, 
                              collection_name="document",
                              query_dense_embedding=query_dense_embedding,
                              query_sparse_embedding=query_sparse_embedding)
    documents = list(map(lambda x: x.get('entity').get('text'), documents))
    return f"The documents which related with '{keyword}' are {documents}"