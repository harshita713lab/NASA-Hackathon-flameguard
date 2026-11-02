# FlameGuard — Super Intelligence Frontend

Mission-control UI for NASA Space Apps **FlameGuard**. Search the NASA PSI microgravity
combustion corpus through the FastAPI retrieval API, read the Llama 3 synthesis, and verify every
claim against the raw passages it was grounded in.

Built with React 19, TypeScript, Vite 8 and Tailwind CSS 4.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

During development Vite proxies API traffic to the FastAPI backend:

| Frontend request | Proxied to |
| --- | --- |
| `/api/search` | `http://127.0.0.1:8000/api/search` |
| `/healthz` | `http://127.0.0.1:8000/` (health check) |

The proxy means the backend needs **no CORS configuration**. To target a different backend:

```bash
BACKEND_URL=http://127.0.0.1:8001 npm run dev
```

Start the backend separately:

```bash
cd backend
venv\Scripts\activate          # Windows (created with Python 3.11)
# source venv/bin/activate     # macOS / Linux
uvicorn app.main:app --reload
```

If the backend environment does not exist yet:

```bash
cd backend
py -3.11 -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
```

The backend needs a `.env` with `PINECONE_API_KEY` and `GROQ_API_KEY`. Never commit it.

## API used

`POST /api/search`

```json
{ "query": "...", "fuel_filter": "Solid", "top_k": 4 }
```

The UI renders `synthesized_answer` in the synthesis panel and uses `raw_results` for the
telemetry summary and evidence ledger (card/table views, client-side fuel filtering, JSON export).

## Production build

```bash
npm run build
npm run preview
```

`npm run preview` keeps the same proxy. When hosting `dist/` separately, either set
`VITE_API_URL=https://api.example.com` (the backend must then allow the frontend origin via CORS)
or reverse-proxy `/api` to the backend.
