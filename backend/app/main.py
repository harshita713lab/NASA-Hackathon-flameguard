import logging
import os
from pathlib import Path
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.curated import (
    CURATED_DOCUMENTS,
    find_curated_hits,
    matches_filters,
    normalize_fuel,
    normalize_mission,
    normalize_pillar,
    query_tokens,
    result_key,
    tokenize,
)

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:  # optional fallback provider
    ChatGoogleGenerativeAI = None

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("FlameGuardAPI")

# 1. Initialize the Limiter (Tracks requests by user IP address)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="NASA Space Apps - FlameGuard SI API")

# 2. Attach Limiter to the FaNstAPI app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

INDEX_NAME = "nasa-combustion-rag"
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

# Figures extracted from the source PDFs live here and are referenced as data/images/<file>.png
IMAGES_DIR = Path(__file__).resolve().parent.parent / "data" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static_images", StaticFiles(directory=IMAGES_DIR), name="static_images")


def _tokens(text: str) -> List[str]:
    return tokenize(text)


def _query_tokens(query: str) -> set:
    return query_tokens(query)


def _matches_filters(doc: dict, fuel_filter: Optional[str], mission: Optional[str], pillar: Optional[str]) -> bool:
    return matches_filters(doc, fuel_filter, mission, pillar)


def _curated_hits(
    query: str,
    fuel_filter: Optional[str],
    mission: Optional[str],
    pillar: Optional[str],
    top_k: int,
) -> List[dict]:
    return find_curated_hits(
        CURATED_DOCUMENTS,
        query,
        fuel_filter=fuel_filter,
        mission=mission,
        pillar=pillar,
        top_k=top_k,
    )


def _curated_result(doc: dict) -> "SearchResult":
    return SearchResult(
        text=doc.get("text", ""),
        experiment=doc.get("experiment", "Unknown"),
        fuel_state=doc.get("fuel_state", "Unknown"),
        source=doc.get("source", "Unknown"),
        pillar=doc.get("pillar"),
        environments=doc.get("environments", []),
        citation=doc.get("citation"),
    )


def _pinecone_doc_matches(doc, mission: Optional[str], pillar: Optional[str]) -> bool:
    metadata = doc.metadata or {}
    if mission:
        environments = metadata.get("environments") or metadata.get("environment")
        if isinstance(environments, str):
            environments = [environments]
        if not environments:
            return False
        if mission.lower() not in [str(env).lower() for env in environments]:
            return False
    if pillar and str(metadata.get("pillar", "")).lower() != pillar.lower():
        return False
    return True


def _result_key(text: str) -> str:
    return result_key(text)


# Initialize Embeddings and Vector Store

print("Loading HuggingFace Inference for retrieval...")
try:
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)
except Exception as exc:
    logger.error("Vector store initialization failed, curated PSI records remain available: %s", exc)
    embeddings = None
    vectorstore = None

# 4. Initialize the Groq LLM (Llama 3)
primary_llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model_name="openai/gpt-oss-20b", # Extremely fast inference
    temperature=0.0 # Deterministic output for scientific accuracy
)


fallback_llm = None
if ChatGoogleGenerativeAI is not None and os.getenv("GEMINI_API_KEY"):
    try:
        fallback_llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.0,
            max_retries=1,
        )
    except Exception as exc:  # optional provider must never block startup
        logger.warning("Gemini fallback unavailable: %s", exc)

llm = primary_llm.with_fallbacks([fallback_llm]) if fallback_llm is not None else primary_llm


# 5. The Super Intelligence Prompt Template
system_prompt = (
    "You are a NASA Super Intelligence (SI) aerospace engineer specializing in microgravity fire safety. "
    "Use the provided scientific context from the Physical Science Informatics (PSI) database to answer the query. "
    "Curated NASA PSI records are authoritative: quote their exact values (oxygen %, pressure, flame spread speed) "
    "and name the experiment (BASS-II, Saffire, FLEX, FLEX-2, SAME) or mission environment (ISS, Lunar Base, Spacesuit EVA). "
    "When the context groups findings under the Prevention, Detection or Suppression pillars, keep that framing in the answer; "
    "records without a pillar label are still valid evidence and must not be treated as missing data. "
    "If the context does not contain the answer, state that the data is not available in the current PSI parameters. "
    "\n\nContext:\n{context}"
)
prompt_template = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{query}")
])

# --- Pydantic Schemas ---
FuelFilter = Literal["Solid", "Liquid", "Mixed", "All"]
MissionFilter = Literal["ISS", "Lunar Base", "Spacesuit EVA", "All"]
PillarFilter = Literal["Prevention", "Detection", "Suppression", "All"]


from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=5, max_length=500)
    # NEW: Accept the section type from the frontend UI
    environment: Optional[str] = Field(default=None, description="Filter by environment (e.g., 'ISS', 'Microgravity')")
    section: Optional[str] = Field(default=None, description="Target specific historical events or tech (e.g., 'Apollo 1')")
    fuel_filter: Optional[FuelFilter] = None
    mission: Optional[MissionFilter] = None
    pillar: Optional[PillarFilter] = None
    top_k: int = Field(default=4, ge=1, le=10)

    @field_validator("query")
    @classmethod
    def _sanitize_query(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if len(cleaned) < 5:
            raise ValueError("query must contain at least 5 non-whitespace characters")
        return cleaned

class SearchResult(BaseModel):
    text: str
    experiment: str
    fuel_state: str
    source: str
    pillar: Optional[str] = None
    environments: List[str] = Field(default_factory=list)
    citation: Optional[str] = None

class SearchResponse(BaseModel):
    synthesized_answer: str
    raw_results: List[SearchResult]


# --- API Endpoints ---
@app.post("/api/search", response_model=SearchResponse)
@limiter.limit("5/minute") # Apply Rate Limit: 5 requests per minute per IP
async def search_combustion_data(request: Request, search_query: SearchRequest):
    try:
        fuel_filter = normalize_fuel(search_query.fuel_filter)
        mission = normalize_mission(search_query.mission)
        pillar = normalize_pillar(search_query.pillar)
        top_k = max(1, min(search_query.top_k or 4, 10))

        merged_results: List[SearchResult] = []
        seen = set()

        # A. Curated NASA PSI records (ONLY run if no specific historical section is requested)
        if not search_query.section:
            curated_hits = _curated_hits(search_query.query, fuel_filter, mission, pillar, top_k)
            merged_results = [_curated_result(doc) for doc in curated_hits]
            seen = {_result_key(result.text) for result in merged_results}

        # B. Pinecone fills the slots (or handles the entire query if a section is provided)
        if vectorstore is not None:
            try:
                search_kwargs = {"k": top_k}
                pinecone_filter = {}
                
                # Append filters dynamically based on frontend payload
                if fuel_filter:
                    pinecone_filter["fuel_state"] = fuel_filter
                
                # STRICT SECTION FILTERING
                if search_query.section:
                    pinecone_filter["section"] = search_query.section
                
                if search_query.environment:
                    # Pinecone checks if this string exists inside the metadata array
                    pinecone_filter["environments"] = search_query.environment
                
                # Only pass the filter argument to Pinecone if it contains keys
                if pinecone_filter:
                    search_kwargs["filter"] = pinecone_filter

                docs = vectorstore.similarity_search(search_query.query, **search_kwargs)

                for doc in docs:
                    # Skip mission/pillar matching for non-PSI sections (like Apollo 1)
                    if not search_query.section and not _pinecone_doc_matches(doc, mission, pillar):
                        continue

                    environments = doc.metadata.get("environments") or []
                    if isinstance(environments, str):
                        environments = [environments]

                    result = SearchResult(
                        text=doc.page_content,
                        experiment=doc.metadata.get("experiment", "Unknown"),
                        fuel_state=doc.metadata.get("fuel_state", "Unknown"),
                        source=doc.metadata.get("source", "Unknown"),
                        pillar=doc.metadata.get("pillar"),
                        environments=environments,
                        citation=doc.metadata.get("citation"),
                    )

                    key = _result_key(result.text)
                    if key in seen:
                        continue
                    seen.add(key)
                    merged_results.append(result)
                    if len(merged_results) >= top_k:
                        break
            except Exception as exc:
                logger.warning(
                    "Pinecone retrieval failed: %s", exc
                )
        else:
            logger.warning("Vector store unavailable.")

        formatted_results = merged_results[:top_k]

        # C. Prepare context string for LangGraph
        context_text = "\n\n".join(
            "Experiment: {experiment}\nPillar: {pillar}\nEnvironment: {environment}\n"
            "Source: {source}\nData: {text}".format(
                experiment=result.experiment,
                pillar=result.pillar or "Unspecified",
                environment=", ".join(result.environments) if result.environments else "Unspecified",
                source=(
                    f"{result.source} ({result.citation})"
                    if result.citation
                    else result.source
                ),
                text=result.text,
            )
            for result in formatted_results
        )

        if not context_text:
            context_text = "No curated or vector passages matched this query."

        # D. Invoke LangGraph for agentic reasoning and synthesis
        from app.graph.workflow import flameguard_graph
        
        # UPDATED: Pass all required variables to LangGraph state
        graph_result = flameguard_graph.invoke({
            "query": search_query.query,
            "fuel_filter": fuel_filter,
            "top_k": top_k,
            "retrieved_chunks": formatted_results,
            "context_text": context_text,
            "environment_filter": search_query.environment,
            "section": search_query.section
        })
        
        synthesized_text = graph_result.get("synthesized_answer", "")
        if synthesized_text:
            print("LangGraph SI response generated successfully.")

        # E. Format the response and inject dynamic public image URLs
        return SearchResponse(
            synthesized_answer=synthesized_text.replace(
                "data/images/", f"{PUBLIC_BASE_URL}/static_images/"
            ),
            raw_results=[
                SearchResult(
                    text=result.text.replace(
                        "data/images/", f"{PUBLIC_BASE_URL}/static_images/"
                    ),
                    experiment=result.experiment,
                    fuel_state=result.fuel_state,
                    source=result.source,
                    pillar=result.pillar,
                    environments=result.environments,
                    citation=result.citation,
                )
                for result in formatted_results
            ],
        )

    except Exception as e:
        logger.error(f"Search endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="An error occurred while processing your scientific query. Please try again later."
        )

    
@app.get("/")
def health_check():
    return {"status": "FlameGuard SI API is running"}