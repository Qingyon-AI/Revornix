"""重复执行契约：写两次必须等于写一次。

这是这套集成测试存在的**全部理由**。celery 配了 `task_acks_late=True`，任务在
worker 被杀时会重投——重复执行是**设计内**的，不是异常路径。整个设计的安全性
压在"写入幂等"这一条上，而它此前只有一句注释和一份文档在保证。

那份保证是错的。写这批用例时实测发现 `upsert_milvus` 调的是 `milvus_client.insert`，
而 Milvus 的 insert **不做主键去重**：同一主键写两次会存成两条实体。之所以长期
没被发现，是因为按主键 query 只返回一条——看着完全正常。

所以断言用的是 `count(*)` 而不是"查得到"。这个选择是这批用例的关键：
**用错了判据，这个缺陷会继续躲过去。**

判据一律是数量，不是内容——不依赖模型、不依赖文案，不会因为无关变动而抖。
"""

from __future__ import annotations

import uuid

import pytest

from data.custom_types.all import ChunkInfo, EntityInfo, RelationInfo
from data.milvus.base import MILVUS_COLLECTION
from data.milvus.insert import upsert_milvus
from data.neo4j.insert import (
    upsert_chunks_neo4j,
    upsert_entities_neo4j,
    upsert_relations_neo4j,
)

# 用独立的 doc_id 段，避免和真实数据撞上；每次运行再取一个随机后缀。
PROBE_DOC_ID = -424242
EMBED_DIM = 1024


def probe_chunk(idx: int, text: str, run_id: str) -> ChunkInfo:
    return ChunkInfo(
        id=f"ITEST_{run_id}_IDX_{idx}",
        text=text,
        idx=idx,
        doc_id=PROBE_DOC_ID,
        embedding=[0.01 * (idx + 1)] * EMBED_DIM,
    )


@pytest.fixture
def run_id() -> str:
    return uuid.uuid4().hex[:8]


class TestMilvusIdempotency:
    @pytest.fixture(autouse=True)
    def _cleanup(self, milvus_client, run_id):
        # **前后都清**。只在结束时清，等于隐含假设"开跑时集合是干净的" ——
        # 而上一次运行崩在半路、或者被 Ctrl-C 打断，残留就会让下一次的
        # `first == 3` 莫名其妙地失败。这类"看历史脸色"的测试最败坏信任：
        # 红一次没人查，红三次这套就没人跑了。
        #
        # 这不是假想：本地第一次接进 check-all.sh 时就是这么红的 —— 上一轮
        # 故意改回 insert 的负向验证留下了重复行。
        self._purge(milvus_client)
        yield
        self._purge(milvus_client)

    @staticmethod
    def _purge(milvus_client) -> None:
        milvus_client.delete(
            collection_name=MILVUS_COLLECTION,
            filter=f"doc_id == {PROBE_DOC_ID}",
        )
        milvus_client.flush(collection_name=MILVUS_COLLECTION)

    def _count(self, milvus_client, run_id: str) -> int:
        milvus_client.flush(collection_name=MILVUS_COLLECTION)
        rows = milvus_client.query(
            collection_name=MILVUS_COLLECTION,
            filter=f"doc_id == {PROBE_DOC_ID}",
            output_fields=["count(*)"],
        )
        return rows[0]["count(*)"] if rows else 0

    async def test_writing_the_same_batch_twice_stores_it_once(
        self, milvus_client, run_id
    ):
        """核心断言。这条在 `insert` 改成 `upsert` 之前是**红的**。"""
        chunks = [probe_chunk(i, f"内容 {i}", run_id) for i in range(3)]

        await upsert_milvus(user_id=1, chunks_info=chunks)
        first = self._count(milvus_client, run_id)

        await upsert_milvus(user_id=1, chunks_info=chunks)
        second = self._count(milvus_client, run_id)

        assert first == 3
        assert second == 3, (
            f"重复写入后从 {first} 涨到 {second} —— 向量库在累积重复。"
            "acks_late 下这会随每次重投持续放大。"
        )

    async def test_a_key_query_would_have_hidden_this(self, milvus_client, run_id):
        """记录那个"看着正常"的假象，免得判据哪天被改回按主键查。"""
        chunk = probe_chunk(0, "内容", run_id)
        await upsert_milvus(user_id=1, chunks_info=[chunk])
        await upsert_milvus(user_id=1, chunks_info=[chunk])
        milvus_client.flush(collection_name=MILVUS_COLLECTION)

        by_key = milvus_client.query(
            collection_name=MILVUS_COLLECTION,
            filter=f'id == "{chunk.id}"',
            output_fields=["id"],
        )
        # 按主键查任何时候都只有一条 —— 无论底层是一条还是两条。
        # 所以它不能作为幂等性的判据。
        assert len(by_key) == 1
        assert self._count(milvus_client, run_id) == 1

    async def test_rewriting_with_changed_content_does_not_add_a_row(
        self, milvus_client, run_id
    ):
        # 同主键、不同向量：这是"文档改了重跑"的情形，结果应当是覆盖而非并存
        chunk = probe_chunk(0, "原内容", run_id)
        await upsert_milvus(user_id=1, chunks_info=[chunk])

        changed = probe_chunk(0, "新内容", run_id)
        changed.embedding = [0.9] * EMBED_DIM
        await upsert_milvus(user_id=1, chunks_info=[changed])

        assert self._count(milvus_client, run_id) == 1

    async def test_an_empty_batch_writes_nothing(self, milvus_client, run_id):
        await upsert_milvus(user_id=1, chunks_info=[])
        assert self._count(milvus_client, run_id) == 0


class TestNeo4jIdempotency:
    LABEL_CHUNK = "Chunk"

    @pytest.fixture(autouse=True)
    async def _cleanup(self, neo4j_driver, run_id):
        # 同 Milvus 侧：前后都清，别指望上一次运行收拾干净了。
        await self._purge(neo4j_driver, run_id)
        yield
        await self._purge(neo4j_driver, run_id)

    @staticmethod
    async def _purge(neo4j_driver, run_id: str) -> None:
        async with neo4j_driver.session() as session:
            await session.run(
                f"MATCH (c:Chunk {{doc_id: {PROBE_DOC_ID}}}) DETACH DELETE c"
            )
            await session.run(
                "MATCH (e:Entity) WHERE e.id STARTS WITH $p DETACH DELETE e",
                p="ITEST_",
            )

    async def _count_chunks(self, neo4j_driver) -> int:
        async with neo4j_driver.session() as session:
            record = await (
                await session.run(
                    f"MATCH (c:Chunk {{doc_id: {PROBE_DOC_ID}}}) RETURN count(c) AS c"
                )
            ).single()
        return record["c"]

    async def test_writing_the_same_chunks_twice_stores_them_once(
        self, neo4j_driver, run_id
    ):
        chunks = [probe_chunk(i, f"内容 {i}", run_id) for i in range(3)]

        await upsert_chunks_neo4j(chunks_info=chunks)
        first = await self._count_chunks(neo4j_driver)
        await upsert_chunks_neo4j(chunks_info=chunks)
        second = await self._count_chunks(neo4j_driver)

        assert first == 3
        assert second == 3

    async def test_entities_and_relations_do_not_multiply(self, neo4j_driver, run_id):
        # 实体和关系走的是另一批 MERGE 语句，与分块那条不是同一段代码
        entities = [
            EntityInfo(
                id=f"ITEST_{run_id}_E{i}",
                text=f"实体{i}",
                chunks=[f"ITEST_{run_id}_IDX_0"],
                entity_type="PERSON",
                context_hash="h",
            )
            for i in range(2)
        ]
        relations = [
            RelationInfo(
                src_node=f"ITEST_{run_id}_E0",
                tgt_node=f"ITEST_{run_id}_E1",
                relation_type="KNOWS",
            )
        ]

        for _ in range(2):
            await upsert_entities_neo4j(entities)
            await upsert_relations_neo4j(relations)

        async with neo4j_driver.session() as session:
            record = await (
                await session.run(
                    "MATCH (e:Entity) WHERE e.id STARTS WITH $p RETURN count(e) AS c",
                    p=f"ITEST_{run_id}",
                )
            ).single()
        assert record["c"] == 2


class TestSchemaGuardIsReentrant:
    """启动自愈跑第二遍必须无事发生。

    它是**启动路径**上的代码：挂了整个服务起不来。而"写法是幂等的"和"跑过"
    是两回事 —— 本仓库就撞过一次 `COMMENT ON ... IS :param`，DDL 不接受绑定
    参数，那个错误只有真连数据库才暴露。
    """

    def test_running_it_twice_changes_nothing(self):
        from data.sql.schema_guard import run_schema_guard

        run_schema_guard()
        run_schema_guard()  # 第二遍：不该抛错

    def test_the_guarded_columns_exist_afterwards(self):
        from sqlalchemy import inspect

        from data.sql.base import engine
        from data.sql.schema_guard import run_schema_guard

        run_schema_guard()
        with engine.connect() as conn:
            columns = {
                c["name"]
                for c in inspect(conn).get_columns("document_embedding_task")
            }
        # detail 是本会话加的那一列，它正是 schema_guard 存在的理由
        assert "detail" in columns
