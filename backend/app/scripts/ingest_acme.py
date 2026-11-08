
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

ACME_PDF = os.path.join(DATA_DIR, "acme.pdf")


# ---------------------------------------
# 2. Initialize HuggingFace embeddings
# ---------------------------------------

print("Loading HuggingFace Embeddings...")

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={
        "device": "cpu",
        "local_files_only": True
    }
)

print("HuggingFace Embeddings Loaded!")


# ---------------------------------------
# 3. Initialize Pinecone
# ---------------------------------------

def initialize_pinecone():

    if not PINECONE_API_KEY:
        raise ValueError("PINECONE_API_KEY is missing!")

    pc = Pinecone(api_key=PINECONE_API_KEY)

    if INDEX_NAME not in pc.list_indexes().names():
        raise ValueError(
            f"Pinecone index '{INDEX_NAME}' does not exist!"
        )

    print("Connected to existing Pinecone index!")

    return PineconeVectorStore(
        index_name=INDEX_NAME,
        embedding=embeddings
    )


# ---------------------------------------
# 4. Extract ACME PDF text
# ---------------------------------------

def extract_acme_text(pdf_path):

    print(f"Reading ACME document: {pdf_path}")

    try:
        # ACME document has no image extraction requirement
        md_text = pymupdf4llm.to_markdown(
            pdf_path,
            write_images=False
        )

        return md_text

    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""


# ---------------------------------------
# 5. Split document into chunks
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
            "experiment": "ACME",
            "fuel_state": "Gas",
            "source": os.path.basename(ACME_PDF)
        }]
    )

    return documents


# ---------------------------------------
# 6. Upload vectors to Pinecone
# ---------------------------------------

def process_and_upload():

    if not os.path.exists(ACME_PDF):
        raise FileNotFoundError(
            f"ACME PDF not found: {ACME_PDF}"
        )

    # Extract PDF text
    acme_text = extract_acme_text(ACME_PDF)

    if not acme_text.strip():
        print("No text extracted from ACME PDF!")
        return

    print(f"Extracted text: {len(acme_text)} characters")

    # Generate chunks
    documents = create_chunks(acme_text)

    if not documents:
        print("No chunks generated!")
        return

    print(f"Generated {len(documents)} chunks.")

    # Connect to existing Pinecone index
    vectorstore = initialize_pinecone()

    # Upload ACME vectors
    print("Uploading ACME vectors to Pinecone...")

    vectorstore.add_documents(documents)

    print("ACME upload complete!")
    print(f"Total ACME chunks uploaded: {len(documents)}")


# ---------------------------------------
# 7. Main execution
# ---------------------------------------

if __name__ == "__main__":

    start_time = time.time()

    process_and_upload()

    print(
        f"Total processing time: "
        f"{time.time() - start_time:.2f} seconds"
    )
