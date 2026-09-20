"""确认卡的抢占:一张卡只能被兑现一次。

这条不变量守的是**删除**。卡的批准是**当场执行**的,所以"批准两次"不是多一条记录,
是同一批文档被删两遍、同一个 AI 任务被扣两份额度。

用真 Postgres:被测的东西就是那条条件 UPDATE 的 rowcount —— 两个事务同时打同一行时
数据库怎么裁决。换成内存对象,断言的就只是 Python 的赋值顺序。
"""

from __future__ import annotations

import asyncio
import json

import pytest

pytestmark = pytest.mark.asyncio


async def _fresh_user(db, suffix: str):
    import models
    from agent.host import _now

    user = models.user.User(
        uuid=f"agent-conf-{suffix}",
        nickname=f"agent-conf-{suffix}",
        role=3,
        avatar="",
        create_time=_now(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
def executed(monkeypatch):
    """记录工具真正被执行了几次。

    批准会**当场执行**工具,而这里不该真去删文档 —— 要测的是"执行了几次",
    不是删除本身。
    """
    from agent import tool_manifest

    calls: list[tuple[str, dict]] = []

    async def _fake_invoke(name, arguments, user_id):
        calls.append((name, arguments))
        return {"ok": True}

    monkeypatch.setattr(tool_manifest, "invoke_tool", _fake_invoke)
    return calls


async def test_double_approval_executes_once(executed):
    """两个请求同时批准同一张卡 —— 只能执行一次,另一个必须被拒绝。

    界面上双击「批准」,或用户在两个标签页里都点了,就是这个形状。
    """
    from agent import confirmations
    from data.sql.base import async_session_context
    import models

    async with async_session_context() as db:
        user = await _fresh_user(db, "double")
        card = await confirmations.request_confirmation(
            db,
            user_id=user.id,
            tool="delete_documents",
            payload={"document_ids": [1, 2, 3]},
        )
        card_id, user_id = card.id, user.id

    # 两个请求各自把卡读进来(路由依赖就是这么做的),再同时批准
    ctx_a, ctx_b = async_session_context(), async_session_context()
    db_a, db_b = await ctx_a.__aenter__(), await ctx_b.__aenter__()
    try:
        card_a = await db_a.get(models.agent.ToolConfirmation, card_id)
        card_b = await db_b.get(models.agent.ToolConfirmation, card_id)
        user_a = await db_a.get(models.user.User, user_id)
        user_b = await db_b.get(models.user.User, user_id)
        assert card_a.status == "pending" and card_b.status == "pending"

        results = await asyncio.gather(
            confirmations.authorize_and_approve(db_a, user_a, card_a),
            confirmations.authorize_and_approve(db_b, user_b, card_b),
            return_exceptions=True,
        )
    finally:
        await ctx_a.__aexit__(None, None, None)
        await ctx_b.__aexit__(None, None, None)

    rejected = [r for r in results if isinstance(r, confirmations.ConfirmationError)]
    assert len(executed) == 1, (
        f"同一张确认卡执行了 {len(executed)} 次。批准是当场执行的 —— "
        "对 delete_documents 来说这就是同一批文档被删两遍。"
    )
    assert len(rejected) == 1, "抢输的那个请求必须收到明确的拒绝,而不是静默成功"


async def test_approve_after_reject_is_refused(executed):
    """已拒绝的卡不能再被批准 —— 终态就是终态。"""
    from agent import confirmations
    from data.sql.base import async_session_context

    async with async_session_context() as db:
        user = await _fresh_user(db, "reject-then-approve")
        card = await confirmations.request_confirmation(
            db, user_id=user.id, tool="delete_section", payload={"section_id": 7}
        )
        await confirmations.authorize_and_reject(db, user, card)
        assert card.status == "rejected"

        with pytest.raises(confirmations.ConfirmationError):
            await confirmations.authorize_and_approve(db, user, card)

    assert executed == [], "被拒绝的卡绝不能执行工具"


async def test_cancelled_pending_cards_cannot_be_approved(executed):
    """后端重启作废的卡不能再被批准。

    界面上那张卡还亮着按钮 —— 用户点下去,若还能执行,就会在一个没有任何一轮对话
    接收结果的情况下真的把东西删掉。
    """
    from agent import confirmations
    from agent.host import create_session
    from data.sql.base import async_session_context

    async with async_session_context() as db:
        user = await _fresh_user(db, "cancelled")
        session = await create_session(db, user_id=user.id)
        card = await confirmations.request_confirmation(
            db,
            user_id=user.id,
            tool="delete_documents",
            payload={"document_ids": [9]},
            session_id=session.id,
        )
        await confirmations.cancel_pending_for_sessions(db, [session.id], "服务重启")
        await db.refresh(card)
        assert card.status == "cancelled"

        with pytest.raises(confirmations.ConfirmationError):
            await confirmations.authorize_and_approve(db, user, card)

    assert executed == [], "已作废的卡绝不能执行工具"


async def test_summary_names_what_will_happen(executed):
    """摘要必须点出关键参数 —— 那是用户批准前唯一会读的一行字。

    摘要读的键与工具真实参数名对不上时,卡片会显示「删除 0 篇文档」,
    而批准下去删的是一整批。
    """
    from agent import confirmations
    from data.sql.base import async_session_context

    async with async_session_context() as db:
        user = await _fresh_user(db, "summary")
        card = await confirmations.request_confirmation(
            db,
            user_id=user.id,
            tool="delete_documents",
            payload={"document_ids": [11, 12, 13]},
        )

    assert "3" in card.summary, f"摘要没说清删几篇: {card.summary}"
    assert card.permission == "destructive"
    assert json.loads(card.payload)["document_ids"] == [11, 12, 13]
