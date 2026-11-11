import asyncio

import httpx
from fastapi import HTTPException

INATURALIST_BASE_URL = "https://api.inaturalist.org/v1"
REQUEST_TIMEOUT = 15.0

# Broad taxonomic groups recognized by iNaturalist.
# These are candidate groups, not automatically displayed filters.
ICONIC_TAXA = [
    "Animalia",
    "Plantae",
    "Fungi",
    "Aves",
    "Mammalia",
    "Reptilia",
    "Amphibia",
    "Actinopterygii",
    "Insecta",
    "Arachnida",
    "Mollusca",
]


async def search_places(query: str):
    """
    Search for locations using iNaturalist's places autocomplete API.
    """
    url = f"{INATURALIST_BASE_URL}/places/autocomplete"

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.get(url, params={"q": query})
            response.raise_for_status()

        data = response.json()

        return [
            {
                "id": place.get("id"),
                "name": place.get("name"),
                "display_name": place.get("display_name"),
                "place_type": place.get("place_type"),
            }
            for place in data.get("results", [])
        ]

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve locations from iNaturalist.",
        )


async def get_species(
    place_id: int,
    page: int = 1,
    per_page: int = 20,
    iconic_taxon: str | None = None,
):
    """
    Retrieve species observed in a location.

    Optionally filter by an iNaturalist iconic taxon.
    """
    url = f"{INATURALIST_BASE_URL}/observations/species_counts"

    params = {
        "place_id": place_id,
        "page": page,
        "per_page": per_page,
        "quality_grade": "research",
    }

    if iconic_taxon:
        params["iconic_taxa"] = iconic_taxon

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()

        data = response.json()

        species = []

        for item in data.get("results", []):
            taxon = item.get("taxon") or {}
            photo = taxon.get("default_photo") or {}

            species.append(
                {
                    "id": taxon.get("id"),
                    "common_name": taxon.get("preferred_common_name"),
                    "scientific_name": taxon.get("name"),
                    "observation_count": item.get("count", 0),
                    "photo_url": photo.get("medium_url"),
                    "iconic_taxon_name": taxon.get("iconic_taxon_name"),
                    "wikipedia_url": taxon.get("wikipedia_url"),
                }
            )

        return {
            "total_results": data.get("total_results", 0),
            "page": page,
            "per_page": per_page,
            "species": species,
        }

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve species from iNaturalist.",
        )


async def get_categories(place_id: int):
    """
    Discover which broad taxonomic groups have research-grade
    observations in a selected location.
    """
    url = f"{INATURALIST_BASE_URL}/observations/species_counts"

    async def check_category(
        client: httpx.AsyncClient,
        taxon: str,
    ):
        params = {
            "place_id": place_id,
            "iconic_taxa": taxon,
            "quality_grade": "research",
            "per_page": 1,
        }

        response = await client.get(url, params=params)
        response.raise_for_status()

        data = response.json()

        count = data.get("total_results", 0)

        if count > 0:
            return {
                "id": taxon,
                "name": taxon,
                "species_count": count,
            }

        return None

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            results = await asyncio.gather(
                *[
                    check_category(client, taxon)
                    for taxon in ICONIC_TAXA
                ]
            )

        return [
            category
            for category in results
            if category is not None
        ]

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve wildlife categories from iNaturalist.",
        )