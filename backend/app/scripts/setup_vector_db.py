import os
import time
import pymupdf4llm
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
BASS_PDF = os.path.join(DATA_DIR, "BASS-II Summary Report.pdf")

# Create a dedicated folder for extracted images
IMAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "images"))
os.makedirs(IMAGE_DIR, exist_ok=True)

def extract_text_from_pdf(pdf_path):
    print(f"Reading {pdf_path} as Markdown and extracting images...")
    try:
        # Extract markdown and save images to the IMAGE_DIR
        md_text = pymupdf4llm.to_markdown(
            pdf_path, 
            write_images=True, 
            image_path=IMAGE_DIR
        )
        
        # Rewrite the local markdown image paths to point to your API's static route
        normalized_image_dir = IMAGE_DIR.replace("\\", "/")
        md_text = md_text.replace(f"{IMAGE_DIR}{os.sep}", "http://127.0.0.1:8000/static_images/")
        md_text = md_text.replace(f"{normalized_image_dir}/", "http://127.0.0.1:8000/static_images/")
        
        return md_text
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
        return ""

def process_and_upload():
    # 1. Initialize Pinecone client
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    # 2. Create a classic vector index programmatically
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
    
    # 5. Process BASS-II PDF
    if os.path.exists(BASS_PDF):
        bass_text = extract_text_from_pdf(BASS_PDF)
        if bass_text:
            documents.extend(text_splitter.create_documents(
                [bass_text], 
                metadatas=[{"experiment": "BASS-II", "fuel_state": "Solid", "source": "BASS-II Summary Report.pdf"}]
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