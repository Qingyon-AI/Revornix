"""会话并发:一个会话同一时刻只能有一轮在跑。

这条不变量是整个智能体会话模型的地基。破了之后的表现不是报错,而是:

- 两轮同时写 `adapter_state`(整段对话历史),后完成的那个覆盖先完成的 —— 用户看到
  模型"忘了"刚刚说过的话;
- `_LIVE[session_id]` 只存得下一个,steer / abort 打在后来的那轮上,另一轮失控;
- 流式时间线被第二轮的 `_stream_reset` 清空,第一轮的输出凭空消失;
- 两轮各自花一份 AI 额度。

用真 Postgres 而不是替身:要测的正是**数据库层面的抢占**(条件 UPDATE 的 rowcount),
把 session 顶成内存对象就等于把被测的东西测没了。
"""

from __future__ import annotations

import asyncio

import pytest

pytestmark = pytest.mark.asyncio


async def _fresh_user(db, suffix: str):
    """建一个最小可用的用户 —— 会话要挂在真实 user 上(外键)。"""
    import models
    from agent.host import _now

    user = models.user.User(
        uuid=f"agent-conc-{suffix}",
        nickname=f"agent-conc-{suffix}",
        role=3,
        avatar="",
        create_time=_now(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _fresh_session(db, user_id: int):
    """用**生产那段代码**建会话,不在测试里另抄一份字段 —— 否则改了模型这里不会红。"""
    from agent.host import create_session

    return await create_session(db, user_id=user_id)


@pytest.fixture
def spawned(monkeypatch):
    """截住真正跑轮的那一步。

    这里要测的是"起了几轮",不是轮本身 —— 真去 spawn node 会把一个并发语义的测试
    变成一个依赖模型供应商的测试。计数器记的就是 `_run_turn_task` 被安排了几次。
    """
    from agent import host

    calls: list[int] = []

    async def _fake_run_turn_task(session_id, prompt, images, token, user_id):
        # 只记账,**不把会话拨回 idle**。一个"瞬间跑完"的轮不是真实的轮:它会让
        # 紧随其后的请求合法地抢到会话,于是这个测试永远看不见它要抓的竞态。
        # 真实的一轮要跑几秒,期间会话一直是 running。
        calls.append(session_id)

    monkeypatch.setattr(host, "_run_turn_task", _fake_run_turn_task)
    return calls


async def test_concurrent_sends_start_exactly_one_turn(spawned):
    """两个请求同时给一个 idle 会话发消息 —— 只能起一轮,另一条排队。

    这正是界面上双击发送、或两个标签页同时发送时发生的事。
    """
    from agent import host
    from data.sql.base import async_session_context

    async with async_session_context() as db:
        user = await _fresh_user(db, "one-turn")
        session = await _fresh_session(db, user.id)
        session_id, user_id = session.id, user.id

    # 真实时序:两个请求**各自先把会话读进来**(路由依赖做的事),然后才进入
    # post_user_message。两次读都发生在任何一次写之前 —— 这正是并发请求的形状,
    # 而不是靠运气去撞 await 之间的缝。
    import models

    ctx_a, ctx_b = async_session_context(), async_session_context()
    db_a, db_b = await ctx_a.__aenter__(), await ctx_b.__aenter__()
    try:
        sess_a = await db_a.get(models.agent.AgentSession, session_id)
        sess_b = await db_b.get(models.agent.AgentSession, session_id)
        user_a = await db_a.get(models.user.User, user_id)
        user_b = await db_b.get(models.user.User, user_id)
        assert sess_a.status == "idle" and sess_b.status == "idle"

        await asyncio.gather(
            host.post_user_message(db_a, sess_a, "第一条", user_a),
            host.post_user_message(db_b, sess_b, "第二条", user_b),
        )
    finally:
        await ctx_a.__aexit__(None, None, None)
        await ctx_b.__aexit__(None, None, None)
    # 让 post_user_message 内部 create_task 出去的那些任务跑完
    await asyncio.sleep(0.2)

    assert len(spawned) == 1, (
        f"同一会话并发发消息起了 {len(spawned)} 轮。两轮会同时写 adapter_state，"
        "后写的覆盖先写的，对话历史丢失。"
    )

    # 第二条必须仍然在（排队或已被 drain 跑掉），不能凭空消失
    async with async_session_context() as db:
        import models
        from sqlalchemy import select

        rows = (
            await db.execute(
                select(models.agent.AgentMessage)
                .where(models.agent.AgentMessage.session_id == session_id)
                .where(models.agent.AgentMessage.role == "user")
            )
        ).scalars().all()
        assert len(rows) == 2, "两条用户消息都必须落库，排队的那条不能被丢掉"


async def test_session_returns_to_idle_when_queue_is_empty(spawned):
    """抢占成功却没有排队消息时,会话必须放回 idle。

    忘了放回去的表现是这个会话**永远**停在 running:之后每条消息都被判定为
    "正在跑"而排队,而没有任何一轮会去 drain 它们 —— 会话静默死掉。
    """
    from agent.host import _drain_queue
    from data.sql.base import async_session_context

    async with async_session_context() as db:
        user = await _fresh_user(db, "empty-queue")
        session = await _fresh_session(db, user.id)
        session_id = session.id

    await _drain_queue(session_id)

    async with async_session_context() as db:
        import models

        session = await db.get(models.agent.AgentSession, session_id)
        assert session.status == "idle", f"队列空时应回到 idle，实际是 {session.status}"
    assert spawned == [], "没有排队消息时不该起轮"
