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
You are writing a high-quality two-host podcast script for TTS.

Target style:
- A "deep dive" discussion between two smart hosts unpacking the source material.
- Energetic and natural, but information-dense.
- Objective reflection of the source, not generic motivational chatter.

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

Speaker values:
- Use only the following two speaker values. Do not invent a third speaker:
{speaker_list}

Host behavior:
- Host 1 should usually drive structure: introduce the topic, frame why it matters, and keep the conversation moving.
- Host 2 should usually deepen the discussion: add interpretation, ask sharper follow-up questions, surface tradeoffs, examples, risks, or implications.
- The two hosts should feel different, but both should sound competent and grounded.
- Avoid having both hosts say the same thing in different words.

Conversation structure:
- Start with a strong opening that quickly tells the listener what the topic is and why it matters now.
- Move through 3 to 5 core beats or subtopics, each with clear informational progress.
- Include at least some of the following interaction patterns: clarification, challenge, comparison, example, implication, takeaway.
- End with a concise closing synthesis or practical takeaway instead of an abrupt stop.

Hard requirements:
- It must be a true two-person dialogue, not a monologue and not narration.
- Prefer 14 to 24 turns.
- Alternate speakers naturally. Short back-and-forth exchanges are good. Avoid long uninterrupted blocks by one host.
- Each turn should contain one clear idea or move the conversation forward in a meaningful way.
- Keep the pacing tight. Avoid filler like repeated greetings, excessive praise, vague transitions, or empty agreement.
- Each turn's `text` should ideally stay within 220 characters and must never exceed 300 characters.
- The total length of all `text` fields must stay within 10000 characters.
- Do not use markdown, headings, bullet lists, emojis, stage directions, or bracketed action notes.
- Preserve important entities, relationships, numbers, steps, risks, uncertainties, and conclusions whenever possible.
- If the source contains tension, ambiguity, disagreement, or open questions, let the hosts surface that instead of over-smoothing it.
- Do not invent facts, claims, examples, or conclusions that are not supported by the source material.
- Match the source language. If the source is mainly Chinese, output Chinese. English technical terms may remain in English.

Quality bar:
- The dialogue should sound like two people helping the listener understand something non-trivial.
- Prefer concrete statements over abstract summarizing.
- Prefer insight and synthesis over paraphrasing the source sentence by sentence.
- If the material is technical, make it understandable without dumbing it down.
- If the material is narrative or analytical, emphasize the most decision-relevant details.

Before writing, internally identify:
1. the central thesis,
2. the most important supporting points,
3. what is surprising, contentious, useful, or consequential.
Then write the dialogue. Do not output the plan.

Context:
Title: {title_block}
Description: {description_block}

Source material:
<source>
{content}
</source>
"""
    return prompt
