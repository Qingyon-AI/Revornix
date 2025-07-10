import os
from dotenv import load_dotenv
if os.environ.get('ENV') == 'dev':
    load_dotenv(override=True)

import logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
from uvicorn.config import LOGGING_CONFIG
LOGGING_CONFIG["formatters"]["default"]["fmt"] = "%(asctime)s - %(name)s - %(levelprefix)s - %(message)s"
LOGGING_CONFIG["formatters"]["access"]["fmt"] = "%(asctime)s - %(name)s - %(levelprefix)s - %(client_addr)s - %(request_line)s %(status_code)s"

from fastapi import FastAPI, Request
from common.logger import exception_logger
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, JSONResponse
from router.file import file_router
from fastapi import status
from fastapi.middleware.cors import CORSMiddleware
import io
import yaml
import time
import schemas
import functools

root_path = '/api/file-service'

if os.getenv('ENV') == 'dev':
    root_path = ''

app = FastAPI(
    root_path=root_path,
    title="Revornix File System Backend",
    version="0.0.1",
    contact={
        "name": "Kinda Hall",
        "url": "https://alndaly.github.io",
        "email": "1142704468@qq.com",
    },
    servers=[
        {
            "url": root_path,
        },
    ],
    openapi_url="/openapi.json"
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

app.include_router(file_router, prefix="/file")
app.mount('/uploads', StaticFiles(directory='uploads'), name='uploads')

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