import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FlameGuardAPI")
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_pinecone import PineconeVectorStore
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from pinecone import Pinecone

# --- NEW: Rate Limiting Imports ---
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Load environment variables
load_dotenv()

# 1. Initialize the Limiter (Tracks requests by user IP address)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="NASA Space Apps - FlameGuard SI API")

# 2. Attach Limiter to the FastAPI app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

INDEX_NAME = "nasa-combustion-rag"

# Figures extracted from the source PDFs live here and are referenced as data/images/<file>.png
IMAGES_DIR = Path(__file__).resolve().parent.parent / "data" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static_images", StaticFiles(directory=IMAGES_DIR), name="static_images")

# 3. Initialize Embeddings and Vector Store
print("Loading HuggingFace Inference for retrieval...")
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)

# 4. Initialize the Groq LLM (Llama 3)
primary_llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model_name="openai/gpt-oss-20b", # Extremely fast inference
    temperature=0.0 # Deterministic output for scientific accuracy
)


fallback_llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.0,
    max_retries=1
)

llm= primary_llm.with_fallback([fallback_llm])


# 5. The Super Intelligence Prompt Template
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
    # Enforce length and automatically strip whitespace
    query: str = Field(
        ..., 
        min_length=5, 
        max_length=500, 
        description="The scientific question being asked. Max 500 characters."
    )
    
    # Restrict to exact categories (adjust these based on your Pinecone metadata)
    fuel_filter: Optional[Literal["Solid", "Liquid", "Gas"]] = None
    
    # Hardcap the Pinecone retrieval volume between 1 and 10 chunks
    top_k: int = Field(
        default=4, 
        ge=1, 
        le=10, 
        description="Number of context chunks to retrieve. Max 10."
    )

    @field_validator('query')
    def sanitize_query(cls, v):
        # Prevent users from bypassing limits with repeating special characters or spaces
        cleaned = ' '.join(v.split())
        if len(cleaned) < 5:
            raise ValueError("Query must contain at least 5 alphanumeric characters.")
        return cleaned

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
@limiter.limit("5/minute") # 6. Apply Rate Limit: 5 requests per minute per IP
async def search_combustion_data(request: Request, search_query: SearchRequest):
    try:
        # A. Retrieve context from Pinecone
        search_kwargs = {"k": search_query.top_k}
        if search_query.fuel_filter:
            search_kwargs["filter"] = {"fuel_state": search_query.fuel_filter}
        docs = vectorstore.similarity_search(search_query.query, **search_kwargs)

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
            "query": search_query.query
        })
        if llm_response:
            print("LLM response:", llm_response.content)

        return SearchResponse(
            synthesized_answer=llm_response.content.replace(
                "data/images/", "http://127.0.0.1:8000/static_images/"
            ),
            raw_results=[
                SearchResult(
                    text=result.text.replace(
                        "data/images/", "http://127.0.0.1:8000/static_images/"
                    ),
                    experiment=result.experiment,
                    fuel_state=result.fuel_state,
                    source=result.source,
                )
                for result in formatted_results
            ],
        )

    except Exception as e:
        # Terminal/Logs mein exact error trace print hoga (Debugging ke liye)
        logger.error(f"Search endpoint error: {str(e)}", exc_info=True)
        
        # User/Client ko sirf ek clean generic message jayega (Security ke liye)
        raise HTTPException(
            status_code=500, 
            detail="An error occurred while processing your scientific query. Please try again later."
        )

@app.get("/")
def health_check():
    return {"status": "FlameGuard SI API is running"}