def podcast_dialogue_prompt(
    *,
    content: str,
    speakers: list[str],
    title: str | None = None,
    description: str | None = None,
):
    speaker_list = "\n".join(f"- {speaker}" for speaker in speakers)
    title_block = title.strip() if isinstance(title, str) and title.strip() else "N/A"
    description_block = (
        description.strip()
        if isinstance(description, str) and description.strip()
        else "N/A"
    )
    prompt = f"""
You are a professional podcast writer creating a two-speaker dialogue script for podcast TTS.

You must return only one JSON object. Do not use markdown code fences. Do not explain anything. Do not output any extra text.

The response format must be:
{{
  "nlp_texts": [
    {{
      "speaker": "{speakers[0]}",
      "text": "..."
    }}
  ]
}}

Hard requirements:
- Use only the following two speaker values. Do not invent a third speaker:
{speaker_list}
- It must be a true two-person dialogue, not a monologue and not narration.
- Make it natural and conversational, with real back-and-forth interaction, but avoid excessive small talk.
- The first 1–2 turns must be an opening: one speaker greets the audience and introduces the topic, the other responds to set the stage. Use a natural welcome phrase that fits the source language (e.g. "大家好，欢迎收听……" for Chinese, or "Hey everyone, welcome back…" for English).
- The last 1–2 turns must be a closing sign-off: both speakers wrap up with a brief takeaway and say goodbye to the audience. Use a phrase that fits the source language (e.g. "好，今天就聊到这里，感谢大家收听，我们下期见！" for Chinese, or "That's a wrap for today — thanks for listening, see you next time!" for English).
- Prefer 12 to 24 turns, not counting the opening and closing turns.
- Each turn's `text` should ideally stay within 260 characters and must never exceed 300 characters.
- The total length of all `text` fields must stay within 10000 characters, not counting the opening and closing turns.
- Do not use markdown, headings, bullet lists, emojis, stage directions, or bracketed action notes.
- Preserve important entities, relationships, numbers, steps, risks, and conclusions whenever possible.
- Do not invent information that is not supported by the source material.
- Match the source language. If the source is mainly Chinese, output Chinese. English technical terms may remain in English.

Context:
Title: {title_block}
Description: {description_block}

Source material:
{content}
"""
    return prompt
