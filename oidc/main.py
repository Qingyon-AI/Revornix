import functools
import io
import time
import yaml
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager, AsyncExitStack
from common.redis import redis_pool
from router import oidc

app = FastAPI(title="OIDC Provider")

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["GET","POST"],
    allow_headers=["*"],
)

app.include_router(oidc.router, prefix="/oidc", tags=["oidc"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.redis = await redis_pool()
    except Exception as e:
        raise
    async with AsyncExitStack() as stack:
        yield  # FastAPI 启动后开始处理请求
        await app.state.redis.close()

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
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=f'Internal server error, {exc}',
        headers={
            'Access-Control-Allow-Origin': '*',
        }
    )