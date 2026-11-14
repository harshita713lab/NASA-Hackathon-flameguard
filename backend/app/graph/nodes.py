import os
import json
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.graph.state import GraphState
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file


# Initialize Core Services Once
print("Booting up AI models... (This takes a few seconds)")

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={
        "device": "cpu",
        "local_files_only": False
    },
    encode_kwargs={
        "normalize_embeddings": True
    }
)
print("✅ HuggingFace Embeddings Loaded!")

vectorstore = PineconeVectorStore(index_name="nasa-combustion-rag", embedding=embeddings)
print("✅ Pinecone Connected!")

llm = ChatGroq(api_key=os.getenv("GROQ_API_KEY"), model_name="openai/gpt-oss-20b", temperature=0.0)
print("✅ Groq LLM Initialized!")

# --- NODES ---

def security_guardrail(state: GraphState) -> GraphState:
    """Detects basic prompt injection or malformed queries."""
    query = state["query"].lower()
    suspicious_keywords = ["ignore previous", "system prompt", "bypass", "jailbreak"]
    
    is_safe = not any(word in query for word in suspicious_keywords)
    if len(query) > 500: 
        is_safe = False
        
    return {"is_safe": is_safe}

def retrieve_pinecone(state: GraphState) -> GraphState:
    """Attempts to fetch from cloud Pinecone and formats image paths."""
    try:
        # Use .get() with a default of 4
        top_k = state.get("top_k", 4) 
        search_kwargs = {"k": top_k}
        
        if state.get("fuel_filter"):
            search_kwargs["filter"] = {"fuel_state": state["fuel_filter"]}
            
        docs = vectorstore.similarity_search(state["query"], **search_kwargs)
        
        chunks = []
        for doc in docs:
            formatted_text = doc.page_content.replace(
                "data/images/", 
                "http://127.0.0.1:8000/static_images/"
            )
            
            chunks.append({
                "text": formatted_text,
                "experiment": doc.metadata.get("experiment", "Unknown"),
                "fuel_state": doc.metadata.get("fuel_state", "Unknown"),
                "source": doc.metadata.get("source", "Unknown")
            })
        
        return {"retrieved_chunks": chunks, "active_source": "pinecone"}
    except Exception as e:
        print(f"Pinecone Error: {e} - Triggering Fallback")
        return {"retrieved_chunks": [], "active_source": "error"}

def retrieve_fallback(state: GraphState) -> GraphState:
    """Zero-downtime offline failover if Pinecone API drops."""
    fallback_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "fallback.json"))
    chunks = []
    
    # Use .get() with a default of 4 to prevent KeyErrors
    top_k = state.get("top_k", 4)
    
    if os.path.exists(fallback_path):
        with open(fallback_path, "r") as f:
            backup_data = json.load(f)
            chunks = [item for item in backup_data if item["fuel_state"] == state.get("fuel_filter", item["fuel_state"])][:top_k]
            
    return {"retrieved_chunks": chunks, "active_source": "offline_fallback"}

import re # Add this import at the top of nodes.py

def generate_synthesis(state: GraphState) -> GraphState:
    """Formats context, enforces NASA physics constraints, deduplicates visuals, and calls Groq Llama 3."""
    
    # 1. Dynamically adjust the persona focus based on what the user filtered
    focus_instruction = ""
    if state.get("environment_filter"):
        focus_instruction += f"\n- CRITICAL FOCUS: The user is specifically asking about the {state['environment_filter']} environment. Tailor your analysis heavily toward this setting."
    if state.get("section"):
        focus_instruction += f"\n- HISTORICAL CONTEXT: The user is investigating the '{state['section']}' section. Frame your response around this specific topic or incident."

    system_prompt = (
        "You are a NASA Super Intelligence (SI) aerospace engineer specializing in microgravity fire safety. "
        "Use the provided scientific context to answer the query. "
        f"{focus_instruction}"
        "\n\nCRITICAL DOMAIN CONSTRAINTS:"
        "\n1. LUNAR BASE & SPACESUITS: When evaluating flammability, explicitly factor in that Spacesuits operate at 100% O2 (4.3 psi), and future Lunar Bases will operate at >30% O2 (10.2 psi). Compare this against Earth's 21% O2 baseline."
        "\n2. HARDWARE: Distinguish between MSG (Microgravity Science Glovebox) and CIR (Combustion Integrated Rack) experiments."
        "\n3. EARTH APPLICATIONS: If requested, explicitly map microgravity combustion findings to terrestrial applications (e.g., fine-water-mist extinguishers, smoke detection)."
        "\n4. STRUCTURE: When asked to compare investigations, proactively generate Markdown tables mapping differences in fuels, airflow, and O2 concentrations. Rank findings by relevance to habitable environments."
        "\n\nCRITICAL INSTRUCTION FOR VISUALS: If the context contains Markdown image tags (e.g., ![Image](http...)), "
        "you MUST include those exact Markdown image tags in your synthesized answer. Ensure each unique image is only displayed exactly ONCE. "
        "Never apologize or state that you cannot display images. "
        "\n\nContext:\n{context}"
    )
    
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{query}")
    ])
    
    # --- ARCHITECTURE UPDATE: Regex Deduplication ---
    seen_images = set()
    cleaned_chunks = []
    
    for chunk in state.get("retrieved_chunks", []):
        # Handle both Pydantic objects (from main.py) and dictionaries safely
        text = chunk.text if hasattr(chunk, 'text') else chunk.get("text", "")
        experiment = chunk.experiment if hasattr(chunk, 'experiment') else chunk.get("experiment", "Unknown")
        
        img_tags = re.findall(r'!\[.*?\]\(.*?\)', text)
        
        for tag in img_tags:
            if tag in seen_images:
                text = text.replace(tag, "")
            else:
                seen_images.add(tag)
                
        cleaned_chunks.append(f"Experiment: {experiment}\nData: {text.strip()}")
        
    context_text = "\n\n".join(cleaned_chunks)
    
    chain = prompt_template | llm
    llm_response = chain.invoke({"context": context_text, "query": state["query"]})
    
    return {"synthesized_answer": llm_response.content}