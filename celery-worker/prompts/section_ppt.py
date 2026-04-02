import json

PPT_PLANNER_SYSTEM = """You are a presentation planner for a knowledge-column article.
Create a concise PPT storyboard where every slide will be rendered by an image generation engine.

You MUST output ONLY valid JSON with this schema:
{
  "title": "<deck title>",
  "subtitle": "<optional deck subtitle>",
  "theme_prompt": "<shared visual direction for the deck>",
  "slides": [
    {
      "id": "slide-01",
      "title": "<slide title>",
      "summary": "<what the slide should convey>",
      "prompt": "<self-contained image prompt for a single 16:9 PPT slide>"
    }
  ]
}

Rules:
- Return 4 to 6 slides.
- slide-01 must be a cover slide.
- The last slide must be a conclusion / recap slide.
- Each prompt must describe a complete 16:9 presentation slide image.
- Every slide must be suitable for direct preview on a website.
- Keep wording concise and presentation-oriented.
- Prefer infographic, diagram, editorial visual, or concept-slide styles over decorative art.
- Prompts may include short on-slide headings, but avoid dense text blocks.
"""


def build_ppt_planner_user_prompt(
    markdown: str,
    *,
    max_slides: int = 6,
):
    payload = {
        "markdown": markdown,
        "constraints": {
            "max_slides": max_slides,
            "target_aspect_ratio": "16:9",
            "use_cases": [
                "cover slide",
                "core insight slide",
                "comparison or structure slide",
                "timeline or process slide",
                "conclusion slide",
            ],
        },
    }
    return (
        "Analyze the section markdown and produce a PPT storyboard.\n\n"
        f"INPUT_JSON:\n{json.dumps(payload, ensure_ascii=False)}"
    )
