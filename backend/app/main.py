import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from app.graph.workflow import flameguard_graph

load_dotenv()

app = FastAPI(title="NASA Space Apps - FlameGuard SI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

IMAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "images"))
os.makedirs(IMAGE_DIR, exist_ok=True)
app.mount("/static_images", StaticFiles(directory=IMAGE_DIR), name="static_images")

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

@app.post("/api/search", response_model=SearchResponse)
async def search_combustion_data(request: SearchRequest):
    try:
        # Initialize graph state
        initial_state = {
            "query": request.query,
            "fuel_filter": request.fuel_filter,
            "top_k": request.top_k,
            "is_safe": True,
            "retrieved_chunks": [],
            "synthesized_answer": "",
            "active_source": ""
        }
        
        # Execute the LangGraph workflow
        final_state = flameguard_graph.invoke(initial_state)
        
        if not final_state["is_safe"]:
            return SearchResponse(
                synthesized_answer="Query rejected due to security policy or prompt injection detection.",
                raw_results=[]
            )

        # Map state back to Pydantic schema
        formatted_results = [
            SearchResult(
                text=chunk.get("text", ""),
                experiment=chunk.get("experiment", "Unknown"),
                fuel_state=chunk.get("fuel_state", "Unknown"),
                source=chunk.get("source", "Unknown")
            )
            for chunk in final_state["retrieved_chunks"]
        ]

        return SearchResponse(
            synthesized_answer=final_state["synthesized_answer"],
            raw_results=formatted_results
        )

    except Exception as e:
        print(f"Internal Engine Error: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while synthesizing aerospace data.")

@app.get("/healthz")
def health_check():
    return {"status": "API ONLINE"}