"""任务表的读写，against 真实 Postgres。

`crud/` 有 210 个函数，此前**一个都没被跑过**。单元测试碰不到它们：conftest 把
`crud` 整个顶成了空壳，因为真跑要连库。于是这一层里所有的 SQL —— 过滤条件、
join、软删语义 —— 只有在线上命中那条分支时才第一次被执行。

这里挑的是**工作流每个节点都在调**的那几个，外加一个最容易出错的查询。

判据都是"行数/取回的值"，不涉及业务语义，所以不会因为无关改动而抖。
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

import crud
import models
from data.sql.base import async_session_context

PROBE_USER_ID = -4242


def _now():
    return datetime.now(timezone.utc)


@pytest.fixture
async def db():
    async with async_session_context() as session:
        yield session


@pytest.fixture
async def user(db):
    """任务和文档都有指向 user 的外键，绕不过去。"""
    existing = await db.get(models.user.User, PROBE_USER_ID)
    if existing is None:
        db.add(
            models.user.User(
                id=PROBE_USER_ID,
                uuid=f"itest-{PROBE_USER_ID}",
                role=3,
                avatar="",
                nickname="itest",
                is_forbidden=False,
                mfa_enabled=False,
                auth_epoch=0,
                create_time=_now(),
            )
        )
        await db.commit()
    return PROBE_USER_ID


@pytest.fixture
async def document(db, user):
    doc = models.document.Document(
        creator_id=user,
        from_plat="itest",
        title="集成测试文档",
        category=0,
        create_time=_now(),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    yield doc

    # 清理：任务行先删（外键），再删文档
    from sqlalchemy import delete

    for table in (
        models.task.DocumentEmbeddingTask,
        models.task.DocumentGraphTask,
        models.task.DocumentSummarizeTask,
        models.task.DocumentPodcastTask,
        models.task.DocumentProcessTask,
        models.task.DocumentConvertToMdTask,
        models.task.DocumentAudioTranscribeTask,
    ):
        await db.execute(delete(table).where(table.document_id == doc.id))
    await db.execute(
        delete(models.document.Document).where(models.document.Document.id == doc.id)
    )
    await db.commit()


class TestTaskLifecycle:
    async def test_create_then_get_returns_the_same_row(self, db, user, document):
        created = await crud.task.create_document_embedding_task_async(
            db=db, user_id=user, document_id=document.id
        )
        await db.commit()

        got = await crud.task.get_document_embedding_task_by_document_id_async(
            db=db, document_id=document.id
        )
        assert got is not None
        assert got.id == created.id

    async def test_get_on_a_document_without_the_task_returns_none(self, db, document):
        # 工作流里到处是 `if task is not None`。这条查询若在"没有"时抛异常而不是
        # 返回 None，那些分支就永远走不到，节点会以另一种形式失败。
        got = await crud.task.get_document_graph_task_by_document_id_async(
            db=db, document_id=document.id
        )
        assert got is None

    async def test_the_detail_column_round_trips(self, db, user, document):
        # detail 是本轮加的那一列（任务失败详情）。它经 schema_guard 补上，
        # 而"补上了"和"读得回来"是两回事。长度上限 1000。
        task = await crud.task.create_document_embedding_task_async(
            db=db, user_id=user, document_id=document.id
        )
        task.detail = "Error: " + "长" * 300
        await db.commit()

        got = await crud.task.get_document_embedding_task_by_document_id_async(
            db=db, document_id=document.id
        )
        assert got.detail.startswith("Error: ")
        assert len(got.detail) == 307

    async def test_a_soft_deleted_task_is_not_returned(self, db, user, document):
        # 软删语义只存在于 where 条件里。漏掉它，已删任务会重新出现在卡片上
        task = await crud.task.create_document_embedding_task_async(
            db=db, user_id=user, document_id=document.id
        )
        task.delete_at = _now()
        await db.commit()

        got = await crud.task.get_document_embedding_task_by_document_id_async(
            db=db, document_id=document.id
        )
        assert got is None


class TestTaskBundleJoin:
    """文档列表卡片背后的那个七路 outer join。

    它同时 join 七张任务表。这类查询最典型的错法是**行翻倍** —— 某个 join 条件
    漏了软删过滤或写错了外键，一份文档就会返回多行，前端拿到的任务状态随机。
    这在单元测试里完全看不见，因为那层根本没有 SQL。
    """

    async def test_a_document_without_tasks_still_comes_back(self, db, document):
        # outer join 的全部意义：没有任务的文档也要出现，否则新上传的文档
        # 会从列表里消失
        rows = await crud.task.get_document_task_bundles_by_document_ids_async(
            db=db, document_ids=[document.id]
        )
        assert len(rows) == 1

    async def test_one_row_per_document_even_with_every_task_present(
        self, db, user, document
    ):
        for create in (
            crud.task.create_document_embedding_task_async,
            crud.task.create_document_graph_task_async,
            crud.task.create_document_summarize_task_async,
            crud.task.create_document_podcast_task_async,
            crud.task.create_document_process_task_async,
        ):
            await create(db=db, user_id=user, document_id=document.id)
        await db.commit()

        rows = await crud.task.get_document_task_bundles_by_document_ids_async(
            db=db, document_ids=[document.id]
        )
        assert len(rows) == 1, f"七路 join 把一份文档放大成了 {len(rows)} 行"

    async def test_soft_deleted_tasks_do_not_multiply_rows(self, db, user, document):
        # 同一类型有一条已删、一条在用时最容易翻倍
        first = await crud.task.create_document_embedding_task_async(
            db=db, user_id=user, document_id=document.id
        )
        first.delete_at = _now()
        await crud.task.create_document_embedding_task_async(
            db=db, user_id=user, document_id=document.id
        )
        await db.commit()

        rows = await crud.task.get_document_task_bundles_by_document_ids_async(
            db=db, document_ids=[document.id]
        )
        assert len(rows) == 1

    async def test_an_empty_id_list_short_circuits(self, db):
        # 不短路的话会生成 `IN ()`，在 PG 上是语法错误
        assert (
            await crud.task.get_document_task_bundles_by_document_ids_async(
                db=db, document_ids=[]
            )
            == []
        )


class TestDocumentLabels:
    """打标写入的真实去重行为。

    工作流那侧已经用替身验过"算出哪些是新标签"，但**写进去**是另一回事：
    唯一约束、重复插入、外键，都只有真库说了算。
    """

    async def test_labels_can_be_read_back(self, db, user, document):
        label = models.document.Label(
            name=f"itest-{document.id}", user_id=user, create_time=_now()
        )
        db.add(label)
        await db.commit()
        await db.refresh(label)

        await crud.document.create_document_labels_async(
            db=db, document_id=document.id, label_ids=[label.id]
        )
        await db.commit()

        got = await crud.document.get_document_labels_by_document_id_async(
            db=db, document_id=document.id
        )
        assert [item.label_id for item in got] == [label.id]

        from sqlalchemy import delete

        await db.execute(
            delete(models.document.DocumentLabel).where(
                models.document.DocumentLabel.document_id == document.id
            )
        )
        await db.execute(
            delete(models.document.Label).where(models.document.Label.id == label.id)
        )
        await db.commit()

    async def test_a_document_without_labels_returns_empty(self, db, document):
        got = await crud.document.get_document_labels_by_document_id_async(
            db=db, document_id=document.id
        )
        assert got == []
