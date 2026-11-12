from datetime import datetime, timedelta, timezone
import asyncio
from psycopg import sql
import httpx

from backend.database import get_db_connection
from backend.services.wikipedia import (
    fetch_taxon,
    get_structured_wikipedia_article,
)
from backend.services.text_chunker import chunk_wikipedia_article
from backend.services.embeddings import generate_document_embeddings


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

CACHE_DAYS = 30


# --------------------------------------------------
# GET SPECIES INDEX INFORMATION
# --------------------------------------------------

def get_species_index_info(species_id: int):
    """
    Return the species' indexing status and timestamp.

    Returns None if the species does not exist.
    """

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    index_status,
                    indexed_at
                FROM public.species
                WHERE species_id = %s
                """,
                (species_id,),
            )

            row = cursor.fetchone()

    if row is None:
        return None

    return {
        "status": row[0],
        "indexed_at": row[1],
    }


# --------------------------------------------------
# CHECK CACHE FRESHNESS
# --------------------------------------------------

def is_species_cache_fresh(species_id: int) -> bool:
    """
    Return True if the species is ready and its
    embeddings were generated within CACHE_DAYS.
    """

    info = get_species_index_info(species_id)

    if info is None:
        return False

    if info["status"] != "ready":
        return False

    indexed_at = info["indexed_at"]

    if indexed_at is None:
        return False

    now = datetime.now(timezone.utc)

    return indexed_at > now - timedelta(days=CACHE_DAYS)


# --------------------------------------------------
# GET SPECIES METADATA
# --------------------------------------------------

async def get_species_metadata(species_id: int):
    """
    Retrieve accurate common and scientific names
    from iNaturalist.
    """

    async with httpx.AsyncClient(timeout=20.0) as client:
        taxon = await fetch_taxon(client, species_id)

    return {
        "common_name": (
            taxon.get("preferred_common_name")
            or taxon.get("name")
        ),
        "scientific_name": taxon["name"],
    }


# --------------------------------------------------
# INDEX SPECIES
# --------------------------------------------------

async def index_species(species_id: int):
    """
    Index a species' Wikipedia article.

    Reuses cached embeddings when they are fresh.
    Refreshes the index after CACHE_DAYS.
    """

    # ----------------------------------------------
    # STEP 1: CHECK CACHE
    # ----------------------------------------------

    if is_species_cache_fresh(species_id):
        return {
            "species_id": species_id,
            "status": "ready",
            "message": "Species already indexed.",
            "skipped": True,
        }

    print(f"Indexing species {species_id}...")

    # ----------------------------------------------
    # STEP 2: FETCH SPECIES METADATA
    # ----------------------------------------------

    metadata = await get_species_metadata(species_id)

    # ----------------------------------------------
    # STEP 3: FETCH WIKIPEDIA ARTICLE
    # ----------------------------------------------

    article = await get_structured_wikipedia_article(
        species_id
    )

    if not article["available"]:
        raise RuntimeError(
            f"Wikipedia article unavailable for species {species_id}."
        )

    # ----------------------------------------------
    # STEP 4: GENERATE CHUNKS
    # ----------------------------------------------

    chunks = chunk_wikipedia_article(article)

    if not chunks:
        raise RuntimeError(
            f"No chunks generated for species {species_id}."
        )

    print(f"Generated {len(chunks)} chunks.")

    # ----------------------------------------------
    # STEP 5: GENERATE EMBEDDINGS
    # ----------------------------------------------

    embedding_texts = [
        chunk["embedding_text"]
        for chunk in chunks
    ]

    embeddings = generate_document_embeddings(
        embedding_texts
    )

    if len(embeddings) != len(chunks):
        raise RuntimeError(
            "Embedding count does not match chunk count."
        )

    print(f"Generated {len(embeddings)} embeddings.")

    # ----------------------------------------------
    # STEP 6: ATOMIC DATABASE UPDATE
    # ----------------------------------------------

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO public.species (
                    species_id,
                    common_name,
                    scientific_name,
                    index_status
                )
                VALUES (%s, %s, %s, 'indexing')
                ON CONFLICT (species_id)
                DO UPDATE SET
                    common_name = EXCLUDED.common_name,
                    scientific_name = EXCLUDED.scientific_name,
                    index_status = 'indexing'
                """,
                (
                    species_id,
                    metadata["common_name"],
                    metadata["scientific_name"],
                ),
            )

            cursor.execute(
                """
                DELETE FROM public.species_chunks
                WHERE species_id = %s
                """,
                (species_id,),
            )

            for chunk, embedding in zip(
                chunks,
                embeddings,
            ):
                vector = (
                    "["
                    + ",".join(str(value) for value in embedding)
                    + "]"
                )

                cursor.execute(
                    """
                    INSERT INTO public.species_chunks (
                        species_id,
                        chunk_index,
                        content,
                        embedding,
                        source_name,
                        source_url,
                        section_title,
                        section_path
                    )
                    VALUES (
                        %s,
                        %s,
                        %s,
                        %s::extensions.vector,
                        %s,
                        %s,
                        %s,
                        %s
                    )
                    """,
                    (
                        species_id,
                        chunk["chunk_index"],
                        chunk["content"],
                        vector,
                        chunk["source_name"],
                        chunk["source_url"],
                        chunk["section_title"],
                        chunk["section_path"],
                    ),
                )

            cursor.execute(
                """
                UPDATE public.species
                SET
                    index_status = 'ready',
                    indexed_at = %s
                WHERE species_id = %s
                """,
                (
                    datetime.now(timezone.utc),
                    species_id,
                ),
            )

    print(f"Species {species_id} indexing complete!")

    return {
        "species_id": species_id,
        "status": "ready",
        "chunks_stored": len(chunks),
        "skipped": False,
    }
# --------------------------------------------------
# SAFE INDEXING WITH POSTGRESQL ADVISORY LOCK
# --------------------------------------------------

def try_acquire_species_lock(conn, species_id: int) -> bool:
    """
    Acquire a session-level PostgreSQL advisory lock.

    Returns False if another request is already
    indexing the same species.
    """

    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT pg_try_advisory_lock(%s, %s)",
            (4242, species_id),
        )
        return cursor.fetchone()[0]


def release_species_lock(conn, species_id: int):
    """
    Release the advisory lock.
    """

    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT pg_advisory_unlock(%s, %s)",
            (4242, species_id),
        )


async def safely_index_species(species_id: int):
    """
    Prevent concurrent indexing of the same species.
    """

    # Fast path: reuse existing embeddings.
    if is_species_cache_fresh(species_id):
        return {
            "species_id": species_id,
            "status": "ready",
            "skipped": True,
        }

    # Keep this connection open while indexing.
    with get_db_connection() as lock_conn:

        # Important: session-level lock.
        acquired = try_acquire_species_lock(
            lock_conn,
            species_id,
        )

        if not acquired:
            return {
                "species_id": species_id,
                "status": "indexing",
                "message": "Another user is preparing this species.",
            }

        try:
            # Recheck after acquiring lock.
            if is_species_cache_fresh(species_id):
                return {
                    "species_id": species_id,
                    "status": "ready",
                    "skipped": True,
                }

            return await index_species(species_id)

        finally:
            release_species_lock(
                lock_conn,
                species_id,
            )