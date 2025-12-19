import crud
from data.neo4j.search import global_search
from fastmcp import FastMCP, Context
from fastmcp.server.middleware import Middleware, MiddlewareContext
from fastmcp.server.dependencies import get_http_headers
from fastmcp.exceptions import ToolError
from data.sql.base import SessionLocal

class UserAuthMiddleware(Middleware):
    async def on_call_tool(
        self, 
        context: MiddlewareContext, 
        call_next
    ):
        headers = get_http_headers()
        api_key = headers.get("api-key")
        if not api_key:
            raise ToolError("Access denied: missing api key")

        user_id = await self.verify_api_key_and_get_user_id(api_key)
        if not user_id:
            raise ToolError("Access denied: invalid token")
        
        if context.fastmcp_context:
            context.fastmcp_context.set_state("api_key", api_key)
            
        return await call_next(context)

    async def verify_api_key_and_get_user_id(
        self, 
        api_key: str
    ):
        db = SessionLocal()
        db_api_key = crud.api_key.get_api_key_by_api_key(
            db=db, 
            api_key=api_key
        )
        if not db_api_key:
            return None
        db.close()
        return db_api_key.user_id

# 初始化 MCP 服务器
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
    搜索与关键字匹配的文档。
    读取访问令牌中的 subject（用户 ID），并将其传递给检索逻辑。
    """
    user_id = ctx.get_state("user_id")
    if not user_id:
        raise ToolError("Access denied: missing user_id")
    # 传递 user_id 给后端检索逻辑；若 user_id 为 None，可决定拒绝或匿名查询
    documents = global_search(
        user_id=user_id,
        search_text=keyword,
        time_start=time_start,
        time_end=time_end,
    )
    return documents["seed_chunks"] + documents["expanded_chunks"]