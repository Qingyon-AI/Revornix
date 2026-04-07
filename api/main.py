from dotenv import load_dotenv

load_dotenv(override=True)

import functools
import io
import time
from contextlib import AsyncExitStack, asynccontextmanager

import yaml
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

import schemas
from common.apscheduler.app import scheduler
from common.env import is_env_enabled
from common.logger import exception_logger, format_log_message, info_logger
from common.redis import redis_pool
from common.websocket import notificationManager
from config.sentry import API_SENTRY_DSN, API_SENTRY_ENABLE
from engine.video_plugins.bilibili_auth import initialize_bilibili_auth_on_startup
from engine.video_plugins.youtube_auth import initialize_youtube_auth_on_startup
from mcp_router.common import common_mcp_router
from mcp_router.document import document_mcp_router
from mcp_router.graph import graph_mcp_router
from router.ai import ai_router
from router.api_key import api_key_router
from router.document import document_router
from router.engine import engine_router
from router.file_system import file_system_router
from router.graph import graph_router
from router.mcp import mcp_router
from router.notification import notification_router
from router.section import section_router
from router.tp import tp_router
from router.user import user_router
from router.user_auth import user_auth_router
from router.wechat_official import wechat_official_router
from schemas.error import normalize_error_message

common_mcp_app = common_mcp_router.http_app()
document_mcp_app = document_mcp_router.http_app()
graph_mcp_app = graph_mcp_router.http_app()


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_conn = None
    try:
        if is_env_enabled(API_SENTRY_ENABLE):
            import sentry_sdk
            sentry_sdk.init(
                dsn=API_SENTRY_DSN,
                send_default_pii=True,
            )
        redis_conn = await redis_pool()
        app.state.redis = redis_conn
    except Exception as e:
        exception_logger.exception(
            format_log_message("redis_init_failed", error=e)
        )
        raise
    try:
        if not scheduler.running:
            scheduler.start()
            info_logger.info(format_log_message("scheduler_started"))
        info_logger.info(format_log_message("bilibili_auth_starting"))
        await initialize_bilibili_auth_on_startup()
        info_logger.info(format_log_message("bilibili_auth_initialized"))
        info_logger.info(format_log_message("youtube_auth_starting"))
        await initialize_youtube_auth_on_startup()
        info_logger.info(format_log_message("youtube_auth_initialized"))
        async with AsyncExitStack() as stack:
            # 这些 session manager 会在 FastAPI 停止时统一退出
            # 将 MCP 应用的 lifespan 加入栈，ExitStack 会负责顺序启动和清理
            info_logger.info(format_log_message("common_mcp_lifespan_starting"))
            await stack.enter_async_context(common_mcp_app.lifespan(app))
            info_logger.info(format_log_message("common_mcp_lifespan_started"))
            info_logger.info(format_log_message("document_mcp_lifespan_starting"))
            await stack.enter_async_context(document_mcp_app.lifespan(app))
            info_logger.info(format_log_message("document_mcp_lifespan_started"))
            info_logger.info(format_log_message("graph_mcp_lifespan_starting"))
            await stack.enter_async_context(graph_mcp_app.lifespan(app))
            info_logger.info(format_log_message("graph_mcp_lifespan_started"))
            info_logger.info(format_log_message("fastapi_lifespan_started"))
            yield
    finally:
        info_logger.info(format_log_message("fastapi_shutdown_started"))
        if scheduler.running:
            scheduler.shutdown(wait=False)
        if redis_conn is not None:
            await redis_conn.aclose()
            info_logger.info(format_log_message("redis_connection_closed"))
        await notificationManager.close_cache()

app = FastAPI(
        title="Revornix Main Backend",
        version="0.6.4",
        contact={
            "name": "Kinda Hall",
            "url": "https://alndaly.github.io",
            "email": "1142704468@qq.com",
        },
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
app.include_router(user_auth_router, prefix="/user", tags=["user"])
app.include_router(document_router, prefix="/document", tags=["document"])
app.include_router(ai_router, prefix="/ai", tags=["ai"])
app.include_router(notification_router, prefix="/notification", tags=["notification"])
app.include_router(section_router, prefix="/section", tags=["section"])
app.include_router(api_key_router, prefix="/api-key", tags=["api-key"])
app.include_router(tp_router, prefix="/tp", tags=["tp"])
app.include_router(mcp_router, prefix="/mcp", tags=["mcp"])
app.include_router(engine_router, prefix="/engine", tags=["engine"])
app.include_router(file_system_router, prefix="/file-system", tags=["file-system"])
app.include_router(graph_router, prefix="/graph", tags=["graph"])
app.include_router(wechat_official_router, prefix="/wechat", tags=["wechat"])

# 挂载 MCP 应用：挂载路径 + MCP 内部路径组成最终调用地址，例如 /mcp-server/common/mcp/
app.mount("/mcp-server/common", common_mcp_app)
app.mount("/mcp-server/document", document_mcp_app)
app.mount("/mcp-server/graph", graph_mcp_app)

@app.get('/health')
async def health():
    return {"status": "ok"}

@app.get('/openapi.yaml', include_in_schema=False)
@functools.lru_cache
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
    exception_logger.exception(
        format_log_message(
            "request_unhandled_exception",
            method=request.method,
            path=request.url.path,
            client=request.client.host if request.client else None,
            error=exc,
        )
    )
    res = schemas.common.ErrorResponse(
        message=normalize_error_message(str(exc)),
        code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=res.model_dump(),
        headers={
            'Access-Control-Allow-Origin': '*',
        }
    )

@app.exception_handler(schemas.error.CustomException)
async def unicorn_custom_exception_handler(request: Request, exc: schemas.error.CustomException):
    exception_logger.error(
        format_log_message(
            "request_custom_exception",
            method=request.method,
            path=request.url.path,
            client=request.client.host if request.client else None,
            code=exc.code,
            error=exc.message,
        )
    )
    res = schemas.common.ErrorResponse(
        message=normalize_error_message(exc.message),
        code=exc.code,
    )
    return JSONResponse(
        status_code=exc.code,
        content=res.model_dump(),
        headers={
            'Access-Control-Allow-Origin': '*',
        }
    )
