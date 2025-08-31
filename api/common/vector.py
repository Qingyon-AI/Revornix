from pymilvus import MilvusClient, AnnSearchRequest, WeightedRanker
from config.milvus import MILVUS_TOKEN, MILVUS_CLUSTER_ENDPOINT
from chonkie import TokenChunker
from pymilvus.model import DefaultEmbeddingFunction
from pymilvus.model.sparse import SpladeEmbeddingFunction

dense_model = DefaultEmbeddingFunction()
splade_model = SpladeEmbeddingFunction(batch_size=16)
chunker = TokenChunker(chunk_size=4096)

milvus_client = MilvusClient(
    uri=MILVUS_CLUSTER_ENDPOINT,
    token=MILVUS_TOKEN
)

document_collection_name = "document"

def hybrid_search(
    milvus_client: MilvusClient,
    collection_name: str,
    query_dense_embedding,
    query_sparse_embedding,
    sparse_weight=0.8,
    dense_weight=0.2,
    limit=10,
    threshold=0.5
):
    dense_search_params = {"metric_type": "IP", "params": {}}
    dense_req = AnnSearchRequest(
        data=[query_dense_embedding],
        anns_field="dense",
        param=dense_search_params,
        limit=limit
    )
    sparse_search_params = {"metric_type": "IP", "params": {}}
    sparse_req = AnnSearchRequest(
        data=[query_sparse_embedding],
        anns_field="sparse",
        param=sparse_search_params,
        limit=limit
    )
    ranker = WeightedRanker(sparse_weight, dense_weight)
    results = milvus_client.hybrid_search(
        collection_name=collection_name,
        reqs=[sparse_req, dense_req],
        ranker=ranker,
        limit=limit,
        output_fields=['text', 'document_id']
    )[0]
    
    # filter the results based on the threshold
    filtered_results = [r for r in results if r.get('distance') >= threshold]
    
    return filtered_results

def process_document(document_id: int, 
                     document_category: int, 
                     document_content: str):
    if document_content == "" or document_content is None:
        return []
    chunks = chunker(document_content)
    # make a copy of the chunks and convert to a list of strings
    docs = [chunk.text.strip() for chunk in chunks if chunk.text.strip()]
    dense_embeddings = dense_model.encode_documents(docs)
    sparses = splade_model.encode_documents(docs)
    data = [
        {
            "category": document_category, 
            "document_id": document_id,
            "text": docs[i], 
            "dense": dense_embeddings[i],
            "sparse": sparses._getrow(i)
        }
        for i in range(len(docs))
    ]
    return data

def process_query(query: str):
    query_dense_embedding = dense_model.encode_queries([query])[0]
    query_sparse_embedding = splade_model.encode_queries([query])._getrow(0)
    return query_dense_embedding, query_sparse_embedding