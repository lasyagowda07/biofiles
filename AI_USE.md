# AI Use & Architecture Decision Record — BioFiles

## Purpose of this document

BioFiles was developed with AI assistance, but **the project direction, trade-offs, and important architecture choices were discussed and selected by the developer**. This document describes what AI helped with, which design ideas the developer introduced or explicitly chose, how decisions evolved, and how the resulting implementation was validated.

This is a transparent account of the development workflow, **not** a claim that every line was handwritten without AI or that all design proposals originated with the developer. Where an approach was initially suggested by AI and then accepted or refined by the developer, that distinction is recorded.

**Project:** BioFiles — biodiversity exploration and species-specific RAG  
**Live app:** https://biofiles.vercel.app  
**Backend:** https://biofiles-api.onrender.com  
**Development period:** November 2026

## 1. Development workflow and ownership

The developer used AI as a **senior engineering mentor, architecture discussion partner, coding assistant, and debugger**, not as an unattended system that independently shipped a product.

The agreed workflow was:

1. **Discuss the product first.** Establish the end-user problem, scope, available data, and technical constraints before writing code.
2. **Compare architectural options.** Ask why a component is necessary, what simpler alternative exists, and how it affects the MVP.
3. **Make an explicit decision.** The developer chooses the direction, including accepting, rejecting, or modifying AI proposals.
4. **Implement one checkpoint at a time.** Work on a small, testable feature instead of generating the entire project in one pass.
5. **Understand and verify.** Run commands, inspect API responses, test the UI, and report errors before proceeding.
6. **Debug with evidence.** Use tracebacks, HTTP statuses, browser behavior, and deployment logs to isolate problems.
7. **Deploy and document.** Publish the frontend/backend, configure environments, and record limitations transparently.

AI supplied explanations, code drafts, copy-paste file revisions, test suggestions, and debugging hypotheses. The developer ran the application, tested behavior, chose architectural constraints, and initiated deployments.

## 2. Product decisions made by the developer

### 2.1 Chose the project and its identity

The project began as a biodiversity RAG concept discussed under the working name **BioQuest**. The developer selected it as the second project after DataTale and renamed it **BioFiles**.

**Developer direction:** Build something fun, creative, and achievable, combining software engineering, APIs, data, and AI without requiring an overly complicated infrastructure stack.

**Result:** A location-based biodiversity explorer with species dossiers and source-grounded AI answers.

### 2.2 Prioritized a small, deployable MVP

The developer emphasized a weekend-sized implementation, free APIs, and avoiding infrastructure that did not immediately improve the user experience.

**Chosen scope:** Location search, species gallery, species profiles, Wikipedia knowledge, and per-species AI questions.

**Deferred:** Authentication, complex maps, additional biodiversity databases, background workers, and unrelated features.

### 2.3 Directed the visual experience

Early visual discussion explored a warm nature-journal / field-guide style. The product evolved into a distinctive **retro desktop / “GO WILD.” interface**.

The developer chose or approved:

- A playful desktop metaphor instead of a conventional single-page encyclopedia.
- Draggable, resizable, minimizable, restorable, and closable dossier windows.
- Multiple species dossiers open at once, with a cap of **five** to control complexity.
- Independent chat experiences in each species window.
- Responsive behavior rather than limiting the experience to desktop screens.

AI assisted with component structure and implementation, but the interaction model was a product-design choice reviewed throughout development.

## 3. Architecture decisions: proposal, choice, and rationale

The following record distinguishes **developer-suggested/refined requirements** from **AI-proposed options accepted by the developer**. It does not retroactively attribute all implementation details to the developer.

| Decision | Developer's role | Selected design | Reason / trade-off |
| --- | --- | --- | --- |
| Full-stack split | Specified the preferred stack and workflow | Next.js/TypeScript frontend + FastAPI/Python backend | Clear UI/API separation; familiar technologies |
| Public data sources | Required free APIs and reviewed options | iNaturalist + Wikipedia | Real biodiversity data without building a proprietary dataset |
| Product scope | Explicitly prioritized simplicity | No auth, complex maps, or unrelated infrastructure | Finish, test, and deploy a useful MVP |
| User interface | Chose/refined the retro desktop direction | Independent draggable species windows | Distinctive, exploratory field-guide experience |
| RAG scope | Explicitly chose species-specific, stateless requests | Each question carries `species_id`; retrieval filters by species | Prevent mixing evidence between species |
| Chat persistence | Chose independent window histories without backend chat storage | Local React state per dossier | Simpler API and fewer privacy/storage concerns |
| Initial retrieval | Accepted a lightweight proposed approach | In-memory/NumPy retrieval in early planning | Avoid unnecessary database setup at the start |
| Persistent vectors | Later explicitly chose the database-backed architecture | Supabase PostgreSQL + pgvector | Reuse embeddings, support deployed multi-user access |
| Embedding representation | Accepted and tested a proposed configuration | Gemini embeddings at **768 dimensions** | Compatible with pgvector and practical storage/search costs |
| Chunking | Reviewed/accepted section-aware strategy and tested results | Paragraph chunks (~200–300 words), sentence overlap, section metadata | Preserve context and citations |
| Retrieval | Accepted and validated top-k semantic search | Species-filtered exact vector search, top **5** | Simple and auditable MVP; no FAISS service needed |
| Indexing trigger | **Explicit developer decision** | Index only when user activates “Ask BioFiles AI” | Avoid embedding species no one asks about |
| Index persistence | **Explicit developer decision** | Persist indexes; refresh after ~30 days | Reduce repeated API usage and cost |
| Duplicate indexing UX | **Explicit developer decision** | Block a second indexing attempt and show a popup | Simpler than a queue or background worker |
| Cross-user concurrency | **Explicit developer requirement** | PostgreSQL advisory lock per species | Avoid duplicate writes/work across simultaneous users |
| Generation | Selected/tested a workable Gemini model | Gemini Flash Lite with retrieved evidence | Grounded answers with practical API availability |
| Citation design | Accepted/tested source-linked answers | Return answerability and section/source URLs | Make generated claims inspectable |
| Deployment | Chose and configured hosted services | Vercel + Render + Supabase | Accessible live demo using manageable services |
| Production troubleshooting | Requested evidence-based debugging | Render logs and upstream HTTP diagnostics | Diagnose actual failures instead of guessing |

### Important evolution: from no database to pgvector

The original MVP plan intentionally avoided a database. AI proposed a simple in-memory embedding/retrieval approach (NumPy, with FAISS as a possible later optimization). The developer initially accepted that minimal approach **for planning**, then reconsidered the needs of a public, multi-user app.

The developer subsequently **chose Supabase PostgreSQL with pgvector**, because species embeddings should be reusable across sessions and users. This was a deliberate architecture change, not an accidental increase in scope.

The chosen model is:

```text
On-demand species index
  → Persistent 768-dimensional embeddings
  → 30-day freshness window
  → Species-filtered vector search
  → Grounded Gemini answer
```

This avoided the repeated cost of embedding the same Wikipedia article for every question, without introducing a separate vector database product.

### Important evolution: concurrency without a queue

The developer specifically raised the problem of **two users attempting to index the same species simultaneously**.

Rather than introducing Celery, Redis queues, or a background worker, the developer preferred the simplest understandable behavior:

- If an index is already fresh, reuse it.
- If indexing is underway, do not start another indexing job; display an explanatory message.
- Protect the database operation across concurrent requests with a **PostgreSQL advisory lock**.

This is one of the clearest developer-originated architecture requirements in the project. It addressed a real race condition while preserving the MVP's operational simplicity.

### Important evolution: stateless, species-specific chat

The developer explicitly selected a model where **each species window is independent**:

- A window passes its species ID and the current question to the backend.
- Retrieval is constrained to that species in the database query.
- The browser maintains the visible history of that window.
- The backend does not require full conversation-history persistence.

This intentionally separates the **UI's conversation experience** from the **RAG service's request contract**. It also avoids accidentally answering a question about one species using context from another.

## 4. RAG implementation and AI's role

### Step A — Source discovery

**Implementation:** iNaturalist resolves place searches, species listings, and taxon metadata. A taxon's Wikipedia URL determines the article used for its dossier and RAG knowledge base.

**AI assistance:** Proposed API integrations, request/response handling, typed FastAPI routes, and error handling.

**Developer verification:** Tested place and species endpoints using Goa (iNaturalist place ID `10791`) and checked returned species data.

### Step B — Structured Wikipedia extraction

**Implementation:** Resolve redirects, fetch Wikipedia article HTML, parse headings and text, exclude navigation/reference elements, and preserve hierarchical section paths.

**AI assistance:** Helped design parsing and extraction code in `backend/services/wikipedia.py`.

**Developer verification:** Inspected extracted sections and their content rather than assuming an HTML fetch was sufficient.

### Step C — Section-aware chunking

**Implementation:** Split paragraphs into roughly 200–300-word chunks with one-sentence overlap; store section title/path and source URL with each chunk.

**AI assistance:** Suggested chunking heuristics and implementation.

**Developer verification:** A test article produced **9 sections and 14 chunks**, which were reviewed as a checkpoint.

**Why it matters:** Section labels help explain *where* a retrieved fact came from and reduce the chance that unrelated article sections are blended together.

### Step D — Embedding and storage

**Implementation:** Use Google's `gemini-embedding-001` at **768 dimensions**, with document/query task distinctions. Store embeddings in Supabase PostgreSQL using pgvector.

**AI assistance:** Supplied SDK integration guidance, schema design, vector insertion/search code, and debugging support.

**Developer decisions:** Chose persistence over the initial no-database plan and approved the dimensionality/search configuration.

### Step E — Retrieval evaluation

**Implementation:** Embed the question, filter by `species_id`, and retrieve the top five similar chunks.

**Developer verification:** A five-question test achieved **5/5 expected top-1 section matches** on the selected examples.

**Interpretation:** This is a useful early retrieval smoke test, **not** a statistically meaningful accuracy claim or full evaluation of answer correctness.

### Step F — Grounded answer generation

**Implementation:** Pass retrieved chunks to Gemini and request a structured answer with an answerability flag and citations.

**AI assistance:** Helped with generation prompts, response schema, source mapping, and API error handling.

**Developer verification:** Tested responses for different species and checked that source references appeared in the UI.

**Model-selection troubleshooting:** Some candidate Gemini models returned unavailable-model or transient service errors during development; the working configuration used `gemini-3.5-flash-lite`.

## 5. Database and indexing safeguards

The developer chose to introduce a persistent index only when its benefits were clear.

**Tables:**

- `species`: species identity, name fields, indexing state, timestamps.
- `species_chunks`: text, source and section metadata, 768-dimensional embedding, species foreign key.

**Index lifecycle:**

```text
User requests AI for species
    │
    ▼
Check index freshness
    ├── Ready and fresh ───────────────→ Reuse stored chunks
    └── Missing/stale
            │
            ▼
     Acquire species advisory lock
            ├── Already locked ──────→ Return indexing state / UI popup
            └── Acquired
                    │
                    ▼
             Fetch + parse + chunk
                    │
                    ▼
             Embed + persist
                    │
                    ▼
             Mark species ready
```

The developer also opted for endpoint rate limits (**3 indexing requests/minute** and **10 question requests/minute** per client IP) rather than leaving the AI endpoints unbounded.

## 6. Frontend interaction architecture

The windowed UI is not merely decorative: it affects state management.

**Key separation:**

- `SpeciesWindowManager.tsx` coordinates open windows, active state, the five-window limit, and AI preparation feedback.
- `SpeciesDossier.tsx` displays species information and requests the encyclopedia summary.
- `SpeciesAIChat.tsx` owns the chat interaction for its particular species window.
- `species-ai.ts` centralizes requests to indexing and question endpoints.

**Developer-selected behavior:** Multiple species files may remain open; each has its own conversation and AI readiness. A shared backend still enforces species-specific retrieval.

**AI assistance:** Component implementation, fetch state handling, loading/error behavior, and UI debugging.

## 7. Deployment and production debugging

**Deployed services:**

- **Vercel:** https://biofiles.vercel.app — Next.js frontend, root directory `frontend/`.
- **Render:** https://biofiles-api.onrender.com — FastAPI backend, root `requirements.txt`.
- **Supabase:** PostgreSQL and pgvector storage.

**Important configuration:**

```text
Vercel:
  NEXT_PUBLIC_API_URL=https://biofiles-api.onrender.com

Render:
  DATABASE_URL=<private connection string>
  GEMINI_API_KEY=<private key>
  GEMINI_GENERATION_MODEL=gemini-3.5-flash-lite
  FRONTEND_URL=https://biofiles.vercel.app
  WIKIPEDIA_CONTACT_EMAIL=<contact email>
```

**Observed deployment checks:** Render logs showed HTTP 200 for place search, species listing, categories, species indexing, and AI questions; vector search retrieved five chunks and Gemini returned answers.

**Known unresolved issue at documentation time:** `GET /api/species/{taxon_id}/info` returned HTTP 502 in production for multiple taxa, even while the AI routes worked. The original code masked upstream HTTP status details. AI suggested more descriptive User-Agent identification and structured error logging; the developer applied the update and deployed it. A successful endpoint retest **has not yet been established in the available conversation**. This document does not claim the problem is fixed.

**Engineering lesson:** A passing root health check does not prove every integration works. Logs must distinguish upstream Wikipedia/iNaturalist failures from frontend, CORS, database, and model issues.

## 8. What AI generated or assisted with

AI was used for:

- Comparing project ideas and proposing an initial MVP architecture.
- Explaining API options, RAG fundamentals, embedding dimensions, vector retrieval, and concurrency patterns.
- Drafting Next.js/React/TypeScript components and FastAPI services.
- Suggesting PostgreSQL schema and pgvector queries.
- Implementing Wikipedia extraction, chunking, indexing, and RAG generation helpers.
- Writing/debugging integration code and explaining error messages.
- Proposing validation steps and interpreting test output.
- Assisting with deployment setup, environment configuration, and production debugging.
- Drafting this README and AI-use record from the development discussion.

**The developer remained responsible for** choosing the project, setting scope, accepting/rejecting architecture proposals, specifying UI behavior, running and inspecting tests, configuring services, and publishing the application.

## 9. Decisions deliberately *not* made

The MVP avoided:

- A standalone vector database when Supabase pgvector was sufficient.
- FAISS or an approximate-nearest-neighbor index before scale justified it.
- A background worker and message queue for indexing.
- User accounts and server-side conversation storage.
- Pre-indexing every species in the biodiversity catalog.
- A complex geospatial map stack.
- A separate LLM evaluation framework before basic retrieval tests worked.

These were **scope-management choices**, not missing technologies added by oversight.

## 10. Testing, evidence, and limitations

**Checks completed during development:**

- Local API requests for places and species.
- Wikipedia section extraction and chunk counts.
- 768-dimensional embeddings and database persistence.
- Five-question top-1 section retrieval check.
- Successful species-specific RAG answers with citations.
- Independent AI chat behavior in multiple windows.
- Frontend build/type checking during implementation.
- Live Render logs for search, indexing, retrieval, and Gemini responses.

**Limits of the evidence:**

- A 5/5 result on a tiny curated test is not a general accuracy benchmark.
- Wikipedia is not an exhaustive scientific reference and may omit species details.
- Model answers can still be incorrect or overconfident; citations need verification.
- External API failures and hosting cold starts remain possible.
- Production encyclopedia retrieval was still being debugged when this record was prepared.

## 11. What this project demonstrates

BioFiles demonstrates the ability to:

- Translate a creative product idea into a scoped, deployable full-stack MVP.
- Integrate multiple public APIs and handle incomplete external data.
- Build a usable, distinctive multi-window React interface.
- Design a species-isolated, source-grounded RAG workflow.
- Make deliberate trade-offs between in-memory and persistent retrieval.
- Use PostgreSQL advisory locks to address a real multi-user race condition.
- Persist and reuse embeddings while controlling indexing costs.
- Test retrieval quality and debug deployed services using evidence.
- Collaborate with AI while retaining responsibility for technical decisions and validation.

## 12. Disclosure

**AI assistance was substantial and openly acknowledged.** Code and architecture suggestions were generated collaboratively, then selected, adapted, and tested by the developer. The decisions documented as *explicit developer choices* are based on the recorded project discussion; other designs are described as AI proposals accepted or refined during development.

The goal of this record is accurate attribution and reproducible engineering reasoning—not overstating originality or claiming that the system was built without AI.
