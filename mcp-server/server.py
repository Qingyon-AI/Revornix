from dotenv import load_dotenv
load_dotenv(override=True)
import contextlib
from router.common import common_mcp_router
from router.document import document_mcp_router
from fastapi import FastAPI

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    async with contextlib.AsyncExitStack() as stack:
        await stack.enter_async_context(common_mcp_router.session_manager.run())
        await stack.enter_async_context(document_mcp_router.session_manager.run())
        yield

app = FastAPI(lifespan=lifespan)

app.mount("/common", common_mcp_router.streamable_http_app())
app.mount("/document", document_mcp_router.streamable_http_app())