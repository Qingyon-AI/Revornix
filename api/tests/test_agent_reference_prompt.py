"""`@` 引用拼给模型的那一段。

引用在句子里只留标题(「把 @周报 里的三点合成一段摘要」),**id 不进正文**。所以模型要
真的动手就必须从别处知道 id —— 这一段就是那个别处。它要是拼错、拼丢或者拼成一句模型
读不出意图的话,表现不是报错,是智能体去**全库搜索**一个它本来已经被指着的东西。
"""

from __future__ import annotations

from agent.host import _prompt_with_references


def test_no_references_leaves_the_sentence_alone():
    assert _prompt_with_references("帮我写个摘要", None) == "帮我写个摘要"
    assert _prompt_with_references("帮我写个摘要", []) == "帮我写个摘要"


def test_ids_reach_the_model():
    """id 必须出现 —— 这是整段话存在的唯一理由。"""
    out = _prompt_with_references(
        "把 @周报 和 @AI 观察 合起来看",
        [
            {"kind": "document", "id": 12, "name": "周报"},
            {"kind": "section", "id": 3, "name": "AI 观察"},
        ],
    )
    assert "id=12" in out and "id=3" in out
    assert "文档" in out and "专栏" in out
    # 原话必须原样留着:它才是用户问的那一句。
    assert out.startswith("把 @周报 和 @AI 观察 合起来看")


def test_unknown_kind_still_carries_its_id():
    """以后加了新类型而这里忘了加标签时,**退化成少一个词,而不是丢一个 id**。"""
    out = _prompt_with_references("看看这个", [{"kind": "note", "id": 9, "name": "随手记"}])
    assert "id=9" in out


def test_image_only_message_still_gets_the_block():
    """正文可以是空的(只发图片 + 引用),那时这一段自己成一句话,而不是留下一个空行开头。"""
    out = _prompt_with_references("", [{"kind": "document", "id": 4, "name": "合同"}])
    assert out.startswith("[用户引用]")
    assert "id=4" in out
