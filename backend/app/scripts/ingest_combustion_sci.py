import os
import time
import pymupdf4llm

from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone

# ---------------------------------------
# 1. Environment configuration
# ---------------------------------------
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "nasa-combustion-rag"

BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)

DATA_DIR = os.path.join(BASE_DIR, "data", "raw")

# Set the target PDF for this specific ingestion
PDF_PATH = os.path.join(DATA_DIR, "combustion_sci.pdf") 

# ---------------------------------------
# 2. Initialize Pinecone
# ---------------------------------------
def initialize_pinecone():
    if not PINECONE_API_KEY:
        raise ValueError("PINECONE_API_KEY is missing!")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    if INDEX_NAME not in pc.list_indexes().names():
        raise ValueError(f"Pinecone index '{INDEX_NAME}' does not exist!")
    print("Connected to existing Pinecone index!")
    return PineconeVectorStore(index_name=INDEX_NAME, embedding=embeddings)

# ---------------------------------------
# 3. Initialize HuggingFace embeddings
# ---------------------------------------
print("Loading HuggingFace Embeddings...")
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu", "local_files_only": False}
)
print("HuggingFace Embeddings Loaded!")

# ---------------------------------------
# 4. Extract text from PDF
# ---------------------------------------
def extract_text(pdf_path):
    print(f"Reading document: {pdf_path}")
    try:
        md_text = pymupdf4llm.to_markdown(pdf_path, write_images=False)
        return md_text
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""

# ---------------------------------------
# 5. Split document & INJECT METADATA
# ---------------------------------------
def create_chunks(text):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        length_function=len
    )
 
    documents = splitter.create_documents(
        [text],
        metadatas=[{
            "section": "Combustion Science",  # Or whatever you name this tab in your React UI
            "type": "research_guide",
            "source": "A_Researchers_Guide_to_Combustion_Science.pdf", 
            "experiment": "N/A",               # It is a general guide, not a specific test like Saffire
            "fuel_state": "N/A",               # It covers all combustion principles generically
            "environments": ["Microgravity", "Spacecraft"], # Derived from the text's focus
             
        }]
    )
    
    return documents

# ---------------------------------------
# 6. Upload Vectors to Pinecone
# ---------------------------------------
def process_and_upload():
    if not os.path.exists(PDF_PATH):
        raise FileNotFoundError(f"PDF not found: {PDF_PATH}")

    extracted_text = extract_text(PDF_PATH)
    if not extracted_text.strip():
        print("No text extracted from PDF!")
        return

    documents = create_chunks(extracted_text)
    if not documents:
        print("No chunks generated!")
        return
    print(f"Generated {len(documents)} chunks.")

    vectorstore = initialize_pinecone()
    print(f"Uploading {len(documents)} chunks to Pinecone...")
    vectorstore.add_documents(documents)
    print("Upload complete!")

# ---------------------------------------
# 7. Main execution
# ---------------------------------------
if __name__ == "__main__":
    start_time = time.time()
    process_and_upload()
    print(f"Total processing time: {time.time() - start_time:.2f} seconds")