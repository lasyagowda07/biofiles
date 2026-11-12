from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.services.species_indexer import safely_index_species
from backend.services.inaturalist import (
    get_categories,
    get_species,
    search_places,
)
from backend.services.wikipedia import get_species_info
from backend.services.rag import generate_rag_answer


# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="BioFiles API",
    description="Biodiversity exploration and RAG-powered species information",
    version="0.6.0",
)


# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class SpeciesQuestionRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Question about the selected species",
    )


# --------------------------------------------------
# ROOT AND HEALTH
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Welcome to BioFiles API!",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
    }


# --------------------------------------------------
# LOCATION SEARCH
# --------------------------------------------------

@app.get("/api/places/search")
async def search_locations(
    q: str = Query(
        ...,
        min_length=2,
        max_length=100,
        description="Location name to search for",
    ),
):
    """
    Search for geographic locations.
    """

    places = await search_places(q)

    return {
        "query": q,
        "results": places,
    }


# --------------------------------------------------
# SPECIES CATEGORIES
# --------------------------------------------------

@app.get("/api/species/categories")
async def list_species_categories(
    place_id: int = Query(
        ...,
        gt=0,
        description="iNaturalist place ID",
    ),
):
    """
    Discover wildlife categories represented in a location.
    """

    categories = await get_categories(place_id)

    return {
        "place_id": place_id,
        "categories": categories,
    }


# --------------------------------------------------
# SPECIES LIST
# --------------------------------------------------

@app.get("/api/species")
async def list_species(
    place_id: int = Query(
        ...,
        gt=0,
        description="iNaturalist place ID",
    ),
    page: int = Query(
        1,
        ge=1,
        description="Page number",
    ),
    per_page: int = Query(
        20,
        ge=1,
        le=50,
        description="Number of species per page",
    ),
    iconic_taxon: str | None = Query(
        None,
        description="Optional iNaturalist iconic taxon filter",
    ),
):
    """
    Retrieve species observed in a particular location.
    """

    return await get_species(
        place_id=place_id,
        page=page,
        per_page=per_page,
        iconic_taxon=iconic_taxon,
    )


# --------------------------------------------------
# SPECIES INFORMATION
# --------------------------------------------------

@app.get("/api/species/{taxon_id}/info")
async def species_information(taxon_id: int):
    """
    Retrieve Wikipedia information for a species.
    """

    if taxon_id <= 0:
        raise HTTPException(
            status_code=422,
            detail="Taxon ID must be positive.",
        )

    return await get_species_info(taxon_id)


# --------------------------------------------------
# ASK BIOFILES AI
# --------------------------------------------------

@app.post("/api/species/{taxon_id}/ask")
def ask_species_question(
    taxon_id: int,
    request: SpeciesQuestionRequest,
):
    """
    Answer a species-specific question using RAG.

    This route is synchronous because the RAG
    implementation uses blocking database and
    Gemini SDK operations.

    FastAPI runs synchronous routes in a thread pool.
    """

    if taxon_id <= 0:
        raise HTTPException(
            status_code=422,
            detail="Taxon ID must be positive.",
        )

    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=422,
            detail="Question cannot be empty.",
        )

    return generate_rag_answer(
        species_id=taxon_id,
        question=question,
        top_k=5,
    )


# --------------------------------------------------
# INDEX SPECIES FOR AI CHAT
# --------------------------------------------------

@app.post("/api/species/{taxon_id}/index")
async def index_species_for_ai(taxon_id: int):
    """
    Prepare Wikipedia knowledge and embeddings
    for a species.

    Returns immediately if the cache is fresh.

    Uses PostgreSQL advisory locking to prevent
    duplicate indexing across users.
    """

    if taxon_id <= 0:
        raise HTTPException(
            status_code=422,
            detail="Taxon ID must be positive.",
        )

    try:
        result = await safely_index_species(taxon_id)

        if result["status"] == "indexing":
            return JSONResponse(
                status_code=409,
                content=result,
            )

        return result

    except Exception as exc:
        print(
            f"Indexing failed for species {taxon_id}: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to prepare species knowledge.",
        )