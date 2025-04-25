import asyncio

from neo4j import GraphDatabase
from neo4j_graphrag.embeddings import OpenAIEmbeddings
from neo4j_graphrag.experimental.pipeline.kg_builder import SimpleKGPipeline
from neo4j_graphrag.llm import OpenAILLM

NEO4J_URI = "neo4j://localhost:7687"
NEO4J_USERNAME = "neo4j"
NEO4J_PASSWORD = "password"

# Connect to the Neo4j database
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

# List the entities and relations the LLM should look for in the text
entities = ["Person", "House", "Planet"]
relations = ["PARENT_OF", "HEIR_OF", "RULES"]
potential_schema = [
    ("Person", "PARENT_OF", "Person"),
    ("Person", "HEIR_OF", "House"),
    ("House", "RULES", "Planet"),
]

# Create an Embedder object
embedder = OpenAIEmbeddings(model="text-embedding-3-large")

# Instantiate the LLM
llm = OpenAILLM(
    model_name="gpt-4o",
    model_params={
        "max_tokens": 2000,
        "response_format": {"type": "json_object"},
        "temperature": 0,
    },
)

# Instantiate the SimpleKGPipeline
kg_builder = SimpleKGPipeline(
    llm=llm,
    driver=driver,
    embedder=embedder,
    entities=entities,
    relations=relations,
    on_error="IGNORE",
    from_pdf=False,
)

# Run the pipeline on a piece of text
text = (
    "The son of Duke Leto Atreides and the Lady Jessica, Paul is the heir of House "
    "Atreides, an aristocratic family that rules the planet Caladan."
)
asyncio.run(kg_builder.run_async(text=text))
driver.close()