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
  - A warm opening that greets the audience and briefly teases what this episode is about. Use a natural welcome phrase that fits the source language (e.g. "欢迎收听，今天我们来聊一聊……" for Chinese, or "Welcome back, today we're diving into…" for English).
  - A well-developed main body (multiple paragraphs)
  - A genuine closing that summarizes the key takeaway and signs off warmly. Use a phrase that fits the source language (e.g. "好了，今天的内容就到这里，感谢你的收听，我们下期见！" for Chinese, or "That's all for today — thanks for listening, and we'll see you next time!" for English).
- Do NOT use bullet points, numbered lists, or markdown formatting.
- Do NOT ask the listener questions or wait for responses.
- Avoid meta commentary such as "in this podcast" or "today we will talk about".
- Keep the flow continuous and smooth for listening.
- Target length: about 4–6 minutes when spoken for the main body alone, not counting the opening and closing.

Topic:
{text}
"""
    return prompt