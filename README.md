# BioFiles 🌿

**Explore biodiversity anywhere. Open a species file. Ask questions grounded in real sources.**

**Live app:** https://biofiles.vercel.app  
**API:** https://biofiles-api.onrender.com  
**API documentation:** https://biofiles-api.onrender.com/docs

BioFiles is an interactive biodiversity explorer that turns a place into a collection of discoverable species dossiers. Search for a location, browse species observed there, open multiple field-guide windows, and ask an AI assistant questions about an individual species. Answers are generated through a species-scoped retrieval-augmented generation (RAG) pipeline using Wikipedia as the knowledge source, with source citations rather than unsupported free-form answers.

> **Deployment note (November 2026):** The frontend and backend have been deployed. A production issue affecting the encyclopedia summary endpoint (`GET /api/species/{id}/info`) was under investigation at the time of writing; a diagnostic logging update was deployed, but a successful production retest has not yet been confirmed. Species search, indexing, and AI question answering returned successful responses in the observed Render logs.

## What you can do

- **Explore by location.** Search real places through iNaturalist and browse their recorded biodiversity.
- **Filter by organism group.** Narrow the species gallery using available taxonomic categories.
- **Open a species dossier.** View its common and scientific names, imagery, and Wikipedia-derived encyclopedia introduction when available.
- **Use a retro desktop interface.** Open, drag, resize, minimize, restore, and close species windows. Up to five dossiers can be open simultaneously.
- **Ask BioFiles AI.** Prepare a species-specific knowledge base on demand, then ask questions about habitat, behavior, adaptations, and other topics covered by the retrieved article.
- **Inspect citations.** Answers refer to the Wikipedia sections used to support them.
- **Keep questions separate.** Each dossier has its own chat interface; retrieval is restricted to that species.

## How it works

```text
Browser / Next.js (TypeScript, Tailwind, shadcn/ui)
  │
  ├── Location search ───────────────┐
  ├── Species gallery / filters ─────┤
  ├── Draggable species dossiers ────┤
  └── Per-dossier AI chat ───────────┤
                                     ▼
                             FastAPI backend
                              │         │
                Discovery / metadata       Species knowledge / RAG
                     │                     │
                iNaturalist API      iNaturalist taxon → Wikipedia article
                                           │
                                    Section-aware extraction
                                           │
                                  Paragraph-based chunking
                                    + sentence overlap
                                           │
                              Gemini embedding-001 (768d)
                                           │
                                 Supabase PostgreSQL
                                     + pgvector
                                           │
                            Species-filtered similarity search
                                      (top 5)
                                           │
                              Gemini Flash Lite generation
                                           │
                              Grounded answer + citations
```

**Separation of concerns:** iNaturalist supplies location/species discovery and taxon metadata; Wikipedia supplies encyclopedia text; Gemini supplies embeddings and answer generation; Supabase stores reusable per-species vector indexes. The frontend manages windows and chat display, while FastAPI orchestrates retrieval and AI requests.

## Technology stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | Next.js App Router, React, TypeScript | Interactive explorer and dossier windows |
| UI | Tailwind CSS, shadcn/ui | Responsive components and styling |
| Backend | Python 3.12, FastAPI, Pydantic | Typed HTTP API and orchestration |
| HTTP clients | HTTPX | Async calls to external APIs |
| Species/location data | iNaturalist API | Places, taxa, species and observations |
| Knowledge source | Wikipedia API | Introductory and full article content |
| Parsing | Beautiful Soup | Structured article/heading extraction |
| Embeddings | Google `gemini-embedding-001` | 768-dimensional document/query vectors |
| Generation | Gemini Flash Lite (`gemini-3.5-flash-lite` in deployed configuration) | Grounded answers |
| Database | Supabase PostgreSQL + pgvector | Persistent species metadata and chunk embeddings |
| Rate limiting | SlowAPI | Protect indexing and question endpoints |
| Deployment | Vercel + Render + Supabase | Frontend, API, and database hosting |

## RAG architecture

BioFiles uses **on-demand, persistent, species-scoped indexing**, rather than embedding every species in advance.

1. **Select a species.** The frontend already knows its iNaturalist taxon ID.
2. **Prepare knowledge.** When the user activates AI for that species, `POST /api/species/{taxon_id}/index` checks whether a fresh index exists.
3. **Fetch authoritative context.** The backend retrieves the taxon's Wikipedia URL from iNaturalist, resolves redirects, and fetches the article.
4. **Preserve article structure.** Beautiful Soup extracts headings, paragraphs, and list items; navigation and reference sections are excluded. Chunks retain section titles and hierarchical paths.
5. **Chunk deliberately.** Paragraph-oriented chunks target roughly 200–300 words with a one-sentence overlap, helping retain context without mixing unrelated sections.
6. **Embed and store.** `gemini-embedding-001` creates 768-dimensional vectors. The chunks, source URLs, section metadata, and vectors are persisted in PostgreSQL/pgvector.
7. **Avoid duplicate work.** A PostgreSQL advisory lock coordinates indexing attempts for the same species across requests. The UI displays a message rather than launching a second indexing job.
8. **Reuse the index.** Indexed content is cached and refreshed after approximately 30 days rather than regenerated for every question.
9. **Retrieve only relevant chunks.** A question is embedded as a retrieval query; similarity search filters by `species_id` and selects the top five chunks.
10. **Generate a grounded response.** Gemini receives the retrieved context and returns a structured answer, including whether the evidence supports an answer and the relevant source citations.

**Why species-scoped?** A question in one dossier should never accidentally retrieve text about a different animal or plant. Species filtering is applied in retrieval, not merely requested in the model prompt.

**Why stateless chat?** Each window retains its visible conversation locally in React, but backend requests need only the current species ID and question. This keeps the MVP straightforward and avoids storing personal chat histories.

## Data model

The main database tables are:

- **`species`** — `species_id` (iNaturalist taxon ID), common/scientific names, indexing status (`pending`, `indexing`, `ready`, `failed`), and timestamps.
- **`species_chunks`** — parent `species_id`, chunk order, text, 768-dimensional embedding, source name/URL, section title/path, and creation timestamp.

The foreign key connects chunks to their species; indexing can be refreshed without confusing the source documents of different taxa.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Welcome response |
| `GET` | `/health` | Health check |
| `GET` | `/api/places/search?q=Goa` | Search locations |
| `GET` | `/api/species/categories?place_id=10791` | Available organism groups |
| `GET` | `/api/species?place_id=10791&page=1&per_page=20` | Paginated species discovery |
| `GET` | `/api/species/{taxon_id}/info` | Species encyclopedia introduction |
| `POST` | `/api/species/{taxon_id}/index` | Prepare or reuse species RAG index |
| `POST` | `/api/species/{taxon_id}/ask` | Answer a species question using retrieved context |

Example question payload:

```json
{
  "question": "What adaptations help this species survive?"
}
```

The `/ask` response includes the answer, an `answerable` flag, and source metadata. Indexing requests are limited to **3/minute**, and question requests to **10/minute** per client IP. Indexing contention can return HTTP **409**.

## Repository layout

```text
biofiles/
├── frontend/
│   └── src/
│       ├── components/explore/
│       │   ├── SpeciesDossier.tsx
│       │   ├── SpeciesAIChat.tsx
│       │   └── SpeciesWindowManager.tsx
│       └── lib/
│           └── species-ai.ts
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── rate_limit.py
│   └── services/
│       ├── inaturalist.py
│       ├── wikipedia.py
│       ├── text_chunker.py
│       ├── embeddings.py
│       ├── species_indexer.py
│       ├── vector_search.py
│       └── rag.py
├── requirements.txt
├── README.md
└── AI_USE.md
```

This is a **representative map of the principal files**, not a claim that every repository file is shown.

## Run locally

### Prerequisites

- Node.js and npm
- Python 3.12
- A Supabase PostgreSQL database with pgvector enabled
- A Google Gemini API key

### Backend

From the repository root:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```dotenv
DATABASE_URL=YOUR_SUPABASE_POSTGRES_CONNECTION_STRING
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_GENERATION_MODEL=gemini-3.5-flash-lite
WIKIPEDIA_CONTACT_EMAIL=you@example.com
```

The database must have the `species` and `species_chunks` tables, and pgvector installed, before indexing can work. **Never commit real credentials.**

Start the API:

```bash
uvicorn backend.main:app --reload --port 8000
```

### Frontend

In another terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start Next.js:

```bash
npm run dev
```

Visit `http://localhost:3000` and search for a location (for example, **Goa**).

## Deployment

| Component | Host | Configuration |
| --- | --- | --- |
| Web app | Vercel | Next.js project rooted at `frontend/` |
| API | Render | Repository root; `pip install -r requirements.txt` |
| API start | Render | `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |
| Database | Supabase | PostgreSQL with pgvector |

**Vercel environment:**

```dotenv
NEXT_PUBLIC_API_URL=https://biofiles-api.onrender.com
```

**Render environment:** `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_GENERATION_MODEL`, `FRONTEND_URL=https://biofiles.vercel.app`, and `WIKIPEDIA_CONTACT_EMAIL`.

FastAPI CORS permits the configured Vercel origin and local development origins. Updating `NEXT_PUBLIC_API_URL` on Vercel requires a new frontend build/deployment because it is a public build-time variable.

## Development and validation

BioFiles was built incrementally, with tests at each checkpoint:

1. Defined the MVP and selected free/low-cost data sources.
2. Initialized the Next.js + FastAPI monorepo.
3. Validated iNaturalist place search and species browsing, including Goa (place ID **10791**).
4. Built the explorer and retro, multi-window dossier UI.
5. Added Wikipedia encyclopedia summaries and structured article extraction.
6. Tested heading-aware chunking: a sample article produced **9 sections and 14 chunks**.
7. Integrated Gemini 768-dimensional embeddings and Supabase pgvector.
8. Validated semantic retrieval; an initial five-question section-match check returned **5/5 top-1 matches** on the tested cases (not a comprehensive benchmark).
9. Added Gemini answer generation with structured citations.
10. Added persistent indexing, freshness checks, concurrency protection, and API rate limits.
11. Verified independent AI chat in multiple species windows locally.
12. Deployed the frontend to Vercel and the API to Render; verified successful production discovery, indexing, vector retrieval, and Gemini answer calls in Render logs.
13. Began investigating a production-only `502` from the encyclopedia summary endpoint; added upstream HTTP error logging and a more descriptive Wikipedia User-Agent. **Final resolution is pending confirmation.**

## Design principles and trade-offs

- **Useful MVP over premature infrastructure:** No user authentication, background job queue, or complex mapping engine.
- **Free public biodiversity data first:** iNaturalist for discovery; Wikipedia for encyclopedia knowledge.
- **Persistence only where it matters:** A database was introduced when repeated RAG embedding and multi-user indexing made in-memory-only storage less suitable.
- **Semantic retrieval with source boundaries:** Species filtering, section metadata, and citations reduce cross-species leakage and unsupported claims.
- **Visible state and failure handling:** AI preparation status, retries, rate limits, and friendly error messages are part of the user experience.
- **Desktop-inspired, mobile-aware UI:** A playful windowing metaphor without requiring a native desktop application.

## Limitations and next steps

- Species coverage and encyclopedia completeness depend on iNaturalist and Wikipedia; some taxa have no suitable article.
- Wikipedia content can change; a cached index may lag until refreshed.
- Generated answers are informational and should be checked against cited sources, especially for scientific or conservation claims.
- Free-tier hosts can introduce cold starts and upstream request failures.
- The observed five-question retrieval check is an early smoke test, not proof of broad answer accuracy.
- **Immediate follow-up:** Confirm the deployed `/api/species/{taxon_id}/info` fix using Render's upstream diagnostic logs and a successful endpoint retest.
- Future improvements could include automated retrieval evaluations, better observability, improved accessibility, and additional biodiversity sources, without expanding the MVP prematurely.

## AI-assisted development

This project was built through a collaborative, checkpoint-driven workflow with AI assistance for architecture discussion, implementation guidance, debugging, and documentation. The developer selected the product direction and made key architectural decisions, implemented and tested the application, and reviewed changes before progressing. See **[AI_USE.md](./AI_USE.md)** for a detailed record of design decisions, AI involvement, and verification.

## Data attribution

Species and observation data come from **iNaturalist**; encyclopedia content is sourced from **Wikipedia**. Source attribution and licensing requirements for any reused text or images should be reviewed before broader distribution. AI answers are generated from retrieved content and include source references where available.
