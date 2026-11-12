from backend.database import get_db_connection
from backend.services.embeddings import generate_query_embedding


DEFAULT_TOP_K = 5


def search_species_chunks(
    species_id: int,
    query: str,
    top_k: int = DEFAULT_TOP_K,
) -> list[dict]:
    """
    Search Wikipedia chunks for a specific species
    using cosine similarity.

    Returns the top_k most semantically relevant chunks.
    """

    if not query.strip():
        raise ValueError("Search query cannot be empty.")

    if top_k < 1 or top_k > 20:
        raise ValueError("top_k must be between 1 and 20.")

    # ----------------------------------------------
    # STEP 1: GENERATE QUERY EMBEDDING
    # ----------------------------------------------

    query_embedding = generate_query_embedding(query)

    query_vector = (
        "["
        + ",".join(str(value) for value in query_embedding)
        + "]"
    )

    # ----------------------------------------------
    # STEP 2: SEARCH SUPABASE
    # ----------------------------------------------

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    chunk_index,
                    content,
                    section_title,
                    section_path,
                    source_name,
                    source_url,
                    1 - (
                        embedding <=> %s::extensions.vector
                    ) AS similarity
                FROM public.species_chunks
                WHERE species_id = %s
                ORDER BY
                    embedding <=> %s::extensions.vector
                LIMIT %s
                """,
                (
                    query_vector,
                    species_id,
                    query_vector,
                    top_k,
                ),
            )

            rows = cursor.fetchall()

    # ----------------------------------------------
    # STEP 3: FORMAT RESULTS
    # ----------------------------------------------

    results = []

    for row in rows:
        results.append(
            {
                "chunk_index": row[0],
                "content": row[1],
                "section_title": row[2],
                "section_path": row[3],
                "source_name": row[4],
                "source_url": row[5],
                "similarity": float(row[6]),
            }
        )

    return results