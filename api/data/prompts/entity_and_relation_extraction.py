from data.custom_types.all import ChunkInfo

def entity_and_relation_extraction_prompt(chunk: ChunkInfo): 
    return f"""
    You are an expert in Information Extraction. 
    Your task is to extract **entities** and **relationships** from the given text. 
    Follow the rules carefully:

    1. Identify all key entities (人物、地点、组织、概念).  
    Each entity must include:
    - "id": unique ID in format "CHUNK_{chunk.id}_ENTITY_1", "CHUNK_{chunk.id}_ENTITY_2", ...  
    - "text": the exact text span.  
    - "entity_type": one of ["Person", "Location", "Organization", "Concept", "Other"].  

    2. Extract relationships between entities:
    NOTE: Each relation links two entity ids.  
    Each relation must include:
    - "src_entity_id": source entity id.
    - "tgt_entity_id": target entity id.
    - "relation_type": one of ["MENTIONS", "LOCATED_IN", "PART_OF", "FOUNDED_BY", "RELATED_TO", "TEACHES", "LIVED_IN"].

    3. Output must be **valid JSON only**, with the structure:
    {{
    "entities": [...],
    "relations": [...]
    }}

    ⚠️ Do not include explanations, comments, or extra text. Only output JSON.

    ——————
    Example:
    CHUNK_ID: 1  
    Text: Confucius was a famous philosopher in ancient China. He taught many students, including Mencius. Confucius lived in the State of Lu.  
    Output: {{
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
    ——————

    CHUNK_ID: {chunk.id}  
    Text: {chunk.text}  
    """