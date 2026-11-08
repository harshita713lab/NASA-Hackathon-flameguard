"""Push the curated NASA PSI records into the Pinecone index.

The API already serves these records from the local JSON file, so this script is
optional. Run it with --apply after the index exists and the API key is set:

    python backend/app/scripts/seed_curated_psi.py --apply

Without --apply it prints what would be uploaded and exits (dry run).
"""

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone

load_dotenv()

INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "nasa-combustion-rag")
CURATED_PATH = Path(__file__).resolve().parents[2] / "data" / "curated" / "psi_curated_data.json"


def load_records(path: Path) -> list:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return payload.get("documents", [])


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed curated NASA PSI records into Pinecone.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write to Pinecone. Without this flag the script only prints a dry run.",
    )
    args = parser.parse_args()

    records = load_records(CURATED_PATH)
    if not records:
        print(f"No curated records found at {CURATED_PATH}")
        return 1

    print(f"Loaded {len(records)} curated records from {CURATED_PATH}")

    if not args.apply:
        for record in records:
            print(f"  [dry-run] {record.get('id')} · {record.get('experiment')}")
        print("\nNothing was uploaded. Re-run with --apply to seed Pinecone.")
        return 0

    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        print("PINECONE_API_KEY is not set.", file=sys.stderr)
        return 1

    client = Pinecone(api_key=api_key)
    if INDEX_NAME not in client.list_indexes().names():
        print(
            f"Index '{INDEX_NAME}' does not exist. Create it first (dimension 384, cosine).",
            file=sys.stderr,
        )
        return 1

    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)

    texts = []
    metadatas = []
    ids = []
    for record in records:
        texts.append(record.get("text", ""))
        metadatas.append(
            {
                "experiment": record.get("experiment", "Unknown"),
                "fuel_state": record.get("fuel_state", "Unknown"),
                "pillar": record.get("pillar"),
                "environments": record.get("environments", []),
                "source": record.get("source", "Unknown"),
                "citation": record.get("citation"),
                "curated_id": record.get("id"),
                "curated": True,
            }
        )
        ids.append(f"curated::{record.get('id')}")

    vectorstore.add_texts(texts=texts, metadatas=metadatas, ids=ids)
    print(f"Uploaded {len(ids)} curated records to '{INDEX_NAME}'.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
