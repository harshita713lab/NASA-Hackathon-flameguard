import os
import requests
from pathlib import Path

# Define the local storage directory for the downloaded files
DATA_DIR = Path(os.path.dirname(__file__)).parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# NASA OSDR API endpoint for querying datasets
# Note: The exact endpoint and query structure may vary based on OSDR's current schema
OSDR_SEARCH_API = "https://osdr.nasa.gov/geode-py/ws/api/web/search"

def fetch_combustion_metadata():
    """Queries the NASA OSDR API for combustion science datasets."""
    print("Querying NASA OSDR for Combustion Science data...")
    
    # Query parameters targeting physical sciences and combustion
    payload = {
        "term": "combustion",
        "type": "cgene,study",
        "prm": "100" # Limit results for testing
    }
    
    response = requests.get(OSDR_SEARCH_API, params=payload)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to fetch metadata. Status code: {response.status_code}")
        return None

def download_file(url, filename, experiment_name):
    """Downloads a file and saves it within an experiment-specific folder."""
    experiment_dir = DATA_DIR / experiment_name
    experiment_dir.mkdir(exist_ok=True)
    
    file_path = experiment_dir / filename
    
    # Skip if file already exists
    if file_path.exists():
        print(f"File {filename} already exists. Skipping download.")
        return file_path
        
    print(f"Downloading {filename}...")
    response = requests.get(url, stream=True)
    
    if response.status_code == 200:
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Successfully saved to {file_path}")
        return file_path
    else:
        print(f"Failed to download {filename}. Status code: {response.status_code}")
        return None

def run_ingestion_pipeline():
    metadata = fetch_combustion_metadata()
    
    if not metadata or 'hits' not in metadata:
        print("No valid data found.")
        return
        
    hits = metadata['hits']['hits']
    print(f"Found {len(hits)} relevant datasets. Initiating download...")
    
    for hit in hits:
        source = hit.get('_source', {})
        
        # Extract metadata for Pinecone tagging later
        experiment_id = source.get('Study_Identifier', 'Unknown_ID')
        title = source.get('Study_Title', 'Unknown Title')
        
        print(f"\nProcessing Experiment: {experiment_id} - {title}")
        
        # The exact structure of file URLs depends on the OSDR JSON schema. 
        # This is a representative loop for downloading associated PDFs/CSVs.
        files = source.get('files', []) 
        
        for file_info in files:
            file_url = file_info.get('url')
            file_name = file_info.get('file_name')
            
            if file_url and file_name:
                # Filter to only download PDFs and tabular data
                if file_name.endswith('.pdf') or file_name.endswith('.csv'):
                    download_file(file_url, file_name, experiment_id)

if __name__ == "__main__":
    run_ingestion_pipeline()