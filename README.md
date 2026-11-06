<div align="center">

# FlameGuard — NASA Space Apps Microgravity Fire Safety Super-Intelligence

**A retrieval-augmented generation (RAG) console for NASA microgravity combustion science.**
Ask a natural-language fire-safety question, get a grounded scientific synthesis, and verify every claim against the exact NASA PSI passages and extracted figures behind it.

[![NASA Space Apps Challenge](https://img.shields.io/badge/NASA%20Space%20Apps-Challenge-0B3D91?style=for-the-badge)](https://www.spaceappschallenge.org/)
[![Domain](https://img.shields.io/badge/Domain-Microgravity%20Fire%20Safety-E4572E?style=for-the-badge)](#why-flameguard)
[![AI](https://img.shields.io/badge/AI-Retrieval--Augmented%20Generation-6A4C93?style=for-the-badge)](#how-the-rag-pipeline-works)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python%203.11-009688?style=for-the-badge)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-3178C6?style=for-the-badge)](frontend/)
[![Vector DB](https://img.shields.io/badge/Vector%20DB-Pinecone-0B7285?style=for-the-badge)](https://www.pinecone.io/)
[![LLM](https://img.shields.io/badge/LLM-Groq%20%C2%B7%20GPT--OSS--20B-FF6B35?style=for-the-badge)](https://groq.com/)

[Features](#features) · [Architecture](#architecture) · [Quick start](#quick-start) · [API reference](#api-reference) · [Roadmap](#roadmap-and-production-readiness) · [FAQ](#frequently-asked-questions-faq)

</div>

---

## Overview

**FlameGuard** is a hackathon-ready **AI decision-support dashboard for spacecraft fire safety**, built for the **NASA Space Apps Challenge** and the **Physical Science Informatics (PSI)** microgravity combustion corpus. It combines a **FastAPI** retrieval service, **Pinecone vector search**, locally generated **HuggingFace MiniLM sentence embeddings**, and a **Groq-hosted large language model** with a mission-control **React + TypeScript** interface.

The project answers questions such as:

- How does **flame spread** behave over solid **PMMA acrylics** in **microgravity**?
- What **ignition limits** were observed for **liquid fuel pool fires** at **30% oxygen**?
- How does **low-velocity airflow** affect flame spread over **solid fabrics**?
- What **smoke transport** behaviour was reported in the **Saffire** experiments?

Every answer ships with the **raw PSI evidence**, **experiment metadata**, **fuel-state tags**, **source citations**, **extracted NASA figures**, and **retrieval telemetry**, so engineers can audit the science instead of trusting a black box.

> Keywords: NASA Space Apps, microgravity fire safety, spacecraft fire safety, combustion science, Physical Science Informatics (PSI), BASS-II, Saffire, FLEX, SAME, PMMA, flame spread rate, opposed-flow combustion, oxygen enrichment, lunar habitat, Artemis, spacesuit EVA, International Space Station, retrieval-augmented generation, RAG, vector database, Pinecone, semantic search, LangChain, FastAPI, React, TypeScript, Vite, Tailwind CSS, Groq, Llama 3, GPT-OSS, dashboard.

---

## Why FlameGuard

Fire behaves differently in space. Without buoyancy, flames spread through **forced airflow**, **oxygen concentration**, and **pressure** rather than the convection currents we rely on on Earth. A habitat leak, an oxygen-enriched atmosphere, or a **spacesuit EVA** environment can turn a small ignition source into a mission-critical event.

FlameGuard targets three fire-safety pillars defined by NASA research:

| Pillar | Scientific question | Relevant NASA science |
| --- | --- | --- |
| **Prevention** | What ignites, and how fast does it spread? | Flammability limits, opposed-flow flame spread, PMMA and fabric tests (BASS-II, Saffire) |
| **Detection** | How do smoke and particulates move in microgravity? | Smoke transport, particulate sensors (SAME, Saffire) |
| **Suppression** | How do we extinguish a fire in low gravity? | CO2 / helium / water-mist dilution (FLEX, FLEX-2) |

Reference environments referenced by the challenge:

| Environment | Oxygen | Pressure | Why it matters |
| --- | ---: | ---: | --- |
| Lunar habitat | 30–34% | 10.2 psi | Elevated O2 raises flammability risk |
| Spacesuit EVA | 100% | 4.3 psi | Pure oxygen, low pressure |
| ISS / space station | 21% | 14.7 psi | Baseline microgravity environment |
| Mars habitat | 28% | 8.2 psi | Low-pressure, oxygen-enriched habitat |

---

## Features

| Capability | What it does |
| --- | --- |
| **Natural-language query console** | Ask research questions in plain English with a `Ctrl/Cmd + Enter` shortcut, 600-character counter, and preset benchmark prompts. |
| **Grounded scientific synthesis** | A temperature `0.0` LLM answer constrained to retrieved PSI context; the prompt explicitly extracts oxygen %, pressure, and flame-spread speed. |
| **Evidence Ledger** | Every passage returned by retrieval, with **card view** (term highlighting), **table view**, client-side fuel filtering, and one-click **JSON export**. |
| **GFM Markdown rendering** | GitHub-flavored Markdown via `react-markdown` + `remark-gfm`: tables, code blocks, blockquotes, links, and figures. |
| **NASA figure pipeline** | Extracted PDF figures are served at `/static_images/*` and rendered with rounded borders, dark shadows, aspect-ratio preservation, and a graceful fallback for missing assets. |
| **Retrieval telemetry** | Live passage count, unique experiments, fuel-state split, experiment mix, and end-to-end latency. |
| **Run history** | The last **12** searches are stored in `localStorage` with restore and delete controls. |
| **Backend health polling** | Real-time `API ONLINE` / `API OFFLINE` status pill driven by a lightweight health check. |
| **Responsive mission-control UI** | Dark space theme built with Tailwind CSS 4, audited from narrow mobile widths up to desktop and ultrawide layouts. |
| **Zero-CORS development** | Vite proxies `/api`, `/healthz`, and `/static_images` to FastAPI, so no CORS configuration is needed locally. |

---

## Architecture

### System diagram

```mermaid
flowchart LR
  subgraph FE["Frontend - React 19 + TypeScript + Vite 8"]
    direction TB
    QC["Query Console"]
    AP["Answer Panel<br/>GFM markdown + NASA figures"]
    EL["Evidence Ledger<br/>cards / table / JSON export"]
    TP["Telemetry Sidebar"]
    HS["Run history<br/>localStorage - 12 runs"]
  end

  subgraph VP["Vite dev proxy"]
    PA["/api"]
    PS["/static_images"]
  end

  subgraph BE["FastAPI - Python 3.11"]
    EP["POST /api/search"]
    HC["GET / - health"]
    ST["StaticFiles<br/>/static_images"]
  end

  subgraph AI["Retrieval-augmented generation"]
    EM["all-MiniLM-L6-v2<br/>384-dim embeddings"]
    PC[("Pinecone index<br/>nasa-combustion-rag")]
    LL["Groq LLM<br/>temperature 0.0"]
  end

  QC -->|JSON payload| PA --> EP
  AP -->|figure URLs| PS --> ST
  EP --> EM --> PC
  PC -->|top-k PSI passages| EP
  EP --> LL --> EP
  EP -->|synthesized_answer + raw_results| AP
  EP --> EL
  EP --> TP
  QC --> HS
```

<details>
<summary>Plain-text architecture fallback</summary>

```text
Browser (React 19 + TypeScript)
        |
        |  POST /api/search  { query, fuel_filter, top_k }
        v
Vite dev proxy  --------------->  FastAPI (Python 3.11)
                                     |
                                     |  embed query
                                     v
                              all-MiniLM-L6-v2 (384-dim)
                                     |
                                     |  cosine similarity search
                                     v
                              Pinecone: nasa-combustion-rag
                                     |
                                     |  top-k passages + metadata
                                     v
                              Groq LLM (temperature 0.0)
                                     |
                                     |  synthesized_answer + raw_results
                                     v
Browser  <---- Markdown, tables, figures, telemetry, citations
```

</details>

### Request lifecycle

```mermaid
sequenceDiagram
  autonumber
  participant U as Engineer / Judge
  participant F as FlameGuard UI
  participant B as FastAPI
  participant M as MiniLM Embedder
  participant P as Pinecone
  participant G as Groq LLM

  U->>F: Ask a microgravity fire-safety question
  F->>B: POST /api/search {query, fuel_filter, top_k}
  B->>M: Embed the query
  M-->>B: 384-dimension vector
  B->>P: Similarity search (top_k, optional fuel filter)
  P-->>B: PSI passages + experiment metadata
  B->>G: Grounded prompt (context + query)
  G-->>B: Scientific synthesis (temperature 0.0)
  B-->>F: synthesized_answer + raw_results
  F-->>U: Answer, figures, citations, evidence, telemetry
```

---

## How the RAG pipeline works

1. **Ingestion** (`backend/app/scripts/setup_vector_db.py`): NASA PDFs are read with **PyMuPDF**, split with `RecursiveCharacterTextSplitter` (`chunk_size=1000`, `chunk_overlap=150`), embedded with **`all-MiniLM-L6-v2`** (384 dimensions), and upserted into the **Pinecone** index `nasa-combustion-rag` (cosine metric, serverless AWS `us-east-1`).
2. **Retrieval**: the query is embedded with the same MiniLM model, then top-k passages are fetched from Pinecone with optional metadata filtering on `fuel_state`.
3. **Grounded synthesis**: passages are formatted as `Experiment: ... / Data: ...` context and injected into a system prompt that casts the model as a **NASA Super Intelligence aerospace engineer specializing in microgravity fire safety**.
4. **Evidence-first response**: the API returns both `synthesized_answer` and the untouched `raw_results`, so the frontend can render citations, telemetry, and the complete evidence trail.
5. **Figure resolution**: `data/images/...` references are rewritten to `/static_images/...`; the backend serves them via **FastAPI `StaticFiles`**, and the frontend normalizes relative or malformed image URLs before rendering.

> The model is instructed to answer **"the data is not available in the current PSI parameters"** when retrieved context is insufficient. This refusal behaviour is intentional: scientific honesty over hallucination.

---

## Tech stack

| Layer | Technology | Version | Role |
| --- | --- | --- | --- |
| Frontend framework | **React** | 19.3 | Component UI |
| Language | **TypeScript** | ~7.0 | Type-safe client |
| Build tool | **Vite** | 8.3 | Dev server, proxy, production build |
| Styling | **Tailwind CSS** | 4.3 | Mission-control dark theme |
| Icons | **lucide-react** | 1.66 | Interface iconography |
| Markdown | **react-markdown + remark-gfm** | 10.1 / 4.0 | GFM tables, code, figures |
| Linting | **oxlint** | 1.89 | Fast static analysis |
| API | **FastAPI + Uvicorn** | 0.162 / 0.54 | Async HTTP service |
| Language | **Python** | 3.11 | Backend runtime |
| Orchestration | **LangChain** | 1.4 | Prompt + retrieval chain |
| Embeddings | **HuggingFace `all-MiniLM-L6-v2`** | via `langchain-huggingface` | Local 384-dim vectors |
| Vector database | **Pinecone** | 7.3 | Semantic retrieval |
| LLM | **Groq `openai/gpt-oss-20b`** | via `langchain-groq` | Temperature-0 synthesis |
| PDF extraction | **PyMuPDF** | 2.0 | Text and figure extraction |

---

## Repository layout

```text
NASA-Hackathon-flameguard/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, RAG chain, static figure mount
│   │   └── scripts/
│   │       ├── nasa_ingestion.py   # NASA OSDR metadata / dataset downloader
│   │       └── setup_vector_db.py  # PDF -> chunks -> embeddings -> Pinecone
│   ├── data/
│   │   ├── images/                 # Extracted figures served at /static_images
│   │   └── raw/                    # Source NASA PDFs (Saffire, Mir, ...)
│   ├── requirements.txt
│   └── .env                        # PINECONE_API_KEY / GROQ_API_KEY (never commit)
├── frontend/
│   ├── src/
│   │   ├── components/             # QueryConsole, AnswerPanel, EvidenceLedger, ...
│   │   ├── hooks/                  # useBackendStatus, useSearchHistory
│   │   ├── lib/                    # api client, markdown helpers, formatting
│   │   ├── App.tsx
│   │   └── index.css
│   ├── vite.config.ts              # /api, /healthz, /static_images proxy
│   └── package.json
├── docs/
│   └── demo-script.md
├── docker-compose.yml              # placeholder for containerized deployment
└── README.md
```

---

## Quick start

### Prerequisites

| Requirement | Recommended | Notes |
| --- | --- | --- |
| Python | 3.11 | 3.11.9 tested; use a virtual environment |
| Node.js | 20+ | Node 24 tested |
| npm | 10+ | Ships with Node |
| Pinecone account | Free tier | Index `nasa-combustion-rag` |
| Groq API key | Free tier | `GROQ_API_KEY` |

### 1. Clone the repository

```bash
git clone https://github.com/harshita713lab/NASA-Hackathon-flameguard.git
cd NASA-Hackathon-flameguard
```

### 2. Backend setup

```bash
cd backend

# Windows
py -3.11 -m venv venv
venv\Scripts\activate

# macOS / Linux
python3.11 -m venv venv
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```dotenv
PINECONE_API_KEY=your_pinecone_api_key
GROQ_API_KEY=your_groq_api_key
```

Start the API:

```bash
# Windows PowerShell: prevent Unicode console crashes on model output
$env:PYTHONIOENCODING="utf-8"; $env:PYTHONUTF8="1"
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```bash
# macOS / Linux
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. API docs are at **http://127.0.0.1:8000/docs**.

### 4. Build and quality checks

```bash
cd frontend
npm run lint      # oxlint, 0 warnings / 0 errors expected
npm run build     # tsc -b && vite build
npm run preview   # production preview on port 4173
```

---

## Environment variables

| Variable | Location | Required | Purpose |
| --- | --- | --- | --- |
| `PINECONE_API_KEY` | `backend/.env` | Yes | Authenticate Pinecone vector operations |
| `GROQ_API_KEY` | `backend/.env` | Yes | Authenticate Groq LLM inference |
| `BACKEND_URL` | frontend shell | No | Vite proxy target (default `http://127.0.0.1:8000`) |
| `VITE_API_URL` | frontend build | No | Absolute backend base URL for split deployment |

> Never commit `.env` files or API keys. The repository `.gitignore` already excludes `venv`, `.env`, and `__pycache__`.

---

## API reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Health payload: `{"status": "FlameGuard SI API is running"}` |
| `POST` | `/api/search` | Retrieve PSI passages and synthesize a grounded answer |
| `GET` | `/static_images/{filename}` | Serve extracted NASA figures |
| `GET` | `/docs` | Interactive OpenAPI documentation |

### `POST /api/search`

Request body:

```json
{
  "query": "How does flame spread behave over solid PMMA acrylics in microgravity?",
  "fuel_filter": "Solid",
  "top_k": 4
}
```

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `query` | string | Yes | - | Natural-language research question |
| `fuel_filter` | string | No | none | `Solid`, `Liquid`, or `Mixed` |
| `top_k` | integer | No | `4` | Number of passages to retrieve |

Response body:

```json
{
  "synthesized_answer": "Markdown answer with citations and figure references...",
  "raw_results": [
    {
      "text": "Raw PSI passage exactly as retrieved...",
      "experiment": "BASS-II",
      "fuel_state": "Solid",
      "source": "BASS-II Summary Report.pdf"
    }
  ]
}
```

| Field | Type | Description |
| --- | --- | --- |
| `synthesized_answer` | string | Markdown synthesis, may include GFM tables and `![figure](...)` images |
| `raw_results[]` | array | Unmodified evidence passages with retrieval metadata |
| `raw_results[].text` | string | Passage content, including image references |
| `raw_results[].experiment` | string | Experiment identifier |
| `raw_results[].fuel_state` | string | `Solid`, `Liquid`, `Mixed`, or `Unknown` |
| `raw_results[].source` | string | NASA source document |

### Frontend proxy contract

| Frontend request | Proxied to |
| --- | --- |
| `/api/search` | `http://127.0.0.1:8000/api/search` |
| `/healthz` | `http://127.0.0.1:8000/` |
| `/static_images/*` | `http://127.0.0.1:8000/static_images/*` |

---

## NASA data and investigations

| Investigation | Focus | Repository status |
| --- | --- | --- |
| **BASS / BASS-II** | Solid-fuel flammability, PMMA slab and rod geometries, opposed and concurrent flame spread | Indexed passages and extracted figures |
| **Saffire I–VI** | Large-scale spacecraft fire growth, fabric and smoke transport | Source PDF available in `backend/data/raw` |
| **Mir space station** | Long-duration microgravity combustion records | Source PDF available in `backend/data/raw` |
| **FLEX / FLEX-2** | Droplet combustion and suppression with CO2 / helium | Planned ingestion |
| **SAME / SAME-R** | Smoke aerosol measurement and detection | Planned ingestion |
| **NASA OSDR / PSI** | Public physical-science metadata | Ingestion helper in `backend/app/scripts/nasa_ingestion.py` |

> The vector index currently covers a subset of the corpus. Queries outside the indexed material return the model's explicit "data not available" response rather than fabricated numbers.

---

## Figure rendering

NASA figures are extracted from source PDFs into `backend/data/images/` using the naming convention `{document}.pdf-{page}-{index}.png`. The FastAPI app mounts this directory at **`/static_images`**, and the frontend normalizes:

- repo-relative paths such as `data/images/...` to `/static_images/...`;
- malformed hosts such as `https://static_images/...`;
- URLs containing spaces, via safe percent-encoding;
- deployment hosts, replacing `http://127.0.0.1:8000` with `VITE_API_URL` when configured.

Verified rendering sample (desktop and narrow viewport):

| Figure | Native size | Rendered size | Result |
| --- | --- | --- | --- |
| Figure 1.2 — opposed-flow flame geometries | 991 × 750 | 459 × 348 | Renders, aspect ratio preserved |
| Figure 3.1 — candle wick panorama | 2591 × 510 | 459 × 92 | Renders, no overflow |
| Figure 5.8 — flame spread vs opposed-flow velocity | 2111 × 1543 | 459 × 336 | Renders, chart labels readable |
| Figure 7.3 — flame development | 2601 × 1220 | 459 × 216 | Renders |
| Figure 7.4 — flame tracking | 1779 × 1407 | 459 × 364 | Renders |
| Figure D.1 — predicted temperature profile | 2010 × 1273 | 459 × 291 | Renders |

Missing assets degrade gracefully to a labelled **"Figure unavailable"** placeholder instead of a broken image icon.

---

## Quality and verification

| Check | Command | Status |
| --- | --- | --- |
| Frontend lint | `npm run lint` | 0 warnings, 0 errors |
| TypeScript + production build | `npm run build` | Passes (`tsc -b && vite build`) |
| Backend syntax | `python -m ast` / import check | Passes |
| API smoke test | `POST /api/search` | HTTP 200 with grounded answer |
| Static figures | `GET /static_images/<figure>.png` | HTTP 200 for extracted assets |
| Responsive layout | Narrow viewport audit | No horizontal page overflow |

---

## Roadmap and production readiness

```mermaid
flowchart LR
  P1["Phase 1<br/>Scientific data seeding"] --> P2["Phase 2<br/>Mission filters + risk slider"]
  P2 --> P3["Phase 3<br/>Security + offline fallback"]
  P3 --> P4["Phase 4<br/>Demo polish + deployment"]
```

| Area | Current state | Next step |
| --- | --- | --- |
| Scientific corpus coverage | Partial: BASS-II figures and passages verified | Ingest Saffire, FLEX, SAME, and lunar-habitat data at scale |
| Mission environment filters | Fuel-state filter only | Add Lunar Base (30% O2), Spacesuit (100% O2), ISS, and Mars toggles |
| Fire-safety pillar tagging | Not yet exposed | Tag passages as Prevention, Detection, or Suppression |
| Interactive risk modelling | Static query input | Add an oxygen-versus-pressure Relative Flammability Index slider |
| Rate limiting | Not implemented | Add `slowapi` (for example 20 requests/minute per client) |
| Prompt-injection defence | Not implemented | Add query length limits and pattern validation |
| Error handling | Returns internal detail | Log server-side, return sanitized client messages |
| Offline demo fallback | Not implemented | Add a local JSON semantic fallback if Pinecone or Groq is unavailable |
| Asset coverage | 8 extracted figures | Ship the complete generated `data/images` set |
| Deployment packaging | Docker Compose placeholder | Add production images, CORS policy, and reverse proxy |

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `API OFFLINE` pill | FastAPI not running on port 8000 | Start Uvicorn, then use "Re-check connection" |
| `'charmap' codec can't encode character` on Windows | LLM output contains Unicode (for example non-breaking hyphens) | Set `PYTHONIOENCODING=utf-8` and `PYTHONUTF8=1` before launching Uvicorn |
| Backend exits at startup | Missing `PINECONE_API_KEY` or `GROQ_API_KEY` | Create `backend/.env` from the variables table |
| Figures show "Figure unavailable" | Asset missing from `backend/data/images` | Extract the figure from the source PDF or copy the generated image set |
| Images 404 after deployment | Backend rewrites image URLs to `127.0.0.1:8000` | Set `VITE_API_URL` to the public backend and serve `/static_images` from it |
| `pip install` fails on `requirements.txt` | File saved as UTF-16 | Re-save as UTF-8 and retry |
| CORS error in a split deployment | Dev proxy bypasses CORS | Configure FastAPI `CORSMiddleware` with the frontend origin |

---

## Frequently asked questions (FAQ)

**What is FlameGuard?**
FlameGuard is a NASA Space Apps hackathon project: a retrieval-augmented fire-safety console that answers microgravity combustion questions using NASA PSI research and shows the source evidence behind every answer.

**How does FlameGuard use RAG?**
It embeds the query with `all-MiniLM-L6-v2`, retrieves top-k passages from a Pinecone index, and passes them to a Groq-hosted LLM at temperature 0.0, returning both the synthesis and the raw passages.

**Which NASA missions and experiments are supported?**
BASS/BASS-II is indexed today; Saffire and Mir source documents are included for ingestion, with FLEX and SAME planned.

**Why is microgravity fire safety important?**
Without buoyancy-driven convection, flames behave differently in spacecraft, lunar habitats, and spacesuits. Oxygen-enriched atmospheres and low pressure change ignition, spread, detection, and suppression behaviour.

**Does FlameGuard work offline?**
Not yet. It requires Pinecone and Groq connectivity; a local semantic fallback is on the roadmap.

**Is it mobile friendly?**
Yes. The interface is responsive from narrow mobile widths through desktop and ultrawide displays.

**Can I deploy it?**
Yes, but set `VITE_API_URL`, configure CORS, and serve `/static_images` from the deployed backend. See the deployment notes in the roadmap.

**Does FlameGuard replace an aerospace safety engineer?**
No. It is decision support. Every synthesis is AI-generated and must be verified against the cited PSI passages.

---

## SEO and discoverability

This README is structured for **GitHub search**, **Google indexing**, and **NASA Space Apps judging visibility**. To maximize reach:

1. Set a precise repository description (About panel):

   > FlameGuard: NASA Space Apps RAG dashboard for microgravity fire safety — Pinecone + FastAPI + React, grounded in PSI combustion science.

2. Add repository topics (GitHub allows up to 20):

```bash
gh repo edit harshita713lab/NASA-Hackathon-flameguard \
  --add-topic nasa-space-apps \
  --add-topic microgravity \
  --add-topic fire-safety \
  --add-topic combustion \
  --add-topic retrieval-augmented-generation \
  --add-topic rag \
  --add-topic pinecone \
  --add-topic fastapi \
  --add-topic react \
  --add-topic typescript \
  --add-topic vite \
  --add-topic tailwindcss \
  --add-topic groq \
  --add-topic llm \
  --add-topic langchain \
  --add-topic python \
  --add-topic spacecraft \
  --add-topic artemis \
  --add-topic physical-science-informatics \
  --add-topic ai
```

3. Upload a **social preview image** and a short **demo GIF** (query to grounded answer), both with descriptive alt text.
4. Publish **Releases** with semantic versions; GitHub search favors active, documented repositories.
5. Link the project from LinkedIn, dev.to, and the NASA Space Apps project page to build backlinks.
6. Keep headings keyword-specific (as done above) and add a `LICENSE` file so the repository is reusable.

> Search ranking depends on relevance, activity, stars, and backlinks. These steps improve discoverability; no repository can guarantee a first-place ranking.

---

## Keyword index

**Domain:** microgravity fire safety, spacecraft fire safety, combustion science, flammability limits, flame spread, flame spread rate, opposed-flow flame spread, concurrent flow, oxygen enrichment, oxygen concentration, low-pressure combustion, smoke transport, fire detection, fire suppression, water mist, CO2 suppression, lunar habitat, Artemis, spacesuit EVA, International Space Station, Mars habitat, Physical Science Informatics, PSI, NASA OSDR, NASA NTRS.

**Missions and experiments:** BASS, BASS-II, Saffire, Saffire I–VI, FLEX, FLEX-2, SAME, SAME-R, PMMA, acrylic, candle wick, fabric flammability, droplet combustion, CIR, MDCA, MSG.

**Engineering:** retrieval-augmented generation, RAG, vector search, semantic search, embeddings, all-MiniLM-L6-v2, sentence transformers, Pinecone, LangChain, LangGraph, FastAPI, Uvicorn, Pydantic, Python, HuggingFace, Groq, Llama 3, GPT-OSS, React, TypeScript, Vite, Tailwind CSS, react-markdown, remark-gfm, REST API, dashboard, telemetry, citations, evidence ledger, open science, AI decision support.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Keep pull requests focused and describe the scientific or engineering rationale.
3. Run `npm run lint` and `npm run build` before opening a PR.
4. Never commit `.env`, API keys, model weights, or large PDFs.

---

## License

No license file is currently included. Add a `LICENSE` (for example MIT) before redistributing or reusing the code outside the NASA Space Apps Challenge context.

---

## Acknowledgements

- **NASA Space Apps Challenge** for the problem statement and open-science mission.
- **NASA Physical Science Informatics (PSI)**, **OSDR**, and **NTRS** for public microgravity combustion research and technical reports.
- **BASS-II**, **Saffire**, **FLEX**, and **SAME** investigators whose published results ground this project.
- Open-source maintainers of FastAPI, React, Vite, Tailwind CSS, LangChain, Pinecone, HuggingFace, and Groq tooling.

> FlameGuard is an independent hackathon project and is not affiliated with or endorsed by NASA.

---

<div align="center">

**If FlameGuard helped your research or demo, consider starring the repository.**

Built for the **NASA Space Apps Challenge** — microgravity fire safety, grounded in evidence.

</div>
