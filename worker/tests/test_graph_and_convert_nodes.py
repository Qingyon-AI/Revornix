"""知识图谱抽取与文档转换两个节点。

共同点是它们都在**循环里调外部系统**，于是出错方式也一样：多调一次只是慢和贵，
少调一次是数据不全 —— 两种都不抛异常。

图谱那边额外有一层实体索引缓存：同一批实体不该反复回查 Neo4j。缓存失效不会报错，
只会让一份大文档的图谱构建慢上几倍，而且是那种"看着就是慢"、查不出原因的慢。
"""

from __future__ import annotations

import pytest

from tests.doubles import FakeDb, Row, async_returning, session_factory
from workflow import document_convert_workflow as convert
from workflow import document_graph_task_workflow as graph


class Chunk:
    def __init__(self, idx: int) -> None:
        self.idx = idx
        self.text = f"chunk-{idx}"


class Entity:
    def __init__(self, entity_type: str, text: str) -> None:
        self.entity_type = entity_type
        self.text = text


class TestGraphExtraction:
    @pytest.fixture
    def wired(self, monkeypatch):
        rec = {
            "index_queries": [],
            "chunk_upserts": [],
            "entity_upserts": [],
            "relation_upserts": [],
            "chunk_entity_links": [],
            "dedupe_calls": 0,
            "cancel_checks": 0,
            "closed": 0,
        }

        def wire(*, chunks: int, entities_per_chunk: int, relations_per_chunk: int = 0):
            async def _stream(**kwargs):
                for i in range(chunks):
                    yield Chunk(i)

            async def _extract(**kwargs):
                return (
                    [Entity("PERSON", f"实体{i}") for i in range(entities_per_chunk)],
                    [object() for _ in range(relations_per_chunk)],
                )

            async def _get_entities(keys):
                rec["index_queries"].append(list(keys))
                return {k: [] for k in keys}

            async def _dedupe(**kwargs):
                rec["dedupe_calls"] += 1
                return kwargs["entities"], kwargs["relations"]

            async def _upsert_chunks(*, chunks_info):
                rec["chunk_upserts"].append(list(chunks_info))

            async def _upsert_entities(items):
                rec["entity_upserts"].append(list(items))

            async def _upsert_relations(items):
                rec["relation_upserts"].append(list(items))

            async def _link(items):
                rec["chunk_entity_links"].append(list(items))

            async def _cancel(document_id):
                rec["cancel_checks"] += 1

            async def _client(**kwargs):
                return object()

            async def _close(client):
                rec["closed"] += 1

            for name, fn in [
                ("stream_chunk_document", _stream),
                ("extract_entities_relations", _extract),
                ("get_entities_by_text_and_type", _get_entities),
                ("resolve_entities_with_semantic_dedupe", _dedupe),
                ("upsert_chunks_neo4j", _upsert_chunks),
                ("upsert_entities_neo4j", _upsert_entities),
                ("upsert_relations_neo4j", _upsert_relations),
                ("upsert_chunk_entity_relations", _link),
                ("_ensure_graph_task_not_cancelled", _cancel),
                ("get_extract_llm_client", _client),
                ("close_extract_llm_client", _close),
            ]:
                monkeypatch.setattr(graph, name, fn)
            monkeypatch.setattr(graph, "get_embedding_engine", lambda: object())
            return rec

        return wire

    def _state(self, **overrides):
        state = {"document_id": 1, "user_id": 2, "llm_model_name": "m"}
        state.update(overrides)
        return state

    async def test_every_chunk_is_written_to_the_graph(self, wired):
        rec = wired(chunks=5, entities_per_chunk=1)
        await graph._extract_chunks(self._state())
        assert len(rec["chunk_upserts"]) == 5

    async def test_chunks_without_entities_still_get_written(self, wired):
        # 分块本身是图上的节点。只在有实体时才写，会让图里缺一批分块，
        # 检索时那部分内容就永远召回不到。
        rec = wired(chunks=3, entities_per_chunk=0)
        await graph._extract_chunks(self._state())
        assert len(rec["chunk_upserts"]) == 3
        assert rec["entity_upserts"] == []

    async def test_no_empty_entity_writes(self, wired):
        # 没有实体时不该发一次空写入 —— 白跑一次 Neo4j 往返
        rec = wired(chunks=3, entities_per_chunk=0)
        await graph._extract_chunks(self._state())
        assert rec["entity_upserts"] == []
        assert rec["chunk_entity_links"] == []

    async def test_relations_are_only_written_when_present(self, wired):
        rec = wired(chunks=2, entities_per_chunk=1, relations_per_chunk=0)
        await graph._extract_chunks(self._state())
        assert rec["relation_upserts"] == []

    async def test_dedupe_runs_only_for_chunks_with_entities(self, wired):
        rec = wired(chunks=4, entities_per_chunk=0)
        await graph._extract_chunks(self._state())
        assert rec["dedupe_calls"] == 0

    async def test_the_entity_index_is_cached_across_chunks(self, wired):
        # 每个分块抽出的是同一批实体名。第二个分块起就不该再回查 Neo4j ——
        # 缓存失效不会报错，只会让大文档的图谱构建慢上几倍。
        rec = wired(chunks=5, entities_per_chunk=2)
        await graph._extract_chunks(self._state())
        assert len(rec["index_queries"]) == 1

    async def test_cancellation_is_checked_per_chunk(self, wired):
        # 图谱构建是最慢的一步。只在开头查一次的话，用户点了取消还要等很久
        rec = wired(chunks=4, entities_per_chunk=1)
        await graph._extract_chunks(self._state())
        assert rec["cancel_checks"] == 1 + 4

    async def test_the_llm_client_is_always_closed(self, wired):
        rec = wired(chunks=2, entities_per_chunk=1)
        await graph._extract_chunks(self._state())
        assert rec["closed"] == 1

    async def test_the_client_is_closed_even_when_extraction_fails(
        self, wired, monkeypatch
    ):
        # 不关就是泄漏连接。worker 长跑，泄漏会累积到把连接池耗尽
        rec = wired(chunks=2, entities_per_chunk=1)

        async def boom(**kwargs):
            raise RuntimeError("抽取失败")

        monkeypatch.setattr(graph, "extract_entities_relations", boom)

        with pytest.raises(RuntimeError):
            await graph._extract_chunks(self._state())
        assert rec["closed"] == 1

    @pytest.mark.parametrize("missing", ["document_id", "user_id", "llm_model_name"])
    async def test_missing_context_fails_fast(self, missing):
        state = self._state()
        del state[missing]
        with pytest.raises(Exception, match="missing required context"):
            await graph._extract_chunks(state)


class TestDocumentConvert:
    @pytest.fixture
    def wired(self, monkeypatch):
        db = FakeDb()

        def wire(*, file_row=None, website_row=None):
            monkeypatch.setattr(convert, "async_session_context", session_factory(db))

            async def ensure_active(**kwargs):
                return None

            monkeypatch.setattr(convert, "ensure_document_active", ensure_active)

            class FakeFileSystem:
                @staticmethod
                async def create(**kwargs):
                    return object()

            monkeypatch.setattr(convert, "FileSystemProxy", FakeFileSystem)
            monkeypatch.setattr(
                convert.crud,
                "document",
                type(
                    "D",
                    (),
                    {
                        "get_file_document_by_document_id_async": staticmethod(
                            async_returning(file_row)
                        ),
                        "get_website_document_by_document_id_async": staticmethod(
                            async_returning(website_row)
                        ),
                    },
                ),
                raising=False,
            )
            return db

        return wire

    def _state(self, **overrides):
        state = {"document_id": 1, "user_id": 2, "category": 0, "engine_id": 3}
        state.update(overrides)
        return state

    async def test_skip_processing_short_circuits(self, wired):
        # 快速笔记之类不需要转换。不短路的话会走到"类型不支持"而整条链失败
        wired()
        state = await convert._convert_document_content(
            self._state(skip_processing=True)
        )
        assert state is not None

    async def test_a_file_document_without_file_info_is_an_error(self, wired):
        # 静默跳过会让文档停在"处理中"，而没有任何线索说明缺了什么
        wired(file_row=None)
        with pytest.raises(Exception, match="do not have a the file info"):
            await convert._convert_document_content(
                self._state(category=convert.DocumentCategory.FILE)
            )

    async def test_a_website_document_without_url_is_an_error(self, wired):
        wired(website_row=None)
        with pytest.raises(Exception, match="do not have a the website info"):
            await convert._convert_document_content(
                self._state(category=convert.DocumentCategory.WEBSITE)
            )

    async def test_an_unsupported_category_is_rejected(self, wired):
        wired()
        with pytest.raises(Exception, match="category not supported"):
            await convert._convert_document_content(self._state(category=9999))

    @pytest.mark.parametrize(
        "missing", ["document_id", "user_id", "category", "engine_id"]
    )
    async def test_missing_context_fails_fast(self, missing):
        state = self._state()
        del state[missing]
        with pytest.raises(Exception, match="missing context"):
            await convert._convert_document_content(state)
