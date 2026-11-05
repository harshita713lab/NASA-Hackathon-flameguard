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
        "local_files_only": True
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
        search_kwargs = {"k": state["top_k"]}
        if state.get("fuel_filter"):
            search_kwargs["filter"] = {"fuel_state": state["fuel_filter"]}
            
        docs = vectorstore.similarity_search(state["query"], **search_kwargs)
        
        chunks = []
        for doc in docs:
            # Dynamically rewrite the internal database path to the public API URL
            # From: ![](data/images/image.png)
            # To:   ![](http://127.0.0.1:8000/static_images/image.png)
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
    
    if os.path.exists(fallback_path):
        with open(fallback_path, "r") as f:
            backup_data = json.load(f)
            # Basic keyword match for the offline backup
            chunks = [item for item in backup_data if item["fuel_state"] == state.get("fuel_filter", item["fuel_state"])][:state["top_k"]]
            
    return {"retrieved_chunks": chunks, "active_source": "offline_fallback"}

import re # Add this import at the top of nodes.py

def generate_synthesis(state: GraphState) -> GraphState:
    """Formats context, deduplicates visuals, and calls Groq Llama 3."""
    
    # --- PROMPT UPDATE: Added constraint to never repeat visuals ---
    system_prompt = (
        "You are a NASA Super Intelligence (SI) aerospace engineer specializing in microgravity fire safety. "
        "Use the provided scientific context from the Physical Science Informatics (PSI) database to answer the query. "
        "CRITICAL INSTRUCTION FOR VISUALS: If the context contains Markdown image tags (e.g., ![Image](http...)), "
        "you MUST include those exact Markdown image tags in your synthesized answer so the user can see them. "
        "Ensure each unique image is only displayed exactly ONCE. Never repeat the same image. "
        "Never apologize or state that you cannot display images. "
        "If the context does not contain the answer, state that the data is not available. "
        "\n\nContext:\n{context}"
    )
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{query}")
    ])
    
    # --- ARCHITECTURE UPDATE: Regex Deduplication ---
    seen_images = set()
    cleaned_chunks = []
    
    for chunk in state["retrieved_chunks"]:
        text = chunk.get("text", "")
        
        # Find all markdown image tags: matches ![...](...) or ![](...)
        img_tags = re.findall(r'!\[.*?\]\(.*?\)', text)
        
        for tag in img_tags:
            if tag in seen_images:
                # If we already have this image, erase the duplicate from this chunk
                text = text.replace(tag, "")
            else:
                # First time seeing this image, add it to our tracker
                seen_images.add(tag)
                
        cleaned_chunks.append(f"Experiment: {chunk.get('experiment')}\nData: {text.strip()}")
        
    context_text = "\n\n".join(cleaned_chunks)
    
    chain = prompt_template | llm
    llm_response = chain.invoke({"context": context_text, "query": state["query"]})
    
    return {"synthesized_answer": llm_response.content}