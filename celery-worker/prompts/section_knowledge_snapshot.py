import json


SECTION_KNOWLEDGE_SNAPSHOT_SYSTEM = """You are a knowledge architect preparing a structured knowledge snapshot for a single section.

You MUST return ONLY valid JSON.

Rules:
- Ground every knowledge point in the provided source ids.
- Only use ids that already exist in the input payload.
- Keep `main_deck_candidates` concise and easy to turn into a section summary or deck outline later.
- Put overflow or lower-priority supporting material into `appendix_candidates`.
- Keep `core_conclusions` to 2-4 items.
- Keep `topic_clusters` to 2-5 items.
- Keep `key_relations` to 1-4 items.
- Every `knowledge_point` must include:
  - `id`
  - `title`
  - `statement`
  - `topic_id`
  - `deck_role` (`main` or `appendix`)
  - `source_document_ids`
  - `source_chunk_ids`
  - `source_entity_ids`
  - `source_relation_ids`
- `main_deck_candidates` should focus on the section's most important ideas.
- `appendix_candidates` should capture secondary material that still matters for coverage.
- `image_candidates` should prefer existing images first and only mark places where an image would materially help understanding.

Output schema:
{
  "topic_clusters": [
    {
      "id": "topic-1",
      "title": "Topic title",
      "summary": "Short summary",
      "knowledge_point_ids": ["kp-1"],
      "source_document_ids": [1]
    }
  ],
  "knowledge_points": [
    {
      "id": "kp-1",
      "title": "Knowledge point title",
      "statement": "Concrete statement",
      "topic_id": "topic-1",
      "deck_role": "main",
      "source_document_ids": [1],
      "source_chunk_ids": ["chunk-1"],
      "source_entity_ids": ["entity-1"],
      "source_relation_ids": ["rel-1"]
    }
  ],
  "core_conclusions": [
    {
      "id": "conclusion-1",
      "title": "Conclusion title",
      "statement": "One-sentence conclusion",
      "source_knowledge_point_ids": ["kp-1"],
      "source_document_ids": [1]
    }
  ],
  "key_relations": [
    {
      "id": "relation-view-1",
      "title": "Framework title",
      "explanation": "Why the relationship matters",
      "source_relation_ids": ["rel-1"],
      "source_entity_ids": ["entity-1"],
      "source_document_ids": [1]
    }
  ],
  "main_deck_candidates": [
    {
      "id": "deck-main-1",
      "title": "Main deck angle",
      "summary": "Speaker-friendly summary",
      "knowledge_point_ids": ["kp-1"],
      "source_document_ids": [1],
      "source_entity_ids": ["entity-1"]
    }
  ],
  "appendix_candidates": [
    {
      "id": "appendix-1",
      "title": "Appendix title",
      "summary": "Supporting details",
      "knowledge_point_ids": ["kp-2"],
      "source_document_ids": [2]
    }
  ],
  "image_candidates": [
    {
      "id": "img-plan-1",
      "title": "Image need title",
      "why": "Why the image helps",
      "preferred_slide_types": ["cover", "topic"],
      "source_document_ids": [1],
      "asset_key": "existing-image-1"
    }
  ]
}
"""


def build_section_knowledge_snapshot_user_prompt(payload: dict) -> str:
    return (
        "Build a structured knowledge snapshot for this section.\n\n"
        f"INPUT_JSON:\n{json.dumps(payload, ensure_ascii=False)}"
    )
