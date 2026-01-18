from data.custom_types.all import ChunkInfo


def entity_and_relation_extraction_prompt(chunk: ChunkInfo):
    return f"""
You are an expert in Knowledge Graph Construction and Information Extraction.  
Your task is to extract **high-value entities** and **meaningful relationships** from the given text.  
Follow the rules carefully and avoid low-value or trivial results.

---

### 🧠 1. ENTITY EXTRACTION RULES

Extract only **meaningful and semantically rich entities** (人物、人名、地点、组织、概念).  
Each entity must include:
- "id": unique ID in format "CHUNK_{chunk.id}_ENTITY_1", "CHUNK_{chunk.id}_ENTITY_2", ...  
- "text": the exact text span from the text (not paraphrased).
- "entity_type": one of ["Person", "Location", "Organization", "Concept", "Other"].

#### ✅ Extract entity **only if** it meets at least one condition:
- It represents a specific and identifiable person, location, organization, or concept.
- It contributes meaning or factual information (e.g., historical figure, company, country, theory, event, book, ideology).
- It is unique and non-trivial (not a generic noun or pronoun).

#### 🚫 Do NOT extract:
- Generic or abstract words: "this", "thing", "system", "way", "people", "problem".
- Pronouns: "he", "she", "it", "they", "we".
- Determiners or general terms: "the world", "a person", "the company".
- Repetitive or meaningless short terms.
- Numbers or dates alone (unless they represent named events like "World War II").

---

### 🔗 2. RELATIONSHIP EXTRACTION RULES

Extract only **meaningful and verifiable semantic relationships** between entities.  
Each relation must include:
- "src_entity_id": source entity id.
- "tgt_entity_id": target entity id.
- "relation_type": one of ["MENTIONS", "LOCATED_IN", "PART_OF", "FOUNDED_BY", "RELATED_TO", "TEACHES", "LIVED_IN"].

#### ✅ Prefer relations that express:
- Teaching / authorship / creation / founding
- Geographical or organizational inclusion
- Historical or factual relationships
- Conceptual or semantic linkage (“X is related to Y”, “X part of Y”)

#### 🚫 Avoid:
- Random or weak co-occurrence relations
- Relations with generic entities or without clear meaning

---

### 📦 3. OUTPUT FORMAT

You must output **strict JSON only**, no comments or explanations.

Format:
{{
  "entities": [...],
  "relations": [...]
}}

---

### 🧩 Example
CHUNK_ID: 1  
Text: Confucius was a famous philosopher in ancient China. He taught many students, including Mencius. Confucius lived in the State of Lu.  

Output:
{{
  "entities": [
    {{"id": "CHUNK_1_ENTITY_1", "text": "Confucius", "entity_type": "Person"}},
    {{"id": "CHUNK_1_ENTITY_2", "text": "Mencius", "entity_type": "Person"}},
    {{"id": "CHUNK_1_ENTITY_3", "text": "State of Lu", "entity_type": "Location"}},
    {{"id": "CHUNK_1_ENTITY_4", "text": "ancient China", "entity_type": "Location"}}
  ],
  "relations": [
    {{"src_entity_id": "CHUNK_1_ENTITY_1", "tgt_entity_id": "CHUNK_1_ENTITY_2", "relation_type": "TEACHES"}},
    {{"src_entity_id": "CHUNK_1_ENTITY_1", "tgt_entity_id": "CHUNK_1_ENTITY_3", "relation_type": "LIVED_IN"}},
    {{"src_entity_id": "CHUNK_1_ENTITY_1", "tgt_entity_id": "CHUNK_1_ENTITY_4", "relation_type": "MENTIONS"}}
  ]
}}

---

CHUNK_ID: {chunk.id}  
Text: {chunk.text}
    """
