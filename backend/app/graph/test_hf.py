
import time
import psutil
import torch

start = time.perf_counter()

print("PyTorch version:", torch.__version__)
print("CPU threads:", torch.get_num_threads())
print("CPU cores:", psutil.cpu_count())
print("Available RAM:", round(psutil.virtual_memory().available / 1024**3, 2), "GB")

t1 = time.perf_counter()

from sentence_transformers import SentenceTransformer

print("Import time:", round(time.perf_counter() - t1, 2), "seconds")

t2 = time.perf_counter()

model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2",
    local_files_only=False
)

print("Model initialization:", round(time.perf_counter() - t2, 2), "seconds")

t3 = time.perf_counter()

embedding = model.encode("Testing FlameGuard embeddings")

print("Embedding generation:", round(time.perf_counter() - t3, 2), "seconds")
print("Embedding dimensions:", len(embedding))
print("Total time:", round(time.perf_counter() - start, 2), "seconds")
