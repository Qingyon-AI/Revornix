import json

# ──────────────────────────────────────────────────────────────────
# Phase 1 — Script Generation
# The LLM reads the article markdown and outputs a full presentation
# script: deck metadata, per-slide content, speaker notes, layout
# directions, and a rich image-generation prompt for every slide.
# ──────────────────────────────────────────────────────────────────

PPT_SCRIPT_SYSTEM = """You are an expert presentation designer and scriptwriter.

Given a knowledge-column article, produce a comprehensive PPT presentation script.
Every slide will be rendered by an image generation model, so `image_prompt` must be
extremely detailed and fully self-contained.

━━━ OUTPUT FORMAT ━━━
Output ONLY valid JSON with this exact schema — no markdown fences, no extra keys:

{
  "title": "<deck title — concise, impactful, max 10 words>",
  "subtitle": "<optional deck subtitle or source/date line>",
  "theme": {
    "color_palette": "<2-3 hex colors with names, e.g. '#1A2B4A deep navy, #E8A020 amber, #FFFFFF white'>",
    "visual_style": "<aesthetic description, e.g. 'modern minimalist corporate with subtle geometric shapes'>"
  },
  "slides": [
    {
      "id": "slide-01",
      "type": "<cover | overview | insight | comparison | process | data | conclusion>",
      "title": "<slide title — max 8 words>",
      "key_points": ["<point — max 8 words>", "<point — max 8 words>"],
      "speaker_notes": "<presenter narration for this slide — 2-4 sentences summarising what to say>",
      "layout": "<visual layout description — where title, body, visuals are placed>",
      "image_prompt": "<complete image-generation prompt — see rules below, minimum 80 words>"
    }
  ]
}

━━━ IMAGE PROMPT RULES ━━━
Every `image_prompt` MUST follow this five-part structure:

  "Professional 16:9 presentation [TYPE] slide.
   BACKGROUND: [solid color or gradient with hex values].
   LAYOUT: [describe each zone — e.g. 'top-quarter: title band; center: 3-column icon grid; bottom strip: footer'].
   VISUAL ELEMENTS: [specific diagrams, icons, charts — e.g. '3 icons (speed/accuracy/scale) with label below each'].
   TEXT ON SLIDE: title '[EXACT TITLE]'[, bullet points or data labels as they should appear].
   COLOR PALETTE: [list hex codes].
   STYLE: clean modern professional infographic, no decorative art, no photographic imagery."

Additional constraints:
- Describe placement with precise terms: top / center / left / right / bottom, halves, thirds, quarters
- Include ALL text that should appear on the slide: title, bullets, callout numbers, axis labels
- Specify visual elements concretely:
    • cover      → bold oversized title, brand-color background, minimal abstract geometric accent
    • overview   → numbered agenda list, icon per item, clean two-column or single-column layout
    • insight    → large callout stat or headline finding, supporting icon or mini-diagram
    • comparison → clear two- or three-column side-by-side table or card layout
    • process    → numbered step boxes connected by horizontal or vertical arrows
    • data       → chart type specified (bar / line / pie / donut), labeled axes or segments
    • conclusion → numbered key-takeaway list (3-5 items), optional closing icon or tagline

━━━ STRUCTURE RULES ━━━
- Produce 5 to 7 slides total
- slide-01  MUST be type "cover"
- slide-02  SHOULD be type "overview" (agenda / key topics)
- Middle slides (03 to N-1): 2-4 content slides (insight | comparison | process | data)
- Last slide MUST be type "conclusion"
- Every slide must have a visually distinct layout from all other slides
- key_points may be empty [] for cover and conclusion slides if not needed
"""


def build_ppt_script_user_prompt(
    markdown: str,
    *,
    max_slides: int = 7,
) -> str:
    payload = {
        "article_markdown": markdown,
        "requirements": {
            "slide_count": f"5 to {max_slides}",
            "aspect_ratio": "16:9",
            "mandatory_slide_types": ["cover", "overview", "conclusion"],
            "optional_slide_types": ["insight", "comparison", "process", "data"],
        },
    }
    return (
        "Analyze this knowledge article and produce a complete PPT presentation script "
        "with a detailed image_prompt for every slide.\n\n"
        f"ARTICLE:\n{json.dumps(payload, ensure_ascii=False)}"
    )


# ──────────────────────────────────────────────────────────────────
# Legacy aliases — kept so any external import still resolves.
# New code should use PPT_SCRIPT_SYSTEM / build_ppt_script_user_prompt.
# ──────────────────────────────────────────────────────────────────
PPT_PLANNER_SYSTEM = PPT_SCRIPT_SYSTEM
PPT_PLANNER_MAX_CHARS = 18_000


def build_ppt_planner_user_prompt(
    markdown: str,
    *,
    max_slides: int = 7,
) -> str:
    return build_ppt_script_user_prompt(markdown, max_slides=max_slides)
