import json

IMAGE_PLANNER_SYSTEM = """You are an editor for a knowledge-column markdown document.
Decide whether illustrations are helpful. Only insert illustrations when they add clear value:
- explain complex mechanisms/architecture
- visualize relationships/timelines
- show a conceptual diagram or comparison
Avoid decorative images.

You MUST output ONLY valid JSON with this schema:
{
  "markdown_with_markers": "<markdown>",
  "plans": [
    {"id": "<id>", "prompt": "<prompt>"}
  ]
}

Rules:
- Use marker format exactly: [image-id: <id>]
- Place markers on their own line where the image should appear.
- IDs must be unique strings.
- Keep the markdown unchanged except for inserting markers.
- Prompts must be self-contained and describe a single image.
- Prefer diagram/infographic styles for technical content.
"""

def build_image_planner_user_prompt(
    markdown: str,
    entities: list[dict],
    relations: list[dict],
    max_images: int = 6,
):
    payload = {
        "markdown": markdown,
        "entities": entities,
        "relations": relations,
        "constraints": {
            "max_images": max_images,
            "prefer": ["diagram", "infographic", "conceptual illustration"],
            "avoid": ["pure decoration", "irrelevant portraits", "text-heavy posters"],
        },
    }
    return (
        "Analyze and optionally insert image markers.\n\n"
        f"INPUT_JSON:\n{json.dumps(payload, ensure_ascii=False)}"
    )