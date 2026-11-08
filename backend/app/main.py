import json
import logging
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FlameGuardAPI")
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
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

# Figures extracted from the source PDFs live here and are referenced as data/images/<file>.png
IMAGES_DIR = Path(__file__).resolve().parent.parent / "data" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static_images", StaticFiles(directory=IMAGES_DIR), name="static_images")

# --- Curated NASA PSI records (offline-safe retrieval layer) ---
CURATED_PATH = Path(__file__).resolve().parent.parent / "data" / "curated" / "psi_curated_data.json"

MISSION_ALIASES = {
    "iss": "ISS",
    "space station": "ISS",
    "lunar": "Lunar Base",
    "lunar base": "Lunar Base",
    "lunar habitat": "Lunar Base",
    "spacesuit": "Spacesuit EVA",
    "spacesuit eva": "Spacesuit EVA",
    "eva": "Spacesuit EVA",
}
PILLAR_NAMES = ("Prevention", "Detection", "Suppression")

STOPWORDS = {
    "a", "about", "an", "and", "any", "are", "as", "at", "be", "been", "by", "can",
    "could", "data", "did", "do", "does", "for", "from", "give", "has", "have",
    "how", "i", "in", "is", "it", "its", "me", "of", "on", "or", "please", "show",
    "tell", "that", "the", "their", "them", "there", "these", "they", "this",
    "to", "was", "we", "were", "what", "when", "where", "which", "who", "why",
    "will", "with", "would", "you", "your",
}
TOKEN_RE = re.compile(r"[a-z0-9]+(?:\.[0-9]+)?")
TOKEN_ALIASES = {
    "o2": ("oxygen",),
    "oxygen": ("o2",),
    "psi": ("pressure",),
    "pressure": ("psi",),
    "speed": ("rate", "velocity"),
    "rate": ("speed",),
    "velocity": ("speed",),
    "percent": ("percentage",),
    "percentage": ("percent",),
    "extinguish": ("extinction", "extinguishment"),
    "extinguishment": ("extinction",),
    "extinction": ("extinguish",),
    "fire": ("flame", "combustion"),
    "flame": ("fire", "combustion"),
    "detector": ("detection",),
    "detection": ("detector",),
}


def load_curated_documents():
    try:
        with CURATED_PATH.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except FileNotFoundError:
        logger.warning("Curated PSI dataset not found at %s", CURATED_PATH)
        return []
    except (OSError, json.JSONDecodeError) as exc:
        logger.error("Could not load curated PSI dataset: %s", exc)
        return []

    documents = payload.get("documents", [])
    logger.info("Loaded %d curated NASA PSI records", len(documents))
    return documents


CURATED_DOCUMENTS = load_curated_documents()


def _normalize_fuel(value: Optional[str]) -> Optional[str]:
    if not value or value.strip().lower() in ("", "all", "any", "none"):
        return None
    return value.strip()


def _normalize_mission(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = value.strip()
    if cleaned.lower() in ("", "all", "any", "none"):
        return None
    return MISSION_ALIASES.get(cleaned.lower(), cleaned)


def _normalize_pillar(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = value.strip()
    if cleaned.lower() in ("", "all", "any", "none"):
        return None
    for pillar in PILLAR_NAMES:
        if cleaned.lower() == pillar.lower():
            return pillar
    return cleaned


def _tokens(text: str) -> List[str]:
    return TOKEN_RE.findall((text or "").lower())


def _query_tokens(query: str) -> set:
    expanded = set()
    for token in _tokens(query):
        if token in STOPWORDS or len(token) < 2:
            continue
        expanded.add(token)
        expanded.update(TOKEN_ALIASES.get(token, ()))
    return expanded


def _matches_filters(doc: dict, fuel_filter: Optional[str], mission: Optional[str], pillar: Optional[str]) -> bool:
    if fuel_filter and doc.get("fuel_state", "").lower() != fuel_filter.lower():
        return False
    if mission:
        environments = [str(env).lower() for env in doc.get("environments", [])]
        if mission.lower() not in environments:
            return False
    if pillar and doc.get("pillar", "").lower() != pillar.lower():
        return False
    return True


def _curated_hits(
    query: str,
    fuel_filter: Optional[str],
    mission: Optional[str],
    pillar: Optional[str],
    top_k: int,
) -> List[dict]:
    query_tokens = _query_tokens(query)
    if not query_tokens:
        return []

    hits = []
    for doc in CURATED_DOCUMENTS:
        if not _matches_filters(doc, fuel_filter, mission, pillar):
            continue

        keyword_tokens = set(_tokens(" ".join(doc.get("keywords", []))))
        label_tokens = set(
            _tokens(
                " ".join(
                    [
                        str(doc.get("experiment", "")),
                        str(doc.get("source", "")),
                        str(doc.get("fuel_state", "")),
                        str(doc.get("pillar", "")),
                        " ".join(doc.get("environments", [])),
                    ]
                )
            )
        )
        text_tokens = set(_tokens(doc.get("text", "")))

        score = 0
        for token in query_tokens:
            if token in keyword_tokens:
                score += 4
            elif token in label_tokens:
                score += 2
            elif token in text_tokens:
                score += 1

        if score > 0:
            hits.append((score, str(doc.get("id", "")), doc))

    hits.sort(key=lambda item: (-item[0], item[1]))
    limit = max(top_k * 3, 8)
    return [doc for _, _, doc in hits[:limit]]


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
    return " ".join((text or "").lower().split())[:120]


# 1. Initialize Embeddings and Vector Store
print("Loading HuggingFace Inference for retrieval...")
try:
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)
except Exception as exc:
    logger.error("Vector store initialization failed, curated PSI records remain available: %s", exc)
    embeddings = None
    vectorstore = None

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
class SearchRequest(BaseModel):
    query: str
    fuel_filter: Optional[str] = None
    mission: Optional[str] = None
    pillar: Optional[str] = None
    top_k: int = 4

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
async def search_combustion_data(request: SearchRequest):
    try:
        fuel_filter = _normalize_fuel(request.fuel_filter)
        mission = _normalize_mission(request.mission)
        pillar = _normalize_pillar(request.pillar)
        top_k = max(1, min(request.top_k or 4, 10))

        # A. Curated NASA PSI records are retrieved first and act as the authoritative layer.
        curated_hits = _curated_hits(request.query, fuel_filter, mission, pillar, top_k)
        merged_results: List[SearchResult] = [_curated_result(doc) for doc in curated_hits]
        seen = {_result_key(result.text) for result in merged_results}

        # B. Pinecone fills the remaining slots; curated records keep working if it is unavailable.
        if vectorstore is not None:
            try:
                search_kwargs = {"k": top_k}
                if fuel_filter:
                    search_kwargs["filter"] = {"fuel_state": fuel_filter}
                docs = vectorstore.similarity_search(request.query, **search_kwargs)

                for doc in docs:
                    if not _pinecone_doc_matches(doc, mission, pillar):
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
                    "Pinecone retrieval failed, serving curated NASA PSI records only: %s", exc
                )
        else:
            logger.warning("Vector store unavailable, serving curated NASA PSI records only.")

        formatted_results = merged_results[:top_k]

        # C. Prepare context string for the LLM
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

        # D. Generate the SI synthesized answer
        chain = prompt_template | llm
        llm_response = chain.invoke({
            "context": context_text,
            "query": request.query
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
                    pillar=result.pillar,
                    environments=result.environments,
                    citation=result.citation,
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
