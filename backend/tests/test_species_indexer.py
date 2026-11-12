import asyncio

from database import get_db_connection
from services.species_indexer import index_species


SPECIES_ID = 5268


async def main():

    print("\n🌿 BIOFILES SPECIES INDEXING TEST\n")

    result = await index_species(SPECIES_ID)

    print("\nINDEXING RESULT")
    print(result)

    print("\nVERIFYING DATABASE...\n")

    with get_db_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    species_id,
                    common_name,
                    scientific_name,
                    index_status,
                    indexed_at
                FROM public.species
                WHERE species_id = %s
                """,
                (SPECIES_ID,),
            )

            species = cursor.fetchone()

            print("Species record:")
            print(species)

            cursor.execute(
                """
                SELECT
                    COUNT(*),
                    MIN(extensions.vector_dims(embedding)),
                    MAX(extensions.vector_dims(embedding))
                FROM public.species_chunks
                WHERE species_id = %s
                """,
                (SPECIES_ID,),
            )

            chunk_stats = cursor.fetchone()

            print("\nChunk statistics:")
            print(f"Total chunks: {chunk_stats[0]}")
            print(f"Minimum dimensions: {chunk_stats[1]}")
            print(f"Maximum dimensions: {chunk_stats[2]}")

            cursor.execute(
                """
                SELECT
                    chunk_index,
                    section_path,
                    LENGTH(content)
                FROM public.species_chunks
                WHERE species_id = %s
                ORDER BY chunk_index
                """,
                (SPECIES_ID,),
            )

            print("\nStored chunks:")

            for row in cursor.fetchall():
                print(row)

    assert species is not None
    assert species[3] == "ready"
    assert chunk_stats[0] > 0
    assert chunk_stats[1] == 768
    assert chunk_stats[2] == 768

    print("\n✅ END-TO-END INDEXING TEST PASSED!")


if __name__ == "__main__":
    asyncio.run(main())