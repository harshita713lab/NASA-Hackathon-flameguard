from langgraph.graph import StateGraph, START, END
from app.graph.state import GraphState
from app.graph.nodes import security_guardrail, retrieve_pinecone, retrieve_fallback, generate_synthesis

# --- CONDITIONAL EDGE ROUTING ---

def check_security(state: GraphState) -> str:
    if not state["is_safe"]:
        return "reject"
    return "retrieve"

def check_retrieval_success(state: GraphState) -> str:
    if state["active_source"] == "error" or not state["retrieved_chunks"]:
        return "fallback"
    return "generate"

# --- GRAPH COMPILATION ---

workflow = StateGraph(GraphState)

# Add Nodes
workflow.add_node("security_gate", security_guardrail)
workflow.add_node("pinecone_retriever", retrieve_pinecone)
workflow.add_node("offline_fallback", retrieve_fallback)
workflow.add_node("llm_generator", generate_synthesis)

# Build Edges
workflow.add_edge(START, "security_gate")

workflow.add_conditional_edges(
    "security_gate",
    check_security,
    {
        "retrieve": "pinecone_retriever",
        "reject": END  # Immediately halt execution on malicious input
    }
)

workflow.add_conditional_edges(
    "pinecone_retriever",
    check_retrieval_success,
    {
        "generate": "llm_generator",
        "fallback": "offline_fallback"
    }
)

workflow.add_edge("offline_fallback", "llm_generator")
workflow.add_edge("llm_generator", END)

# Compile into a runnable application
flameguard_graph = workflow.compile()