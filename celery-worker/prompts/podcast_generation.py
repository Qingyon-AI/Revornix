def podcast_generation_prompt(
    text: str
):
    prompt = f"""
You are a professional podcast host and script writer.

Please write a natural, spoken-style podcast script based on the topic below.

Requirements:
- The script must be suitable for direct voice narration (TTS-friendly).
- Use a conversational, engaging tone, like a real podcast host speaking.
- Structure the script clearly with:
  - A short opening introduction
  - A well-developed main body (multiple paragraphs)
  - A concluding summary or closing remarks
- Do NOT use bullet points, numbered lists, or markdown formatting.
- Do NOT ask the listener questions or wait for responses.
- Avoid meta commentary such as "in this podcast" or "today we will talk about".
- Keep the flow continuous and smooth for listening.
- Target length: about 4–6 minutes when spoken.

Topic:
{text}
"""
    return prompt