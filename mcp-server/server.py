import crud
from datetime import datetime
from common.vector import hybrid_search, milvus_client, process_query
from mcp.server.fastmcp import FastMCP
from common.sql import SessionLocal
from dotenv import load_dotenv
from common.logger import info_logger, log_exception

load_dotenv()

mcp = FastMCP("Revornix")

@mcp.tool()
def get_now_time() -> str:
    """Get current time"""
    return f"Current time is {datetime.now()}"

@mcp.tool()
def search_document_vector(keyword: str) -> list[str]:
    try:
        query_dense_embedding, query_sparse_embedding = process_query(keyword)
        hybrid_results = hybrid_search(
            milvus_client=milvus_client,
            collection_name='document',
            query_dense_embedding=query_dense_embedding,
            query_sparse_embedding=query_sparse_embedding,
        )
        return list(map(lambda x: x.get('entity').get('text'), hybrid_results))
    except Exception as e:
        info_logger.error(f"Error occurred while searching document vector: {e}")
        raise e

if __name__=="__main__":
    mcp.run()