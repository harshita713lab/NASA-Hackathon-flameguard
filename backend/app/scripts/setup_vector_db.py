import os
import time
import pymupdf
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

# Load environment variables
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "nasa-combustion-rag"

# Updated path to target backend/data/raw
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")
SAFFIRE_PDF = os.path.join(DATA_DIR, "saffire_report.pdf")
MIR_PDF = os.path.join(DATA_DIR, "mir_space_station.pdf")

def extract_text_from_pdf(pdf_path):
    print(f"Reading {pdf_path}...")
    text = ""
    try:
        doc = pymupdf.open(pdf_path)
        for page in doc:
            text += page.get_text()
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
    return text

def process_and_upload():
    # 1. Initialize Pinecone client
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    # 2. FIX: Create a classic vector index programmatically to bypass the UI schema
    if INDEX_NAME not in pc.list_indexes().names():
        print(f"Creating a classic vector index: '{INDEX_NAME}' via API...")
        pc.create_index(
            name=INDEX_NAME,
            dimension=384,
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )
        # Wait for the index to boot up
        while not pc.describe_index(INDEX_NAME).status['ready']:
            time.sleep(1)
        print("Index is ready!")
    
    # 3. Load Local HuggingFace Embedding Model
    print("Loading HuggingFace Inference...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # 4. Configure the text chunker
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        length_function=len
    )
    
    documents = []
    
    # 5. Process PDFs
    if os.path.exists(SAFFIRE_PDF):
        saffire_text = extract_text_from_pdf(SAFFIRE_PDF)
        documents.extend(text_splitter.create_documents(
            [saffire_text], 
            metadatas=[{"experiment": "Saffire", "fuel_state": "Solid", "source": "saffire_report.pdf"}]
        ))
    
    if os.path.exists(MIR_PDF):
        mir_text = extract_text_from_pdf(MIR_PDF)
        documents.extend(text_splitter.create_documents(
            [mir_text], 
            metadatas=[{"experiment": "Mir", "fuel_state": "Mixed", "source": "mir_space_station.pdf"}]
        ))
        
    if not documents:
        print("No documents found.")
        return

    # 6. Upsert to Pinecone
    print(f"Pushing {len(documents)} vectorized chunks to Pinecone...")
    PineconeVectorStore.from_documents(
        documents,
        embeddings,
        index_name=INDEX_NAME
    )
    print("Upload complete! Standard vector database is ready.")

if __name__ == "__main__":
    process_and_upload()