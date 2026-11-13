from typing import TypedDict, Optional, List, Dict, Any

class GraphState(TypedDict):
    query: str
    fuel_filter: Optional[str]
    top_k: int
    is_safe: bool
    retrieved_chunks: List[Dict[str, Any]]
    
    # NEW: Variables passed from main.py
    context_text: str 
    environment_filter: Optional[str]
    section: Optional[str]
    
    synthesized_answer: str
    active_source: str  # Tracks whether Pinecone or Fallback was used