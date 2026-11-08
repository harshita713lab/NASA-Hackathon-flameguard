
import time
from langchain_huggingface import HuggingFaceEmbeddings

print("Starting LangChain test...", flush=True)

start = time.perf_counter()

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={
        "device": "cpu",
        "local_files_only": True
    },
    encode_kwargs={
        "normalize_embeddings": True
    }
)

print(
    "Initialization:",
    round(time.perf_counter() - start, 2),
    "seconds",
    flush=True
)

start = time.perf_counter()

result = embeddings.embed_query("Testing FlameGuard embeddings")

print(
    "Embedding:",
    round(time.perf_counter() - start, 2),
    "seconds"
)

print("Dimensions:", len(result))
