from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.services.inaturalist import (
    get_species,
    search_places,
)

app = FastAPI(
    title="BioFiles API",
    description="Biodiversity exploration and RAG-powered species information",
    version="0.2.0",
)

# Allow our local Next.js frontend to communicate with FastAPI.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


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
):
    """
    Retrieve species observed in a particular location.
    """

    return await get_species(
        place_id=place_id,
        page=page,
        per_page=per_page,
    )