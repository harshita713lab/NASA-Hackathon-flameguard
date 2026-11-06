import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from pinecone import Pinecone

# Load environment variables
load_dotenv()

app = FastAPI(title="NASA Space Apps - FlameGuard SI API")
INDEX_NAME = "nasa-combustion-rag"

# 1. Initialize Embeddings and Vector Store
print("Loading HuggingFace Inference for retrieval...")
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)

# 2. Initialize the Groq LLM (Llama 3)
llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model_name="openai/gpt-oss-20b", # Extremely fast inference
    temperature=0.0 # Deterministic output for scientific accuracy
)

# 3. The Super Intelligence Prompt Template
system_prompt = (
    "You are a NASA Super Intelligence (SI) aerospace engineer specializing in microgravity fire safety. "
    "Use the provided scientific context from the Physical Science Informatics (PSI) database to answer the query. "
    "Extract exact numerical variables (e.g., oxygen %, pressure, flame spread speed) when available. "
    "If the context does not contain the answer, state that the data is not available in the current PSI parameters. "
    "\n\nContext:\n{context}"
)
prompt_template = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{query}")
])

# --- Pydantic Schemas ---
class SearchRequest(BaseModel):
    query: str
    fuel_filter: Optional[str] = None
    top_k: int = 4

class SearchResult(BaseModel):
    text: str
    experiment: str
    fuel_state: str
    source: str

class SearchResponse(BaseModel):
    synthesized_answer: str
    raw_results: List[SearchResult]

# --- API Endpoints ---
@app.post("/api/search", response_model=SearchResponse)
async def search_combustion_data(request: SearchRequest):
    try:
        # A. Retrieve context from Pinecone
        search_kwargs = {"k": request.top_k}
        if request.fuel_filter:
            search_kwargs["filter"] = {"fuel_state": request.fuel_filter}
        docs = vectorstore.similarity_search(request.query, **search_kwargs)

        formatted_results = [
            SearchResult(
                text=doc.page_content,
                experiment=doc.metadata.get("experiment", "Unknown"),
                fuel_state=doc.metadata.get("fuel_state", "Unknown"),
                source=doc.metadata.get("source", "Unknown")
            )
            for doc in docs
        ]

        # B. Prepare context string for the LLM
        context_text = "\n\n".join(
            [f"Experiment: {res.experiment}\nData: {res.text}" for res in formatted_results]
        )

        # C. Generate the SI synthesized answer
        chain = prompt_template | llm
        llm_response = chain.invoke({
            "context": context_text,
            "query": request.query
        })
        if llm_response:
            print("LLM response:", llm_response.content)

        return SearchResponse(
            synthesized_answer=llm_response.content,
            raw_results=formatted_results
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def health_check():
    return {"status": "FlameGuard SI API is running"}
