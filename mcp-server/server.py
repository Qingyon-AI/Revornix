from dotenv import load_dotenv
load_dotenv(override=True)
from router.common import common_mcp_router

from fastapi import FastAPI

app = FastAPI(
    lifespan=lambda app: common_mcp_router.session_manager.run()
)

app.mount("/common", common_mcp_router.streamable_http_app())
