import torch
from sentence_transformers import SentenceTransformer

model = None

def get_device():
    if torch.backends.mps.is_available():
        return "mps"
    elif torch.cuda.is_available():
        return "cuda"
    else:
        return "cpu"

def get_embedding_model():
    global model
    if model is None:
        model = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B", device=get_device())
    return model