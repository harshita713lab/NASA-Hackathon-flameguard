import json
import logging
import re
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger("FlameGuardAPI")

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


def load_curated_documents(path: Optional[Path] = None) -> List[dict]:
    target = path or CURATED_PATH
    try:
        with target.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except FileNotFoundError:
        logger.warning("Curated PSI dataset not found at %s", target)
        return []
    except (OSError, json.JSONDecodeError) as exc:
        logger.error("Could not load curated PSI dataset: %s", exc)
        return []

    documents = payload.get("documents", [])
    logger.info("Loaded %d curated NASA PSI records", len(documents))
    return documents


CURATED_DOCUMENTS = load_curated_documents()


def normalize_fuel(value: Optional[str]) -> Optional[str]:
    if not value or value.strip().lower() in ("", "all", "any", "none"):
        return None
    return value.strip()


def normalize_mission(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = value.strip()
    if cleaned.lower() in ("", "all", "any", "none"):
        return None
    return MISSION_ALIASES.get(cleaned.lower(), cleaned)


def normalize_pillar(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = value.strip()
    if cleaned.lower() in ("", "all", "any", "none"):
        return None
    for pillar in PILLAR_NAMES:
        if cleaned.lower() == pillar.lower():
            return pillar
    return cleaned


def tokenize(text: str) -> List[str]:
    return TOKEN_RE.findall((text or "").lower())


def query_tokens(query: str) -> set:
    expanded = set()
    for token in tokenize(query):
        if token in STOPWORDS or len(token) < 2:
            continue
        expanded.add(token)
        expanded.update(TOKEN_ALIASES.get(token, ()))
    return expanded


def matches_filters(
    doc: dict,
    fuel_filter: Optional[str],
    mission: Optional[str],
    pillar: Optional[str],
) -> bool:
    if fuel_filter and doc.get("fuel_state", "").lower() != fuel_filter.lower():
        return False
    if mission:
        environments = [str(env).lower() for env in doc.get("environments", [])]
        if mission.lower() not in environments:
            return False
    if pillar and doc.get("pillar", "").lower() != pillar.lower():
        return False
    return True


def _document_score(doc: dict, tokens: set) -> int:
    keyword_tokens = set(tokenize(" ".join(doc.get("keywords", []))))
    label_tokens = set(
        tokenize(
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
    text_tokens = set(tokenize(doc.get("text", "")))

    score = 0
    for token in tokens:
        if token in keyword_tokens:
            score += 4
        elif token in label_tokens:
            score += 2
        elif token in text_tokens:
            score += 1
    return score


def find_curated_hits(
    documents: List[dict],
    query: str,
    fuel_filter: Optional[str] = None,
    mission: Optional[str] = None,
    pillar: Optional[str] = None,
    top_k: int = 4,
) -> List[dict]:
    tokens = query_tokens(query)
    if not tokens:
        return []

    hits = []
    for doc in documents:
        if not matches_filters(doc, fuel_filter, mission, pillar):
            continue
        score = _document_score(doc, tokens)
        if score > 0:
            hits.append((score, str(doc.get("id", "")), doc))

    hits.sort(key=lambda item: (-item[0], item[1]))
    limit = max(top_k * 3, 8)
    return [doc for _, _, doc in hits[:limit]]


def result_key(text: str) -> str:
    return " ".join((text or "").lower().split())[:120]
