from data.neo4j.base import neo4j_driver

def clear_data():
    with neo4j_driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
        print("All Neo4j nodes and relationships deleted.")
        
if __name__ == "__main__":
    clear_data()