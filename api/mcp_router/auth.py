from collections.abc import Generator
from contextlib import contextmanager

from fastmcp import Context
from fastmcp.exceptions import ToolError
from fastmcp.server.dependencies import get_http_headers
from fastmcp.server.middleware import Middleware, MiddlewareContext
from sqlalchemy.orm import Session

import crud
import models
from data.sql.base import session_scope


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
            context.fastmcp_context.set_state("api_key", api_key)
            context.fastmcp_context.set_state("user_id", user_id)

        return await call_next(context)

    async def verify_api_key_and_get_user_id(self, api_key: str):
        with db_session() as db:
            db_api_key = crud.api_key.get_api_key_by_api_key(
                db=db,
                api_key=api_key,
            )
            if not db_api_key:
                return None
            return db_api_key.user_id


@contextmanager
def db_session() -> Generator[Session, None, None]:
    db = session_scope()
    try:
        yield db
    finally:
        db.close()


def get_user_id_from_ctx(ctx: Context) -> int:
    user_id = ctx.get_state("user_id")
    if not user_id:
        raise ToolError("Access denied: missing user_id")
    return int(user_id)


def get_user_from_ctx(ctx: Context, db: Session) -> models.user.User:
    user_id = get_user_id_from_ctx(ctx)
    db_user = crud.user.get_user_by_id(
        db=db,
        user_id=user_id,
    )
    if db_user is None:
        raise ToolError("Access denied: user not found")
    return db_user
