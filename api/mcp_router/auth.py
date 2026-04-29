from contextlib import asynccontextmanager

from fastmcp import Context
from fastmcp.exceptions import ToolError
from fastmcp.server.dependencies import get_http_headers
from fastmcp.server.middleware import Middleware, MiddlewareContext
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
from common.timezone import normalize_timezone_name
from data.sql.base import async_session_context


class UserAuthMiddleware(Middleware):
    async def on_call_tool(
        self,
        context: MiddlewareContext,
        call_next,
    ):
        headers = get_http_headers()
        api_key = headers.get("api-key")
        if not api_key:
            raise ToolError("Access denied: missing api key")

        user_id = await self.verify_api_key_and_get_user_id(api_key)
        if not user_id:
            raise ToolError("Access denied: invalid token")

        if context.fastmcp_context:
            await context.fastmcp_context.set_state("api_key", api_key)
            await context.fastmcp_context.set_state("user_id", user_id)

        return await call_next(context)

    async def verify_api_key_and_get_user_id(self, api_key: str):
        async with db_session() as db:
            db_api_key = await crud.api_key.get_api_key_by_api_key_async(
                db=db,
                api_key=api_key,
            )
            if not db_api_key:
                return None
            return db_api_key.user_id


@asynccontextmanager
async def db_session():
    async with async_session_context() as db:
        yield db


async def get_user_id_from_ctx(ctx: Context) -> int:
    user_id = await ctx.get_state("user_id")
    if not user_id:
        raise ToolError("Access denied: missing user_id")
    return int(user_id)


async def get_user_from_ctx(ctx: Context, db: AsyncSession) -> models.user.User:
    user_id = await get_user_id_from_ctx(ctx)
    db_user = await crud.user.get_user_by_id_async(
        db=db,
        user_id=user_id,
    )
    if db_user is None:
        raise ToolError("Access denied: user not found")
    return db_user


def get_request_timezone_from_headers() -> str:
    headers = get_http_headers()
    return normalize_timezone_name(headers.get("x-user-timezone"))


def get_raw_user_timezone_from_headers() -> str | None:
    headers = get_http_headers()
    return headers.get("x-user-timezone")


def get_authorization_from_headers() -> str | None:
    headers = get_http_headers()
    return headers.get("authorization")
