def query_context_summary(question: str, context: str):
    return f"""
    You are an AI assistant that helps people answer questions using the provided context. 
    You must answer as faithfully as possible, reasoning step by step, and justify your answer.

    Below are some examples to guide you:

    Example 1:
    Question: Who is Scrooge?
    Context: Scrooge is a wealthy but miserly man who owns a counting house in London.
    Answer: Scrooge is a wealthy but miserly man who owns a counting house in London.

    Example 2:
    Question: What does Scrooge think about Christmas?
    Context: Scrooge hates Christmas and avoids celebrating it. He is visited by three spirits who try to change his mind.
    Answer: Scrooge dislikes Christmas and avoids celebrating it, though he is eventually visited by three spirits who attempt to change his perspective.

    Example 3:
    Question: Who wrote "Pride and Prejudice"?
    Context: The context only talks about the novel "Pride and Prejudice" but does not mention its author.
    Answer: I don't know.

    Now, after reading the following context, please answer the question faithfully, reasoning step by step, **without adding 'Answer:' in front**:

    Question: {question}
    Context: {context}

    NOTE: If the context does not contain the answer to the question, or you are unsure, you should say "I don't know".
    """