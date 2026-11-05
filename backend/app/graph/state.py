from typing import TypedDict, List, Dict, Any, Optional

class GraphState(TypedDict):
    query: str
    fuel_filter: Optional[str]
    top_k: int
    is_safe: bool
    retrieved_chunks: List[Dict[str, Any]]
    synthesized_answer: str
    active_source: str  # Tracks whether Pinecone or Fallback was used