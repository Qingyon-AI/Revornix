from dotenv import load_dotenv
load_dotenv(override=True)

import sentry_sdk
import io
import time
import yaml
import schemas
import functools
from common.redis import redis_pool
from common.apscheduler.app import scheduler
from contextlib import asynccontextmanager, AsyncExitStack
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi import status
from router.user import user_router
from router.mcp import mcp_router
from router.document import document_router
from router.ai import ai_router
from router.notification import notification_router
from router.section import section_router
from router.engine import engine_router
from router.file_system import file_system_router
from router.api_key import api_key_router
from router.tp import tp_router
from router.rss import rss_router
from router.graph import graph_router
from mcp_router.common import common_mcp_router
from mcp_router.document import document_mcp_router
from common.logger import exception_logger, info_logger, exception_logger

common_mcp_app = common_mcp_router.http_app()
document_mcp_app = document_mcp_router.http_app()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.redis = await redis_pool()
    except Exception as e:
        exception_logger.exception("❌ Redis 初始化失败", e)
        raise
    # TODO: init the dataset and vector
    scheduler.start()
    async with AsyncExitStack() as stack:
        # ✅ 这些 session manager 会在 FastAPI 停止时统一退出
        # 将两个 MCP 应用的 lifespan 加入栈，ExitStack 会负责顺序启动和清理
        await stack.enter_async_context(common_mcp_app.lifespan(app))
        await stack.enter_async_context(document_mcp_app.lifespan(app))
        info_logger.info("✅ FastAPI lifespan started.")
        yield  # FastAPI 启动后开始处理请求
        info_logger.info("🛑 FastAPI shutting down...")
        await app.state.redis.close()
        info_logger.info("✅ Redis connection closed.")
    
app = FastAPI(
        title="Revornix Main Backend",
        version="0.5.1",
        contact={
            "name": "Kinda Hall",
            "url": "https://alndaly.github.io",
            "email": "1142704468@qq.com",
        },
        servers=[
            {
                "url": "/api/main-service"
            },
        ],
        openapi_url="/openapi.json",
        lifespan=lifespan
    )

origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router, prefix="/user", tags=["user"])
app.include_router(document_router, prefix="/document", tags=["document"])
app.include_router(ai_router, prefix="/ai", tags=["ai"])
app.include_router(notification_router, prefix="/notification", tags=["notification"])
app.include_router(section_router, prefix="/section", tags=["section"])
app.include_router(api_key_router, prefix="/api-key", tags=["api-key"])
app.include_router(tp_router, prefix="/tp", tags=["tp"])
app.include_router(mcp_router, prefix="/mcp", tags=["mcp"])
app.include_router(engine_router, prefix="/engine", tags=["engine"])
app.include_router(file_system_router, prefix="/file-system", tags=["file-system"])
app.include_router(rss_router, prefix="/rss", tags=["rss"])
app.include_router(graph_router, prefix="/graph", tags=["graph"])

# 挂载 MCP 应用：挂载路径 + MCP 内部路径组成最终调用地址，例如 /mcp-server/common/mcp/
app.mount("/mcp-server/common", common_mcp_app)
app.mount("/mcp-server/document", document_mcp_app)

@app.get('/health')
async def health():
    return {"status": "ok"}

@app.get('/openapi.yaml', include_in_schema=False)
@functools.lru_cache()
def read_openapi_yaml() -> Response:
    openapi_json= app.openapi()
    yaml_s = io.StringIO()
    yaml.dump(openapi_json, yaml_s)
    return Response(yaml_s.getvalue(), media_type='text/yaml')
    
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["Process-Time"] = str(process_time)
    return response

@app.exception_handler(Exception)
async def unicorn_exception_handler(request: Request, exc: Exception):
    exception_logger.error(f"记载报错，涉及请求{request}，错误{exc}")
    res = schemas.common.ErrorResponse(message=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=res.model_dump(),
        headers={
            'Access-Control-Allow-Origin': '*',
        }
    )

@app.exception_handler(schemas.error.CustomException)
async def unicorn_custom_exception_handler(request: Request, exc: schemas.error.CustomException):
    exception_logger.error(f"记载报错，涉及请求{request}，错误{exc}")
    res = schemas.common.ErrorResponse(message=str(exc), code=exc.code)
    return JSONResponse(
        status_code=exc.code,
        content=res.model_dump(),
        headers={
            'Access-Control-Allow-Origin': '*',
        }
    )