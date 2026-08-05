"""文档与专栏的状态更新节点。

这两个节点只做一件事：把任务行的状态改掉。正因为简单，它出错的方式全是安静的 ——
改了字段没提交、任务行不存在时炸掉、文档已删还去写。用户那边看到的分别是「状态
永远不动」「整条处理链断在这里」和「删掉的文档又冒出个任务」。

两个节点看着几乎一样，但**有一处关键差别**：文档侧多一道「已删就直接返回」的守卫，
专栏侧没有。这里把这个差别也钉住，免得哪天有人「统一」掉。
"""

from __future__ import annotations

import pytest

from tests.doubles import FakeDb, Row, async_returning, session_factory
from workflow import document_process_status_workflow as doc_node
from workflow import section_process_status_workflow as sec_node

DELETED = doc_node.DocumentDeletedError


@pytest.fixture
def doc_wired(monkeypatch):
    db = FakeDb()

    def wire(*, task: Row | None, deleted: bool = False):
        async def ensure_active(**kwargs):
            if deleted:
                raise DELETED("已删除")

        monkeypatch.setattr(doc_node, "async_session_context", session_factory(db))
        monkeypatch.setattr(doc_node, "ensure_document_active", ensure_active)
        monkeypatch.setattr(
            doc_node.crud,
            "task",
            type(
                "T",
                (),
                {
                    "get_document_process_task_by_document_id_async": staticmethod(
                        async_returning(task)
                    )
                },
            ),
            raising=False,
        )
        return db

    return wire


class TestDocumentStatus:
    async def test_writes_the_status_and_commits(self, doc_wired):
        task = Row(status=1, update_time=None)
        db = doc_wired(task=task)

        await doc_node._update_document_status({"document_id": 7, "status": 9})

        assert task.status == 9
        # 改了字段但没提交 = 用户看到状态永远不动，而日志里一切正常
        assert db.commits == 1

    async def test_stamps_the_update_time(self, doc_wired):
        task = Row(status=1, update_time=None)
        doc_wired(task=task)

        await doc_node._update_document_status({"document_id": 7, "status": 9})

        # 时间不更新会让前端的「过期」判断永远认为结果是旧的
        assert task.update_time is not None

    async def test_a_deleted_document_is_a_no_op(self, doc_wired):
        # 文档删了还去写任务状态，等于给一个不存在的东西留下活动痕迹
        task = Row(status=1, update_time=None)
        db = doc_wired(task=task, deleted=True)

        await doc_node._update_document_status({"document_id": 7, "status": 9})

        assert task.status == 1
        assert db.commits == 0

    async def test_a_missing_task_row_is_tolerated(self, doc_wired):
        # 取不到任务行不该炸：整条处理链会断在这一步，而它本身无关紧要
        db = doc_wired(task=None)
        await doc_node._update_document_status({"document_id": 7, "status": 9})
        assert db.commits == 0

    @pytest.mark.parametrize("state", [{"status": 9}, {"document_id": 7}, {}])
    async def test_missing_context_fails_fast(self, state):
        with pytest.raises(Exception, match="missing document_id or status"):
            await doc_node._update_document_status(state)

    async def test_status_zero_is_still_written(self, doc_wired):
        # 边界：0 是合法状态值。用 `if not status` 判空会把它当成缺参数
        task = Row(status=5, update_time=None)
        doc_wired(task=task)
        await doc_node._update_document_status({"document_id": 7, "status": 0})
        assert task.status == 0


@pytest.fixture
def sec_wired(monkeypatch):
    db = FakeDb()

    def wire(*, task: Row | None):
        monkeypatch.setattr(sec_node, "async_session_context", session_factory(db))
        monkeypatch.setattr(
            sec_node.crud,
            "task",
            type(
                "T",
                (),
                {
                    "get_section_process_task_by_section_id_async": staticmethod(
                        async_returning(task)
                    )
                },
            ),
            raising=False,
        )
        return db

    return wire


class TestSectionStatus:
    async def test_writes_the_status_and_commits(self, sec_wired):
        task = Row(status=1, update_time=None)
        db = sec_wired(task=task)

        await sec_node._update_section_status({"section_id": 3, "status": 9})

        assert task.status == 9
        assert db.commits == 1

    async def test_a_missing_task_row_is_tolerated(self, sec_wired):
        db = sec_wired(task=None)
        await sec_node._update_section_status({"section_id": 3, "status": 9})
        assert db.commits == 0

    @pytest.mark.parametrize("state", [{"status": 9}, {"section_id": 3}, {}])
    async def test_missing_context_fails_fast(self, state):
        with pytest.raises(Exception, match="missing section_id or status"):
            await sec_node._update_section_status(state)

    async def test_section_side_has_no_deletion_guard(self):
        # 记录**现状**而非期望：文档侧有 ensure_document_active，专栏侧没有。
        # 钉住它是为了让「统一两侧」成为一个明确的决定，而不是顺手改掉。
        import inspect

        assert "ensure_document_active" not in inspect.getsource(
            sec_node._update_section_status
        )
        assert "ensure_document_active" in inspect.getsource(
            doc_node._update_document_status
        )
